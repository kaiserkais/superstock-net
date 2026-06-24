use axum::{
    routing::{get, post, put}, // 💡 Removed standalone 'delete' function since we use the .delete() method
    Router,
};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use crate::{AppState, auth, staff, suppliers, handlers}; // 👈 Import handlers module here

pub fn create_router(shared_state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/ping", get(handlers::ping_host))
        .route("/api/auth/login", post(auth::login_handler))
        .route("/api/products", get(handlers::get_products))
        .route("/api/simulate-sale", get(handlers::simulate_sale))
        
        // Staff Management
        .route("/api/staff", get(staff::get_staff).post(staff::create_staff))
        .route("/api/staff/:id", put(staff::update_staff).delete(staff::delete_staff))
        
        // Suppliers & Debt Management
        .route("/api/suppliers", get(suppliers::get_suppliers).post(suppliers::create_supplier))
        .route("/api/suppliers/:id/debt", put(suppliers::adjust_supplier_debt))
        
        // Core Config & Layers
        .route("/ws", get(handlers::ws_handler))
        .fallback(handlers::fallback_404)
        .layer(CorsLayer::permissive())
        .with_state(shared_state)
}