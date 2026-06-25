mod db;
mod auth;
mod staff;
mod routes;
mod handlers; // <-- Declares the new modular handler file
mod suppliers;
mod customers;
mod products;
mod categories;

use std::net::SocketAddr;
use mdns_sd::{ServiceDaemon, ServiceInfo, ServiceEvent};
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::broadcast;
use tauri::Manager;

const SERVICE_TYPE: &str = "_superstock-pos._tcp.local.";
const INSTANCE_NAME: &str = "superstock_master_server";

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct AppConfig {
    app_mode: String,
}

pub struct AppState {
    pub db: SqlitePool,
    pub tx: broadcast::Sender<String>,
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

async fn start_backend_server(db_pool: SqlitePool) {
    start_mdns_broadcast();
    
    println!("⚙️ [Step 3/3] Binding network endpoints...");
    let (tx, _rx) = broadcast::channel(16);
    let shared_state = Arc::new(AppState { db: db_pool, tx });

    // Build routes using our clean modular router
    let app = routes::create_router(shared_state);

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

#[tauri::command]
async fn set_app_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    if mode != "host" && mode != "client" {
        return Err("Invalid application mode context.".to_string());
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
        .invoke_handler(tauri::generate_handler![discover_host, get_app_mode, set_app_mode])
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let _ = std::fs::create_dir_all(&app_dir);
            let config_path = app_dir.join("superstock_config.json");

            let config: Option<AppConfig> = if config_path.exists() {
                let file_content = std::fs::read_to_string(config_path).unwrap_or_default();
                serde_json::from_str(&file_content).ok()
            } else {
                None
            };

            tauri::async_runtime::spawn(async move {
                if let Some(cfg) = config {
                    if cfg.app_mode == "host" {
                        println!("👑 Identity Confirmed: Running as HOST MASTER SERVER.");
                        
                        if let Some(db_pool) = db::init_database().await {
                            start_backend_server(db_pool).await;
                        } else {
                            println!("🛑 App startup aborted due to initialization failure.");
                            tokio::time::sleep(Duration::from_secs(3600)).await;
                        }
                    } else {
                        println!("💻 Identity Confirmed: Running as CLIENT TERMINAL. Local database skipped.");
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