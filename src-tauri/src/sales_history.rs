use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{QueryBuilder, SqlitePool, Sqlite};
use std::sync::Arc;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct SalesFilter {
    pub session_id: Option<i64>,
    pub user_id: Option<String>,
    pub customer_id: Option<String>,
    pub status: Option<String>,
    // ── New Date Range Filters ──
    pub start_date: Option<String>, // Expects ISO format or "YYYY-MM-DD"
    pub end_date: Option<String>,   // Expects ISO format or "YYYY-MM-DD"
    // ── New Pagination Query Selectors ──
    pub page: Option<i64>,
    pub per_page: Option<i64>,
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

// ── Shared Standard Envelope for Paginated Deliveries ──────────────────────
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total_count: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

/// GET /api/sales
/// Lists all sales supporting server-side cursor pagination, date filtering, and type statuses
pub async fn get_sales(
    State(state): State<Arc<AppState>>,
    Query(filter): Query<SalesFilter>,
) -> Result<Json<PaginatedResponse<SaleSummary>>, (StatusCode, String)> {
    
    // 1. Establish pagination fallbacks and constraints
    let page = filter.page.unwrap_or(1).max(1);
    let per_page = filter.per_page.unwrap_or(20).max(1).min(100); // Caps requests to max 100 items for safety
    let offset = (page - 1) * per_page;

    // 2. BUILD COUNT QUERY (Find total items matching conditions)
    let mut count_builder: QueryBuilder<'_, Sqlite> = QueryBuilder::new(
        "SELECT COUNT(*) FROM sales s WHERE 1=1 "
    );
    
    if let Some(session) = filter.session_id {
        count_builder.push(" AND s.session_id = ").push_bind(session);
    }
    if let Some(ref user) = filter.user_id {
        count_builder.push(" AND s.user_id = ").push_bind(user);
    }
    if let Some(ref customer) = filter.customer_id {
        count_builder.push(" AND s.customer_id = ").push_bind(customer);
    }
    if let Some(ref status) = filter.status {
        count_builder.push(" AND s.status = ").push_bind(status);
    }
    if let Some(ref start) = filter.start_date {
        count_builder.push(" AND s.created_at >= ").push_bind(start);
    }
    if let Some(ref end) = filter.end_date {
        count_builder.push(" AND s.created_at <= ").push_bind(end);
    }

    let total_count: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("❌ Count indexing breakdown: {e}")))?;

    // Early exit strategy if nothing matches criteria
    if total_count == 0 {
        return Ok(Json(PaginatedResponse {
            data: vec![],
            total_count: 0,
            page,
            per_page,
            total_pages: 0,
        }));
    }

    // 3. BUILD DATA FETCH QUERY
    let mut data_builder: QueryBuilder<'_, Sqlite> = QueryBuilder::new(
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
        data_builder.push(" AND s.session_id = ").push_bind(session);
    }
    if let Some(ref user) = filter.user_id {
        data_builder.push(" AND s.user_id = ").push_bind(user);
    }
    if let Some(ref customer) = filter.customer_id {
        data_builder.push(" AND s.customer_id = ").push_bind(customer);
    }
    if let Some(ref status) = filter.status {
        data_builder.push(" AND s.status = ").push_bind(status);
    }
    if let Some(ref start) = filter.start_date {
        data_builder.push(" AND s.created_at >= ").push_bind(start);
    }
    if let Some(ref end) = filter.end_date {
        data_builder.push(" AND s.created_at <= ").push_bind(end);
    }

    // Append Sort Engine & Cursor Boundaries
    data_builder.push(" ORDER BY s.created_at DESC LIMIT ");
    data_builder.push_bind(per_page);
    data_builder.push(" OFFSET ");
    data_builder.push_bind(offset);

    let sales = data_builder
        .build_query_as::<SaleSummary>()
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("❌ Data extraction breakdown: {e}")))?;

    // Calculate dynamic pagination bounds
    let total_pages = (total_count as f64 / per_page as f64).ceil() as i64;

    Ok(Json(PaginatedResponse {
        data: sales,
        total_count,
        page,
        per_page,
        total_pages,
    }))
}

/// GET /api/sales/:id
pub async fn get_sale(
    State(state): State<Arc<AppState>>,
    Path(sale_id): Path<String>,
) -> Result<Json<SaleFullDetails>, (StatusCode, String)> {
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
pub async fn void_sale(
    State(state): State<Arc<AppState>>,
    Path(sale_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let mut tx = state.db.begin().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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

    let items = sqlx::query_as::<_, SaleItemDetail>(
        "SELECT id, product_id, variant_id, product_name, unit, qty, unit_cost, unit_price, line_total, is_weighted 
         FROM sale_items WHERE sale_id = ?"
    )
    .bind(&sale_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    for item in items {
        let quantity_to_return = item.qty.round() as i64;

        if let Some(v_id) = item.variant_id {
            sqlx::query("UPDATE product_variants SET quantity = quantity + ? WHERE id = ?")
                .bind(quantity_to_return)
                .bind(v_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        } else {
            sqlx::query("UPDATE products SET quantity = quantity + ? WHERE id = ?")
                .bind(quantity_to_return)
                .bind(item.product_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }

    sqlx::query("UPDATE sales SET status = 'voided' WHERE id = ?")
        .bind(&sale_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tx.commit().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}