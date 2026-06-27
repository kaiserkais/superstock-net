use axum::{
    routing::{get, patch, post, put},
    Router,
};
use std::sync::Arc;
use std::path::PathBuf;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use crate::{
    AppState, auth, categories, customers, handlers, 
    products, sales, staff, suppliers, sales_history, settings // 👈 1. Added settings sub-module registration here
};

/// Helper function to resolve the native platform image directory used by DB storage
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

        // ── Products Catalog ───────────────────────────────────────────────────
        .route("/api/products",
            get(products::get_products)
            .post(products::create_product)
        )
        .route("/api/products/:id", get(products::get_product)
            .put(products::edit_product)
            .delete(products::delete_product)
        )

        // ── Categories ────────────────────────────────────────────────────────
        .route("/api/categories",
            get(categories::get_categories)
            .post(categories::create_category)
        )
        .route("/api/categories/:id",
            put(categories::edit_category)
            .delete(categories::delete_category)
        )

        // ── Staff ─────────────────────────────────────────────────────────────
        .route("/api/staff",
            get(staff::get_staff)
            .post(staff::create_staff)
        )
        .route("/api/staff/:id",
            put(staff::update_staff)
            .delete(staff::delete_staff)
        )

        // ── Suppliers & Debt ──────────────────────────────────────────────────
        .route("/api/suppliers",
            get(suppliers::get_suppliers)
            .post(suppliers::create_supplier)
        )
        .route("/api/suppliers/:id/debt",
            put(suppliers::adjust_supplier_debt)
        )

        // ── Customers ─────────────────────────────────────────────────────────
        .route("/api/customers",
            get(customers::get_customers)
            .post(customers::create_customer)
        )
        .route("/api/customers/:id",
            put(customers::update_customer)
            .delete(customers::delete_customer)
        )

        // ── Sales & History Registry ──────────────────────────────────────────
        .route("/api/sales",
            post(sales::create_sale)
            .get(sales_history::get_sales)
        )
        .route("/api/sales/:id",       get(sales_history::get_sale))
        .route("/api/sales/:id/void",  patch(sales_history::void_sale))

        // ── Global System Settings ────────────────────────────────────────────
        // 👈 2. Registered new system settings configurations endpoint here
        .route("/api/settings",
            get(settings::get_settings)
            .put(settings::update_settings)
        )

        // ── Static Assets ─────────────────────────────────────────────────────
        .nest_service("/images", ServeDir::new(get_system_image_dir()))

        // ── Infrastructure ────────────────────────────────────────────────────
        .route("/ws", get(handlers::ws_handler))
        .route("/api/simulate-sale", get(handlers::simulate_sale))
        .fallback(handlers::fallback_404)
        .layer(CorsLayer::permissive())
        .with_state(shared_state)
}