use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::AppState;

// ─── DATA MODELS ─────────────────────────────────────────────────────────────

#[derive(Serialize, sqlx::FromRow)]
pub struct Supplier {
    pub id: String,
    pub name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub total_debt: f64,
}

#[derive(Deserialize)]
pub struct CreateSupplierPayload {
    pub name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub initial_debt: Option<f64>, // Allows starting with an existing debt balance
}

#[derive(Deserialize)]
pub struct DebtAdjustmentPayload {
    /// The amount of money involved in this operation
    pub amount: f64,
    /// Must be either "purchase_credit" (increases debt) or "payment" (decreases debt)
    pub operation: String, 
}

// ─── HANDLERS ────────────────────────────────────────────────────────────────

/// Retrieves all registered suppliers from the system
pub async fn get_suppliers(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Supplier>>, (StatusCode, String)> {
    let suppliers = sqlx::query_as::<_, Supplier>("SELECT * FROM suppliers ORDER BY name ASC")
        .fetch_all(&state.db) // 💡 Adjust to match your AppState field name (.pool vs .db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(suppliers))
}

/// Provisions a new supplier with a secure safe configuration
pub async fn create_supplier(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateSupplierPayload>,
) -> Result<(StatusCode, Json<Supplier>), (StatusCode, String)> {
    // Basic structural validation
    if payload.name.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Supplier name cannot be empty".to_string()));
    }

    // Generate a simple unique ID string using current timestamp bits
    let supplier_id = format!("sup_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis());

    let initial_debt = payload.initial_debt.unwrap_or(0.0);

    sqlx::query(
        "INSERT INTO suppliers (id, name, phone_number, address, total_debt) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&supplier_id)
    .bind(&payload.name)
    .bind(&payload.phone_number)
    .bind(&payload.address)
    .bind(initial_debt)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let created_supplier = Supplier {
        id: supplier_id,
        name: payload.name,
        phone_number: payload.phone_number,
        address: payload.address,
        total_debt: initial_debt,
    };

    Ok((StatusCode::CREATED, Json(created_supplier)))
}

/// Increments or decrements a specific supplier's outstanding financial debt balance
pub async fn adjust_supplier_debt(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<DebtAdjustmentPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    if payload.amount <= 0.0 {
        return Err((StatusCode::BAD_REQUEST, "Transaction amount must be greater than zero".to_string()));
    }

    // Calculate modification impact depending on business vector choice
    let modification_delta = match payload.operation.as_str() {
        "purchase_credit" => payload.amount, // We bought items on credit -> we owe MORE money (+ balance)
        "payment" => -payload.amount,         // We paid cash down -> we owe LESS money (- balance)
        _ => return Err((StatusCode::BAD_REQUEST, "Invalid operation type. Use 'purchase_credit' or 'payment'.".to_string())),
    };

    // Execute safe atomic column update mutation directly on SQLite row
    let result = sqlx::query("UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?")
        .bind(modification_delta)
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Target supplier record not found".to_string()));
    }

    Ok(StatusCode::OK)
}