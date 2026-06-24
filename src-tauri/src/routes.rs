use axum::{
    routing::{get, post, put, delete},
    Router,
};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use crate::{AppState, auth, staff, handlers};

pub fn create_router(shared_state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/ping", get(handlers::ping_host))
        .route("/api/auth/login", post(auth::login_handler))
        .route("/api/products", get(handlers::get_products))
        .route("/api/simulate-sale", get(handlers::simulate_sale))
        .route("/api/staff", get(staff::get_staff).post(staff::create_staff))
        .route("/api/staff/:id", put(staff::update_staff).delete(staff::delete_staff))
        .route("/ws", get(handlers::ws_handler))
        .fallback(handlers::fallback_404)
        .layer(CorsLayer::permissive())
        .with_state(shared_state)
}