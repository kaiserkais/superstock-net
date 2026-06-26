use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{QueryBuilder, SqlitePool, Sqlite};
use std::sync::Arc;
use crate::AppState; // Assumes AppState contains a `pool: SqlitePool`

#[derive(Debug, Deserialize)]
pub struct SalesFilter {
    pub session_id: Option<i64>,
    pub user_id: Option<String>,
    pub customer_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SaleSummary {
    pub id: String,
    pub user_id: String,
    pub cashier_name: Option<String>,
    pub session_id: i64,
    pub customer_id: Option<String>,
    pub customer_name: Option<String>,
    pub subtotal: f64,
    pub adj_type: String,
    pub adj_value: f64,
    pub total: f64,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SaleItemDetail {
    pub id: String,
    pub product_id: String,
    pub variant_id: Option<String>,
    pub product_name: String,
    pub unit: String,
    pub qty: f64,
    pub unit_cost: f64,
    pub unit_price: f64,
    pub line_total: f64,
    pub is_weighted: i64,
}

#[derive(Debug, Serialize)]
pub struct SaleFullDetails {
    #[serde(flatten)]
    pub summary: SaleSummary,
    pub items: Vec<SaleItemDetail>,
}

/// GET /api/sales
/// Lists all sales with dynamic query filtering for reporting/history views
pub async fn get_sales(
    State(state): State<Arc<AppState>>,
    Query(filter): Query<SalesFilter>,
) -> Result<Json<Vec<SaleSummary>>, (StatusCode, String)> {
    
    let mut query_builder: QueryBuilder<'_, Sqlite> = QueryBuilder::new(
        "SELECT 
            s.id, s.user_id, u.username as cashier_name, s.session_id, 
            s.customer_id, c.name as customer_name, s.subtotal, 
            s.adj_type, s.adj_value, s.total, s.status, s.created_at
         FROM sales s
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN customers c ON s.customer_id = c.id
         WHERE 1=1 "
    );

    if let Some(session) = filter.session_id {
        query_builder.push(" AND s.session_id = ");
        query_builder.push_bind(session);
    }
    if let Some(user) = filter.user_id {
        query_builder.push(" AND s.user_id = ");
        query_builder.push_bind(user);
    }
    if let Some(customer) = filter.customer_id {
        query_builder.push(" AND s.customer_id = ");
        query_builder.push_bind(customer);
    }
    if let Some(status) = filter.status {
        query_builder.push(" AND s.status = ");
        query_builder.push_bind(status);
    }

    query_builder.push(" ORDER BY s.created_at DESC");

    let sales = query_builder
        .build_query_as::<SaleSummary>()
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("❌ Database query error: {e}")))?;

    Ok(Json(sales))
}

/// GET /api/sales/:id
/// Fetches structural breakdown of a singular ticket alongside its snapshot line-items
pub async fn get_sale(
    State(state): State<Arc<AppState>>,
    Path(sale_id): Path<String>,
) -> Result<Json<SaleFullDetails>, (StatusCode, String)> {
    
    // 1. Fetch metadata summary header
    let summary = sqlx::query_as::<_, SaleSummary>(
        "SELECT 
            s.id, s.user_id, u.username as cashier_name, s.session_id, 
            s.customer_id, c.name as customer_name, s.subtotal, 
            s.adj_type, s.adj_value, s.total, s.status, s.created_at
         FROM sales s
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN customers c ON s.customer_id = c.id
         WHERE s.id = ?"
    )
    .bind(&sale_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Invoice not found".to_string()))?;

    // 2. Fetch linked snapshot line items
    let items = sqlx::query_as::<_, SaleItemDetail>(
        "SELECT id, product_id, variant_id, product_name, unit, qty, unit_cost, unit_price, line_total, is_weighted 
         FROM sale_items 
         WHERE sale_id = ?"
    )
    .bind(&sale_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(SaleFullDetails { summary, items }))
}

/// PATCH /api/sales/:id/void
/// Voids a transactional file and gracefully returns product quantities back into stock ledger modules
pub async fn void_sale(
    State(state): State<Arc<AppState>>,
    Path(sale_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    
    // Initialize atomic SQLite transaction context
    let mut tx = state.db.begin().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 1. Verify invoice status isn't already voided
    let current_status: Option<String> = sqlx::query_scalar("SELECT status FROM sales WHERE id = ?")
        .bind(&sale_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = match current_status {
        Some(s) => s,
        None => return Err((StatusCode::NOT_FOUND, "Transaction target registry entry missing".to_string())),
    };

    if status == "voided" {
        return Err((StatusCode::BAD_REQUEST, "This transaction has already been voided".to_string()));
    }

    // 2. Fetch sale items to resolve stock restoration values
    let items = sqlx::query_as::<_, SaleItemDetail>(
        "SELECT id, product_id, variant_id, product_name, unit, qty, unit_cost, unit_price, line_total, is_weighted 
         FROM sale_items WHERE sale_id = ?"
    )
    .bind(&sale_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Loop through individual items to replenish stock tracking pools
    for item in items {
        let quantity_to_return = item.qty.round() as i64; // DB schema uses INTEGER for master quantities

        if let Some(v_id) = item.variant_id {
            // Replenish sub-matrix variant inventory balance rows
            sqlx::query("UPDATE product_variants SET quantity = quantity + ? WHERE id = ?")
                .bind(quantity_to_return)
                .bind(v_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        } else {
            // Replenish regular non-variable product master balance rows
            sqlx::query("UPDATE products SET quantity = quantity + ? WHERE id = ?")
                .bind(quantity_to_return)
                .bind(item.product_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }

    // 4. Finalize structural status alteration 
    sqlx::query("UPDATE sales SET status = 'voided' WHERE id = ?")
        .bind(&sale_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Commit transaction cleanly to disk storage mapping indexes
    tx.commit().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}