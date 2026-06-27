use sqlx::SqlitePool;
use std::fs;
use std::path::PathBuf;

pub mod categories;
pub mod users;
pub mod suppliers;
pub mod customers;
pub mod products;
pub mod sales;
pub mod settings;

/// Initializes the local database connection, sets performance configurations,
/// runs structural schemas, and seeds fallback records.
pub async fn init_database() -> Option<SqlitePool> {
    // ─── DYNAMIC PLATFORM PATH RESOLUTION ────────────────────────────────
    let mut storage_dir = match std::env::var("APPDATA") {
        Ok(path) => PathBuf::from(path).join("SuperStock"),
        Err(_) => {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("SuperStock")
        }
    };

    // Ensure the application data directory exists
    if let Err(e) = fs::create_dir_all(&storage_dir) {
        println!(
            "❌ CRITICAL INITIALIZATION ERROR: Failed to create AppData directory! Reason: {}",
            e
        );
        return None;
    }

    storage_dir.push("superstock.db");
    let db_url = format!("sqlite://{}?mode=rwc", storage_dir.to_string_lossy());

    println!(
        "⚙️ [Step 1/3] Connecting to SQLite database at: {}",
        storage_dir.display()
    );
    let pool = match SqlitePool::connect(&db_url).await {
        Ok(p) => p,
        Err(e) => {
            println!(
                "❌ CRITICAL DATABASE ERROR: Failed to connect to SQLite! Reason: {}",
                e
            );
            return None;
        }
    };

    let _ = sqlx::query("PRAGMA journal_mode=WAL;").execute(&pool).await;
    let _ = sqlx::query("PRAGMA synchronous=NORMAL;").execute(&pool).await;
    let _ = sqlx::query("PRAGMA foreign_keys=ON;").execute(&pool).await;

    if let Err(e) = create_schemas(&pool).await {
        println!(
            "❌ CRITICAL INITIALIZATION ERROR: Schema build failed! Reason: {}",
            e
        );
        return None;
    }

    if let Err(e) = seed_default_data(&pool).await {
        println!(
            "❌ CRITICAL INITIALIZATION ERROR: Seeding operations failed! Reason: {}",
            e
        );
        return None;
    }

    println!("💾 SQLite Database architecture initialized flawlessly.");
    Some(pool)
}

async fn create_schemas(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Order matters to respect Foreign Keys constraints!
    categories::create_schema(pool).await?;
    users::create_schema(pool).await?;
    suppliers::create_schema(pool).await?;
    customers::create_schema(pool).await?;
    products::create_schema(pool).await?;
    sales::create_schema(pool).await?;
    settings::create_schema(pool).await?;
    Ok(())
}

async fn seed_default_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    categories::seed_data(pool).await?;
    users::seed_data(pool).await?;
    suppliers::seed_data(pool).await?;
    customers::seed_data(pool).await?;
    products::seed_data(pool).await?;
    sales::seed_data(pool).await?;
    settings::seed_data(pool).await?;
    Ok(())
}