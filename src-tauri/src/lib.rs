use std::net::SocketAddr;
use axum::{
    routing::get, 
    Router, 
    extract::{State, WebSocketUpgrade, ws::{WebSocket, Message}}, 
    Json, 
    http::Uri,
    response::IntoResponse
};
use tower_http::cors::CorsLayer;
use mdns_sd::{ServiceDaemon, ServiceInfo, ServiceEvent};
use sqlx::{SqlitePool, Row};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::broadcast;
use tauri::Manager; // Required for safe OS app-data directory path resolution

const SERVICE_TYPE: &str = "_superstock-pos._tcp.local.";
const INSTANCE_NAME: &str = "superstock_master_server";

// Configuration Struct to save to disk
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct AppConfig {
    app_mode: String, // "host" or "client"
}

struct AppState {
    db: SqlitePool,
    tx: broadcast::Sender<String>,
}

async fn ping_host() -> &'static str {
    "SuperStock Host Active"
}

async fn fallback_404(_uri: Uri) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::NOT_FOUND, "Route not found".to_string())
}

async fn init_database() -> Option<SqlitePool> {
    let db_url = "sqlite://../superstock.db?mode=rwc";
    
    println!("⚙️ [Step 1/3] Connecting to SQLite database...");
    let pool = match SqlitePool::connect(db_url).await {
        Ok(p) => p,
        Err(e) => {
            println!("❌ CRITICAL DATABASE ERROR: Failed to connect to SQLite! Reason: {}", e);
            return None;
        }
    };

    if let Err(e) = sqlx::query("PRAGMA journal_mode=WAL;").execute(&pool).await {
        println!("❌ DATABASE ERROR: Failed to set WAL mode! Reason: {}", e);
        return None;
    }
    
    if let Err(e) = sqlx::query("PRAGMA synchronous=NORMAL;").execute(&pool).await {
        println!("❌ DATABASE ERROR: Failed to set synchronous mode! Reason: {}", e);
        return None;
    }

    let table_query = "CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL
    );";
    
    if let Err(e) = sqlx::query(table_query).execute(&pool).await {
        println!("❌ DATABASE ERROR: Failed to create products table! Reason: {}", e);
        return None;
    }

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    if count == 0 {
        let _ = sqlx::query("INSERT INTO products (id, name, price, stock) VALUES (?, ?, ?, ?)")
            .bind("p1").bind("Air Jordan 1 Low").bind(15000.0).bind(12)
            .execute(&pool).await;
        println!("📝 Seed product inserted successfully.");
    }

    println!("💾 SQLite Database initialized flawlessly.");
    Some(pool)
}

fn start_mdns_broadcast() -> bool {
    println!("⚙️ [Step 2/3] Initializing mDNS Service...");
    let mdns = match ServiceDaemon::new() {
        Ok(d) => d,
        Err(e) => {
            println!("❌ CRITICAL mDNS ERROR: Could not create daemon! Reason: {}", e);
            return false;
        }
    };

    let service_info = match ServiceInfo::new(SERVICE_TYPE, INSTANCE_NAME, "superstock-host.local.", "", 8080, None) {
        Ok(info) => info,
        Err(e) => {
            println!("❌ CRITICAL mDNS ERROR: Metadata generation failed! Reason: {}", e);
            return false;
        }
    };

    if let Err(e) = mdns.register(service_info) {
        println!("❌ CRITICAL mDNS ERROR: Registration broadcast failed! Reason: {}", e);
        return false;
    }

    println!("📡 mDNS broadcasting service active.");
    true
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> impl IntoResponse {
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

async fn get_products(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let rows = sqlx::query("SELECT id, name, price, stock FROM products").fetch_all(&state.db).await.unwrap();
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

async fn simulate_sale(State(state): State<Arc<AppState>>) -> &'static str {
    let _ = sqlx::query("UPDATE products SET stock = MAX(0, stock - 1) WHERE id = 'p1'").execute(&state.db).await;
    let current_stock: i32 = sqlx::query_scalar("SELECT stock FROM products WHERE id = 'p1'").fetch_one(&state.db).await.unwrap_or(0);
    let payload = serde_json::json!({"event": "stock_update", "product_id": "p1", "new_stock": current_stock}).to_string();
    let _ = state.tx.send(payload);
    "Sale processed! Broadcast sent."
}

async fn start_backend_server(db_pool: SqlitePool) {
    start_mdns_broadcast();
    
    println!("⚙️ [Step 3/3] Binding network endpoints...");
    let (tx, _rx) = broadcast::channel(16);
    let shared_state = Arc::new(AppState { db: db_pool, tx });

    let app = Router::new()
        .route("/api/ping", get(ping_host))
        .route("/api/products", get(get_products))
        .route("/api/simulate-sale", get(simulate_sale))
        .route("/ws", get(ws_handler))
        .fallback(fallback_404)
        .layer(CorsLayer::permissive())
        .with_state(shared_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    
    match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            println!("🚀 SUCCESS: Real-time Sync Server online at {}", addr);
            axum::serve(listener, app).await.unwrap();
        }
        Err(e) => {
            println!("❌ CRITICAL AXUM ERROR: Server bind failed! Reason: {}", e);
            tokio::time::sleep(Duration::from_secs(3600)).await; 
        }
    }
}

// TAURI COMMAND: Tells Frontend what mode this app is in
#[tauri::command]
async fn get_app_mode(app: tauri::AppHandle) -> String {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let config_path = app_dir.join("superstock_config.json");
    
    if config_path.exists() {
        let file_content = std::fs::read_to_string(config_path).unwrap_or_default();
        if let Ok(cfg) = serde_json::from_str::<AppConfig>(&file_content) {
            return cfg.app_mode;
        }
    }
    "unknown".to_string()
}

// TAURI COMMAND: Writes choice from frontend wizard screen to storage
#[tauri::command]
async fn set_app_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    if mode != "host" && mode != "client" {
        return Err("Invalid application mode config parameter context.".to_string());
    }

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let _ = std::fs::create_dir_all(&app_dir);
    let config_path = app_dir.join("superstock_config.json");

    let cfg = AppConfig { app_mode: mode };
    let json_str = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    
    std::fs::write(config_path, json_str).map_err(|e| e.to_string())?;
    println!("💾 App configuration identity successfully saved as: '{}'", cfg.app_mode);
    Ok(())
}

#[tauri::command]
async fn discover_host() -> Result<String, String> {
    let mdns = ServiceDaemon::new().map_err(|e| e.to_string())?;
    let receiver = mdns.browse(SERVICE_TYPE).map_err(|e| e.to_string())?;
    let start_time = std::time::Instant::now();
    while start_time.elapsed() < Duration::from_secs(3) {
        if let Ok(event) = receiver.recv_timeout(Duration::from_millis(200)) {
            if let ServiceEvent::ServiceResolved(info) = event {
                if let Some(ip) = info.get_addresses().iter().next() {
                    return Ok(format!("http://{}:{}", ip, info.get_port()));
                }
            }
        }
    }
    Err("mDNS timeout".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Register the new app mode setup commands here
        .invoke_handler(tauri::generate_handler![discover_host, get_app_mode, set_app_mode])
        .setup(|app| {
            // Find or create safe system environment user files location
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let _ = std::fs::create_dir_all(&app_dir);
            let config_path = app_dir.join("superstock_config.json");

            // Check if configuration exists
            let config: Option<AppConfig> = if config_path.exists() {
                let file_content = std::fs::read_to_string(config_path).unwrap_or_default();
                serde_json::from_str(&file_content).ok()
            } else {
                None
            };

            // Fork background thread tasks execution paths dynamically
            tauri::async_runtime::spawn(async move {
                if let Some(cfg) = config {
                    if cfg.app_mode == "host" {
                        println!("👑 Identity Confirmed: Running as HOST MASTER SERVER.");
                        if let Some(db_pool) = init_database().await {
                            start_backend_server(db_pool).await;
                        } else {
                            println!("🛑 App startup aborted due to initialization failure.");
                            tokio::time::sleep(Duration::from_secs(3600)).await;
                        }
                    } else {
                        println!("💻 Identity Confirmed: Running as CLIENT TERMINAL. Local database skipped.");
                        // Client skips running Axum or SQLite completely; relies strictly on network hooks
                    }
                } else {
                    println!("❓ Identity Unknown: First boot detected. Setup configuration wizard required.");
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}