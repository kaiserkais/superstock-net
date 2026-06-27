use crate::AppState;
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::Row;
use std::sync::Arc;

// ─── DATA STRUCTURE MATCHING SYSTEM SCHEMAS ──────────────────────────────

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SettingsPayload {
    pub store_name: String,
    pub welcome_message: Option<String>,
    pub thank_you_message: Option<String>,
    
    // Receipt Printer Configuration
    pub receipt_printer_name: Option<String>,
    pub receipt_paper_size: String, // Acceptable: '58mm', '80mm'
    
    // Invoice Printer Configuration
    pub invoice_printer_name: Option<String>,
    pub invoice_paper_size: String, // Acceptable: 'A4', 'A5'
    
    // Barcode Printer Configuration
    pub barcode_printer_name: Option<String>,
    pub barcode_paper_dimension: String, // Acceptable: '45mm x 35mm', '40mm x 20mm'
    
    // Operations & Features Toggles
    pub print_receipt_on_sale: bool,
    pub tax_percentage: f64,
    pub balance_prefix: String,
    pub automatic_backup: bool,
}

// ─── ROUTE HANDLERS ──────────────────────────────────────────────────────

/// GET /api/settings - Fetch the singular authoritative system setup record
pub async fn get_settings(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let row_res = sqlx::query(
        "SELECT store_name, welcome_message, thank_you_message, \
                receipt_printer_name, receipt_paper_size, \
                invoice_printer_name, invoice_paper_size, \
                barcode_printer_name, barcode_paper_dimension, \
                print_receipt_on_sale, tax_percentage, balance_prefix, automatic_backup \
         FROM settings WHERE id = 1"
    )
    .fetch_optional(&state.db)
    .await;

    match row_res {
        Ok(Some(row)) => {
            // Unpack SQLite integers into clean interface booleans
            let print_receipt_int: i32 = row.get("print_receipt_on_sale");
            let auto_backup_int: i32 = row.get("automatic_backup");

            let settings = SettingsPayload {
                store_name: row.get("store_name"),
                welcome_message: row.get("welcome_message"),
                thank_you_message: row.get("thank_you_message"),
                receipt_printer_name: row.get("receipt_printer_name"),
                receipt_paper_size: row.get("receipt_paper_size"),
                invoice_printer_name: row.get("invoice_printer_name"),
                invoice_paper_size: row.get("invoice_paper_size"),
                barcode_printer_name: row.get("barcode_printer_name"),
                barcode_paper_dimension: row.get("barcode_paper_dimension"),
                print_receipt_on_sale: print_receipt_int == 1,
                tax_percentage: row.get("tax_percentage"),
                balance_prefix: row.get("balance_prefix"),
                automatic_backup: auto_backup_int == 1,
            };

            (StatusCode::OK, Json(settings)).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Application settings index row not initialized").into_response(),
        Err(e) => {
            println!("❌ Database layout lookup error on settings collection: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load global system configurations").into_response()
        }
    }
}

/// PUT /api/settings - Commit application configuration adjustments
pub async fn update_settings(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SettingsPayload>,
) -> impl IntoResponse {
    // 1. Runtime validation layer to match DB structural CHECK constraints safely
    if !["58mm", "80mm"].contains(&payload.receipt_paper_size.as_str()) {
        return (StatusCode::BAD_REQUEST, "Invalid selection variant for receipt paper size").into_response();
    }
    if !["A4", "A5"].contains(&payload.invoice_paper_size.as_str()) {
        return (StatusCode::BAD_REQUEST, "Invalid selection variant for invoice paper size").into_response();
    }
    if !["45mm x 35mm", "40mm x 20mm"].contains(&payload.barcode_paper_dimension.as_str()) {
        return (StatusCode::BAD_REQUEST, "Invalid format chosen for barcode dimension constraints").into_response();
    }

    // Convert booleans back to SQLite compatible integers (0 or 1)
    let print_receipt_int = if payload.print_receipt_on_sale { 1 } else { 0 };
    let auto_backup_int = if payload.automatic_backup { 1 } else { 0 };

    // 2. Execute update against row ID 1 exclusively
    let update_res = sqlx::query(
        "UPDATE settings SET \
            store_name = ?, welcome_message = ?, thank_you_message = ?, \
            receipt_printer_name = ?, receipt_paper_size = ?, \
            invoice_printer_name = ?, invoice_paper_size = ?, \
            barcode_printer_name = ?, barcode_paper_dimension = ?, \
            print_receipt_on_sale = ?, tax_percentage = ?, balance_prefix = ?, automatic_backup = ? \
         WHERE id = 1"
    )
    .bind(&payload.store_name)
    .bind(&payload.welcome_message)
    .bind(&payload.thank_you_message)
    .bind(&payload.receipt_printer_name)
    .bind(&payload.receipt_paper_size)
    .bind(&payload.invoice_printer_name)
    .bind(&payload.invoice_paper_size)
    .bind(&payload.barcode_printer_name)
    .bind(&payload.barcode_paper_dimension)
    .bind(print_receipt_int)
    .bind(payload.tax_percentage)
    .bind(&payload.balance_prefix)
    .bind(auto_backup_int)
    .execute(&state.db)
    .await;

    match update_res {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({ "status": "success", "message": "System parameters updated successfully." })),
        ).into_response(),
        Err(e) => {
            println!("❌ Database update execution error on settings registry: {}", e);
            (StatusCode::BAD_REQUEST, "Database rejected configuration input due to a type constraint error").into_response()
        }
    }
}