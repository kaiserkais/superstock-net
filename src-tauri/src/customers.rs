use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use sqlx::Row;

#[derive(serde::Serialize)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub total_debt: f64,
}

#[derive(serde::Deserialize)]
pub struct CreateCustomerPayload {
    pub name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub initial_debt: Option<f64>,
}

#[derive(serde::Deserialize)]
pub struct UpdateCustomerPayload {
    pub name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
}

/// GET /api/customers - List all customer registry files
pub async fn get_customers(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let rows_result = sqlx::query("SELECT id, name, phone_number, address, total_debt FROM customers")
        .fetch_all(&state.db)
        .await;

    match rows_result {
        Ok(rows) => {
            let customers: Vec<Customer> = rows.iter().map(|row| Customer {
                id: row.get("id"),
                name: row.get("name"),
                phone_number: row.get("phone_number"),
                address: row.get("address"),
                total_debt: row.get("total_debt"),
            }).collect();
            
            (StatusCode::OK, Json(customers)).into_response()
        }
        Err(e) => {
            println!("❌ Database read failure: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load customer files").into_response()
        }
    }
}

/// POST /api/customers - Provision a new client profile
pub async fn create_customer(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateCustomerPayload>,
) -> impl IntoResponse {
    // Generate a unique ID using a millisecond timestamp matching your pattern
    let generated_id = format!("c_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis());

    let fallback_debt = payload.initial_debt.unwrap_or(0.0);

    let insert_result = sqlx::query(
        "INSERT INTO customers (id, name, phone_number, address, total_debt) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&generated_id)
    .bind(&payload.name)
    .bind(&payload.phone_number)
    .bind(&payload.address)
    .bind(fallback_debt)
    .execute(&state.db)
    .await;

    match insert_result {
        Ok(_) => (StatusCode::CREATED, Json(serde_json::json!({ "id": generated_id, "status": "success" }))).into_response(),
        Err(e) => {
            println!("❌ Customer generation failed: {}", e);
            (StatusCode::BAD_REQUEST, "Malformed input syntax or structural database error").into_response()
        }
    }
}

/// PUT /api/customers/:id - Modify profile parameters
pub async fn update_customer(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCustomerPayload>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "UPDATE customers SET name = ?, phone_number = ?, address = ? WHERE id = ?"
    )
    .bind(&payload.name)
    .bind(&payload.phone_number)
    .bind(&payload.address)
    .bind(&id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => (StatusCode::OK, "Customer profile committed successfully").into_response(),
        Ok(_) => (StatusCode::NOT_FOUND, "Target customer profile not located").into_response(),
        Err(e) => {
            println!("❌ Customer modification failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Profile alteration failed").into_response()
        }
    }
}

/// DELETE /api/customers/:id - Remove customer file from active ledger
pub async fn delete_customer(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM customers WHERE id = ?").bind(&id).execute(&state.db).await {
        Ok(res) if res.rows_affected() > 0 => (StatusCode::OK, "Customer account purged").into_response(),
        Ok(_) => (StatusCode::NOT_FOUND, "Target profile not located").into_response(),
        Err(e) => {
            println!("❌ Customer account purge failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database deletion operation failed").into_response()
        }
    }
}