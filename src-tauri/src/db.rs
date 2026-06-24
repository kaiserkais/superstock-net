use sqlx::SqlitePool;
use bcrypt::{hash, DEFAULT_COST};
use std::fs;
use std::path::PathBuf;

/// Initializes the local database connection, sets performance configurations,
/// runs structural schemas, and seeds fallback records.
pub async fn init_database() -> Option<SqlitePool> {
    // ─── DYNAMIC PLATFORM PATH RESOLUTION ────────────────────────────────
    let mut storage_dir = match std::env::var("APPDATA") {
        Ok(path) => PathBuf::from(path).join("SuperStock"),
        Err(_) => {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home).join(".local").join("share").join("SuperStock")
        }
    };

    // Ensure the application data directory exists
    if let Err(e) = fs::create_dir_all(&storage_dir) {
        println!("❌ CRITICAL INITIALIZATION ERROR: Failed to create AppData directory! Reason: {}", e);
        return None;
    }

    storage_dir.push("superstock.db");
    let db_url = format!("sqlite://{}?mode=rwc", storage_dir.to_string_lossy());
    
    println!("⚙️ [Step 1/3] Connecting to SQLite database at: {}", storage_dir.display());
    let pool = match SqlitePool::connect(&db_url).await {
        Ok(p) => p,
        Err(e) => {
            println!("❌ CRITICAL DATABASE ERROR: Failed to connect to SQLite! Reason: {}", e);
            return None;
        }
    };

    let _ = sqlx::query("PRAGMA journal_mode=WAL;").execute(&pool).await;
    let _ = sqlx::query("PRAGMA synchronous=NORMAL;").execute(&pool).await;

    if let Err(e) = create_schemas(&pool).await {
        println!("❌ CRITICAL INITIALIZATION ERROR: Schema build failed! Reason: {}", e);
        return None;
    }

    if let Err(e) = seed_default_data(&pool).await {
        println!("❌ CRITICAL INITIALIZATION ERROR: Seeding operations failed! Reason: {}", e);
        return None;
    }

    println!("💾 SQLite Database architecture initialized flawlessly.");
    Some(pool)
}

async fn create_schemas(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // 1. Products Table
    let product_table = "CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL
    );";
    sqlx::query(product_table).execute(pool).await?;

    // 2. Users Table
    let user_table = "CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        phone_number TEXT,
        role TEXT NOT NULL CHECK(role IN ('admin', 'cashier'))
    );";
    sqlx::query(user_table).execute(pool).await?;

    // 3. Suppliers Table 👈 NEW STRUCTURE
    let supplier_table = "CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone_number TEXT,
        address TEXT,
        total_debt REAL NOT NULL DEFAULT 0.0
    );";
    sqlx::query(supplier_table).execute(pool).await?;

    Ok(())
}

async fn seed_default_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Seed Products
    let prod_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products").fetch_one(pool).await.unwrap_or(0);
    if prod_count == 0 {
        sqlx::query("INSERT INTO products (id, name, price, stock) VALUES (?, ?, ?, ?)")
            .bind("p1").bind("Air Jordan 1 Low").bind(15000.0).bind(12)
            .execute(pool).await?;
        println!("📝 Seed product inserted successfully.");
    }

    // Seed Users
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users").fetch_one(pool).await.unwrap_or(0);
    if user_count == 0 {
        let admin_password_hash = hash("admin", DEFAULT_COST)
            .map_err(|e| sqlx::Error::Protocol(e.to_string()))?;
        
        let seed_user = "INSERT INTO users (id, username, password_hash, phone_number, role) VALUES (?, ?, ?, ?, ?)";
        sqlx::query(seed_user)
            .bind("u1")
            .bind("admin")
            .bind(admin_password_hash)
            .bind("0555000000")
            .bind("admin")
            .execute(pool)
            .await?;
        
        println!("👤 Default account generated successfully -> Username: admin | Password: admin");
    }

    // Seed Suppliers 👈 NEW SEED DATA
    let supplier_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM suppliers").fetch_one(pool).await.unwrap_or(0);
    if supplier_count == 0 {
        let seed_supplier = "INSERT INTO suppliers (id, name, phone_number, address, total_debt) VALUES (?, ?, ?, ?, ?)";
        sqlx::query(seed_supplier)
            .bind("s1")
            .bind("Wholesale Footwear Co.")
            .bind("0555112233")
            .bind("Alger, Centre")
            .bind(45000.0) // Sample initial debt balance
            .execute(pool)
            .await?;
        
        println!("📦 Seed supplier inserted successfully -> Name: Wholesale Footwear Co. | Initial Debt: 45000.0");
    }

    Ok(())
}