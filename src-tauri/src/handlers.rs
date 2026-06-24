use axum::{
    extract::{State, WebSocketUpgrade, ws::{WebSocket, Message}},
    http::Uri,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use sqlx::Row;
use crate::AppState;

pub async fn ping_host() -> &'static str {
    "SuperStock Host Active"
}

pub async fn fallback_404(_uri: Uri) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::NOT_FOUND, "Route not found".to_string())
}

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    println!("🔌 A terminal device connected via WebSocket.");
    let mut rx = state.tx.subscribe();
    tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if socket.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
        println!("🔌 A terminal device disconnected.");
    });
}

pub async fn get_products(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let rows = sqlx::query("SELECT id, name, price, stock FROM products")
        .fetch_all(&state.db)
        .await
        .unwrap();
        
    let mut products = vec![];
    for row in rows {
        products.push(serde_json::json!({
            "id": row.get::<String, _>("id"),
            "name": row.get::<String, _>("name"),
            "price": row.get::<f64, _>("price"),
            "stock": row.get::<i32, _>("stock"),
        }));
    }
    Json(serde_json::json!(products))
}

pub async fn simulate_sale(State(state): State<Arc<AppState>>) -> &'static str {
    let _ = sqlx::query("UPDATE products SET stock = MAX(0, stock - 1) WHERE id = 'p1'")
        .execute(&state.db)
        .await;
        
    let current_stock: i32 = sqlx::query_scalar("SELECT stock FROM products WHERE id = 'p1'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
        
    let payload = serde_json::json!({
        "event": "stock_update", 
        "product_id": "p1", 
        "new_stock": current_stock
    }).to_string();
    
    let _ = state.tx.send(payload);
    "Sale processed! Broadcast sent."
}