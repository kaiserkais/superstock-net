use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::Row;
use std::sync::Arc;

// ─── SERIALIZATION STRUCTS FOR JSON OUTPUTS ──────────────────────────────────

#[derive(serde::Serialize)]
pub struct SaleItemOut {
    pub id:           String,
    pub sale_id:      String,
    pub product_id:   String,
    pub variant_id:   Option<String>,
    pub product_name: String,
    pub unit:         String,
    pub qty:          f64,
    pub unit_cost:    f64,
    pub unit_price:   f64,
    pub line_total:   f64,
    pub is_weighted:  bool,
}

#[derive(serde::Serialize)]
pub struct SaleOut {
    pub id:          String,
    pub user_id:     String,
    pub session_id:  i64,
    pub customer_id: Option<String>,
    pub subtotal:    f64,
    pub adj_type:    String,
    pub adj_value:   f64,
    pub total:       f64,
    pub status:      String,
    pub created_at:  String,
    pub items:       Vec<SaleItemOut>,
}

// ─── DESERIALIZATION STRUCTS FOR FRONTEND PAYLOADS ───────────────────────────

#[derive(serde::Deserialize)]
pub struct SaleItemInput {
    pub product_id:   String,
    pub variant_id:   Option<String>,
    pub product_name: String,
    pub unit:         String,
    pub qty:          f64,
    pub unit_cost:    f64,
    pub unit_price:   f64,
    pub line_total:   f64,
    pub is_weighted:  bool,
}

#[derive(serde::Deserialize)]
pub struct CreateSaleInput {
    pub user_id:     String,         // Authenticated cashier ID
    pub session_id:  Option<i64>,    // Defaults to 1 if not provided
    pub customer_id: Option<String>, // NULL = anonymous walk-in
    pub subtotal:    f64,
    pub adj_type:    Option<String>, // "discount" | "surcharge" | "none"
    pub adj_value:   Option<f64>,
    pub total:       f64,
    pub items:       Vec<SaleItemInput>,
}

#[derive(serde::Deserialize)]
pub struct SaleListQuery {
    pub session_id:  Option<i64>,
    pub user_id:     Option<String>,
    pub customer_id: Option<String>,
    pub status:      Option<String>,
    pub limit:       Option<i64>,
    pub offset:      Option<i64>,
}

// ─── ROUTE HANDLERS ───────────────────────────────────────────────────────────

/// POST /api/sales — Commit a completed cart to the database as a finalized sale
pub async fn create_sale(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateSaleInput>,
) -> impl IntoResponse {

    // ── Validate payload ──────────────────────────────────────────────────────
    if payload.items.is_empty() {
        return (StatusCode::BAD_REQUEST, "Sale must contain at least one item").into_response();
    }

    if payload.user_id.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, "user_id is required").into_response();
    }

    // Normalise optional fields
    let session_id = payload.session_id.unwrap_or(1);
    let adj_type   = payload.adj_type.clone().unwrap_or_else(|| "none".to_string());
    let adj_value  = payload.adj_value.unwrap_or(0.0);

    if !["discount", "surcharge", "none"].contains(&adj_type.as_str()) {
        return (StatusCode::BAD_REQUEST, "adj_type must be 'discount', 'surcharge', or 'none'")
            .into_response();
    }

    // ── Generate IDs ──────────────────────────────────────────────────────────
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros();

    let sale_id = format!("sale_{}", ts);

    // ── Open transaction ──────────────────────────────────────────────────────
    let mut tx = match state.db.begin().await {
        Ok(t)  => t,
        Err(e) => {
            println!("❌ Failed to open sale transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Transaction open failure").into_response();
        }
    };

    // ── Insert sale header ────────────────────────────────────────────────────
    let header_result = sqlx::query(
        "INSERT INTO sales
             (id, user_id, session_id, customer_id,
              subtotal, adj_type, adj_value, total, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')"
    )
    .bind(&sale_id)
    .bind(&payload.user_id)
    .bind(session_id)
    .bind(&payload.customer_id)
    .bind(payload.subtotal)
    .bind(&adj_type)
    .bind(adj_value)
    .bind(payload.total)
    .execute(&mut *tx)
    .await;

    if let Err(e) = header_result {
        println!("❌ Sale header insert failed: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to record sale header").into_response();
    }

    // ── Insert line items ─────────────────────────────────────────────────────
    for (idx, item) in payload.items.iter().enumerate() {
        let item_id = format!("si_{}_{}", ts, idx);

        let item_result = sqlx::query(
            "INSERT INTO sale_items
                 (id, sale_id, product_id, variant_id,
                  product_name, unit, qty,
                  unit_cost, unit_price, line_total, is_weighted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&item_id)
        .bind(&sale_id)
        .bind(&item.product_id)
        .bind(&item.variant_id)
        .bind(&item.product_name)
        .bind(&item.unit)
        .bind(item.qty)
        .bind(item.unit_cost)
        .bind(item.unit_price)
        .bind(item.line_total)
        .bind(item.is_weighted as i32)
        .execute(&mut *tx)
        .await;

        if let Err(e) = item_result {
            println!("❌ Sale item insert failed at index {}: {}", idx, e);
            return (StatusCode::BAD_REQUEST, "Line item insert rejected — check product/variant IDs")
                .into_response();
        }

        // ── Deduct stock ──────────────────────────────────────────────────────
        // Variant stock: deduct from product_variants
        if let Some(ref vid) = item.variant_id {
            let deduct_result = sqlx::query(
                "UPDATE product_variants
                 SET quantity = MAX(0, quantity - ?)
                 WHERE id = ?"
            )
            .bind(item.qty)
            .bind(vid)
            .execute(&mut *tx)
            .await;

            if let Err(e) = deduct_result {
                println!("⚠️ Variant stock deduction failed for {}: {}", vid, e);
                // Non-fatal: log but don't abort the sale
            }
        } else {
            // Simple product: deduct from products table directly
            let deduct_result = sqlx::query(
                "UPDATE products
                 SET quantity = MAX(0, CAST(quantity AS REAL) - ?)
                 WHERE id = ?"
            )
            .bind(item.qty)
            .bind(&item.product_id)
            .execute(&mut *tx)
            .await;

            if let Err(e) = deduct_result {
                println!("⚠️ Product stock deduction failed for {}: {}", item.product_id, e);
            }
        }
    }

    // ── Commit ────────────────────────────────────────────────────────────────
    if let Err(e) = tx.commit().await {
        println!("❌ Sale transaction commit failed: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Storage write checkpoint dropped").into_response();
    }

    println!("✅ Sale '{}' committed — {} item(s), total: {} DA", sale_id, payload.items.len(), payload.total);

    (
        StatusCode::CREATED,
        Json(serde_json::json!({ "id": sale_id, "status": "completed" })),
    )
        .into_response()
}

/// GET /api/sales — List sales with optional filters (session, user, customer, status)
pub async fn get_sales(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SaleListQuery>,
) -> impl IntoResponse {

    let limit  = params.limit.unwrap_or(50).min(200);
    let offset = params.offset.unwrap_or(0);

    // ── Build dynamic WHERE clause ────────────────────────────────────────────
    let mut conditions: Vec<&str> = Vec::new();
    if params.session_id.is_some()  { conditions.push("session_id = ?");  }
    if params.user_id.is_some()     { conditions.push("user_id = ?");     }
    if params.customer_id.is_some() { conditions.push("customer_id = ?"); }
    if params.status.is_some()      { conditions.push("status = ?");      }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sales_query = format!(
        "SELECT id, user_id, session_id, customer_id,
                subtotal, adj_type, adj_value, total, status,
                created_at
         FROM sales
         {} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        where_clause
    );

    // ── Build query with dynamic bindings ─────────────────────────────────────
    let mut q = sqlx::query(&sales_query);
    if let Some(v) = params.session_id  { q = q.bind(v); }
    if let Some(v) = &params.user_id    { q = q.bind(v); }
    if let Some(v) = &params.customer_id{ q = q.bind(v); }
    if let Some(v) = &params.status     { q = q.bind(v); }
    q = q.bind(limit).bind(offset);

    let sale_rows = match q.fetch_all(&state.db).await {
        Ok(rows) => rows,
        Err(e) => {
            println!("❌ Failed to fetch sales list: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load sales").into_response();
        }
    };

    // ── Fetch all items for retrieved sales in one query ──────────────────────
    if sale_rows.is_empty() {
        return (StatusCode::OK, Json(Vec::<SaleOut>::new())).into_response();
    }

    let sale_ids: Vec<String> = sale_rows.iter().map(|r| r.get::<String, _>("id")).collect();

    // Build IN (?,...) clause
    let placeholders = sale_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let items_query  = format!(
        "SELECT id, sale_id, product_id, variant_id,
                product_name, unit, qty,
                unit_cost, unit_price, line_total, is_weighted
         FROM sale_items
         WHERE sale_id IN ({})
         ORDER BY sale_id, rowid",
        placeholders
    );

    let mut items_q = sqlx::query(&items_query);
    for sid in &sale_ids { items_q = items_q.bind(sid); }

    let item_rows = match items_q.fetch_all(&state.db).await {
        Ok(rows) => rows,
        Err(e) => {
            println!("❌ Failed to fetch sale items: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load sale items").into_response();
        }
    };

    // ── Assemble response ─────────────────────────────────────────────────────
    let mut sales: Vec<SaleOut> = Vec::new();

    for s_row in &sale_rows {
        let s_id: String = s_row.get("id");

        let items: Vec<SaleItemOut> = item_rows
            .iter()
            .filter(|r| r.get::<String, _>("sale_id") == s_id)
            .map(|r| SaleItemOut {
                id:           r.get("id"),
                sale_id:      r.get("sale_id"),
                product_id:   r.get("product_id"),
                variant_id:   r.get("variant_id"),
                product_name: r.get("product_name"),
                unit:         r.get("unit"),
                qty:          r.get("qty"),
                unit_cost:    r.get("unit_cost"),
                unit_price:   r.get("unit_price"),
                line_total:   r.get("line_total"),
                is_weighted:  r.get::<i32, _>("is_weighted") != 0,
            })
            .collect();

        sales.push(SaleOut {
            id:          s_id,
            user_id:     s_row.get("user_id"),
            session_id:  s_row.get("session_id"),
            customer_id: s_row.get("customer_id"),
            subtotal:    s_row.get("subtotal"),
            adj_type:    s_row.get("adj_type"),
            adj_value:   s_row.get("adj_value"),
            total:       s_row.get("total"),
            status:      s_row.get("status"),
            created_at:  s_row.get("created_at"),
            items,
        });
    }

    (StatusCode::OK, Json(sales)).into_response()
}

/// GET /api/sales/:id — Fetch a single sale with its full line items
pub async fn get_sale(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {

    let sale_row = match sqlx::query(
        "SELECT id, user_id, session_id, customer_id,
                subtotal, adj_type, adj_value, total, status, created_at
         FROM sales WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, "Sale not found").into_response(),
        Err(e) => {
            println!("❌ Failed to fetch sale {}: {}", id, e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Database read failure").into_response();
        }
    };

    let item_rows = match sqlx::query(
        "SELECT id, sale_id, product_id, variant_id,
                product_name, unit, qty,
                unit_cost, unit_price, line_total, is_weighted
         FROM sale_items WHERE sale_id = ? ORDER BY rowid"
    )
    .bind(&id)
    .fetch_all(&state.db)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            println!("❌ Failed to fetch items for sale {}: {}", id, e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load sale items").into_response();
        }
    };

    let items: Vec<SaleItemOut> = item_rows
        .iter()
        .map(|r| SaleItemOut {
            id:           r.get("id"),
            sale_id:      r.get("sale_id"),
            product_id:   r.get("product_id"),
            variant_id:   r.get("variant_id"),
            product_name: r.get("product_name"),
            unit:         r.get("unit"),
            qty:          r.get("qty"),
            unit_cost:    r.get("unit_cost"),
            unit_price:   r.get("unit_price"),
            line_total:   r.get("line_total"),
            is_weighted:  r.get::<i32, _>("is_weighted") != 0,
        })
        .collect();

    let sale = SaleOut {
        id:          sale_row.get("id"),
        user_id:     sale_row.get("user_id"),
        session_id:  sale_row.get("session_id"),
        customer_id: sale_row.get("customer_id"),
        subtotal:    sale_row.get("subtotal"),
        adj_type:    sale_row.get("adj_type"),
        adj_value:   sale_row.get("adj_value"),
        total:       sale_row.get("total"),
        status:      sale_row.get("status"),
        created_at:  sale_row.get("created_at"),
        items,
    };

    (StatusCode::OK, Json(sale)).into_response()
}

/// PATCH /api/sales/:id/void — Mark a sale as voided (non-destructive) and restore inventory stock
pub async fn void_sale(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {

    // ── Open a database transaction ───────────────────────────────────────────
    let mut tx = match state.db.begin().await {
        Ok(t) => t,
        Err(e) => {
            println!("❌ Failed to open void transaction for sale {}: {}", id, e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Transaction open failure").into_response();
        }
    };

    // Confirm sale exists and check its status within the transaction context
    let current_status: Option<String> = match sqlx::query_scalar(
        "SELECT status FROM sales WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            println!("❌ Status check failed for sale {}: {}", id, e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Database read failure").into_response();
        }
    };

    match current_status.as_deref() {
        None            => return (StatusCode::NOT_FOUND,  "Sale not found").into_response(),
        Some("voided")  => return (StatusCode::CONFLICT,   "Sale is already voided").into_response(),
        Some("returned")=> return (StatusCode::CONFLICT,   "Returned sales cannot be voided").into_response(),
        _               => {}
    }

    // ── Fetch all line items to restore inventory stock ───────────────────────
    let item_rows = match sqlx::query(
        "SELECT product_id, variant_id, qty FROM sale_items WHERE sale_id = ?"
    )
    .bind(&id)
    .fetch_all(&mut *tx)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            println!("❌ Failed to retrieve line items for voiding sale {}: {}", id, e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load sale items for restocking").into_response();
        }
    };

    // ── Loop and add stock back safely ────────────────────────────────────────
    for row in item_rows {
        let product_id: String = row.get("product_id");
        let variant_id: Option<String> = row.get("variant_id");
        let qty: f64 = row.get("qty");

        if let Some(vid) = variant_id {
            // Restore variant stock
            if let Err(e) = sqlx::query(
                "UPDATE product_variants 
                 SET quantity = quantity + ? 
                 WHERE id = ?"
            )
            .bind(qty)
            .bind(&vid)
            .execute(&mut *tx)
            .await
            {
                println!("⚠️ Stock restoration warning: Failed to restock variant {}: {}", vid, e);
            }
        } else {
            // Restore simple product stock
            if let Err(e) = sqlx::query(
                "UPDATE products 
                 SET quantity = CAST(quantity AS REAL) + ? 
                 WHERE id = ?"
            )
            .bind(qty)
            .bind(&product_id)
            .execute(&mut *tx)
            .await
            {
                println!("⚠️ Stock restoration warning: Failed to restock product {}: {}", product_id, e);
            }
        }
    }

    // ── Change sale status ────────────────────────────────────────────────────
    if let Err(e) = sqlx::query("UPDATE sales SET status = 'voided' WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
    {
        println!("❌ Failed to update status to voided for sale {}: {}", id, e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Void status update failed").into_response();
    }

    // ── Commit atomic transaction ─────────────────────────────────────────────
    if let Err(e) = tx.commit().await {
        println!("❌ Void transaction commit failed for sale {}: {}", id, e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Storage write checkpoint dropped").into_response();
    }

    println!("🚫 Sale '{}' successfully marked as voided and stock restored.", id);

    (
        StatusCode::OK,
        Json(serde_json::json!({ "id": id, "status": "voided" })),
    )
        .into_response()
}