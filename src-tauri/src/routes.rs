use axum::{
    routing::{get, post, put},
    Router,
};
use std::sync::Arc;
use std::path::PathBuf;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

// Added categories module reference to match the others
use crate::{AppState, auth, staff, suppliers, handlers, customers, products, categories}; 

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
        
        // Products Catalog Management
        .route("/api/products", get(products::get_products).post(products::create_product))
        .route("/api/products/:id", put(products::edit_product).delete(products::delete_product))
        .route("/api/simulate-sale", get(handlers::simulate_sale))
        
        // 📁 Category Tracking Management Registry
        .route("/api/categories", get(categories::get_categories).post(categories::create_category))
        .route("/api/categories/:id", put(categories::edit_category).delete(categories::delete_category))
        
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
        .nest_service("/images", ServeDir::new(get_system_image_dir()))
        
        // Core Config & Layers
        .route("/ws", get(handlers::ws_handler))
        .fallback(handlers::fallback_404)
        .layer(CorsLayer::permissive())
        .with_state(shared_state)
}