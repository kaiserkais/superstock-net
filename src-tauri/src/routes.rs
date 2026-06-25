use axum::{
    routing::{get, post, put},
    Router,
};
use std::sync::Arc;
use std::path::PathBuf; // Added for platform path generation
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir; // Added for hosting local media folders
use crate::{AppState, auth, staff, suppliers, handlers, customers, products}; 

/// Helper function to resolve the identical native platform directory used by your DB storage
fn get_system_image_dir() -> PathBuf {
    let mut base_dir = match std::env::var("APPDATA") {
        Ok(path) => PathBuf::from(path).join("SuperStock"),
        Err(_) => {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home).join(".local").join("share").join("SuperStock")
        }
    };
    base_dir.push("product_images");
    base_dir
}

pub fn create_router(shared_state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/ping", get(handlers::ping_host))
        .route("/api/auth/login", post(auth::login_handler))
        
        // Products Catalog Management (Updated to support creation payloads)
        .route("/api/products", get(products::get_products).post(products::create_product))
        .route("/api/simulate-sale", get(handlers::simulate_sale))
        
        // Staff Management
        .route("/api/staff", get(staff::get_staff).post(staff::create_staff))
        .route("/api/staff/:id", put(staff::update_staff).delete(staff::delete_staff))
        
        // Suppliers & Debt Management
        .route("/api/suppliers", get(suppliers::get_suppliers).post(suppliers::create_supplier))
        .route("/api/suppliers/:id/debt", put(suppliers::adjust_supplier_debt))
        
        // Customer Management
        .route("/api/customers", get(customers::get_customers).post(customers::create_customer))
        .route("/api/customers/:id", put(customers::update_customer).delete(customers::delete_customer))
        
        // Static Asset Pipeline for Product Images
        // Serves files out of %APPDATA%/SuperStock/product_images under the HTTP /images namespace
        .nest_service("/images", ServeDir::new(get_system_image_dir()))
        
        // Core Config & Layers
        .route("/ws", get(handlers::ws_handler))
        .fallback(handlers::fallback_404)
        .layer(CorsLayer::permissive())
        .with_state(shared_state)
}