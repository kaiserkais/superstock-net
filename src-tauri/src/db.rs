use bcrypt::{hash, DEFAULT_COST};
use sqlx::SqlitePool;
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
    let _ = sqlx::query("PRAGMA synchronous=NORMAL;")
        .execute(&pool)
        .await;
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
    // ── 1. Categories ─────────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS categories (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL UNIQUE,
            description TEXT
        );",
    )
    .execute(pool)
    .await?;

    // ── 2. Users ──────────────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            username      TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            phone_number  TEXT,
            role          TEXT NOT NULL CHECK(role IN ('admin', 'cashier'))
        );",
    )
    .execute(pool)
    .await?;

    // ── 3. Suppliers ──────────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS suppliers (
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            phone_number TEXT,
            address      TEXT,
            total_debt   REAL NOT NULL DEFAULT 0.0
        );",
    )
    .execute(pool)
    .await?;

    // ── 4. Customers ──────────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS customers (
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            phone_number TEXT,
            address      TEXT,
            total_debt   REAL NOT NULL DEFAULT 0.0
        );",
    )
    .execute(pool)
    .await?;

    // ── 5. Products (master catalog) ──────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS products (
            id               TEXT PRIMARY KEY,
            name             TEXT NOT NULL,
            product_type     TEXT NOT NULL CHECK(product_type IN ('simple', 'variable')),
            reference        TEXT,
            codebar          TEXT UNIQUE,
            quantity         INTEGER NOT NULL DEFAULT 0,
            product_cost     REAL    NOT NULL DEFAULT 0.0,
            selling_price_1  REAL    NOT NULL DEFAULT 0.0,  -- Retail   (P1)
            selling_price_2  REAL    NOT NULL DEFAULT 0.0,  -- Wholesale (P2)
            selling_price_3  REAL    NOT NULL DEFAULT 0.0,  -- Bulk      (P3)
            selling_price_4  REAL    NOT NULL DEFAULT 0.0,  -- Contract  (P4)
            measurement_unit TEXT    NOT NULL DEFAULT 'pcs',
            category_id      TEXT,
            supplier_id      TEXT,
            image_path       TEXT,
            created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id)  ON DELETE SET NULL
        );",
    )
    .execute(pool)
    .await?;

    // ── 6. Product variants (matrix combinations) ─────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS product_variants (
            id              TEXT PRIMARY KEY,
            product_id      TEXT NOT NULL,
            variant_name    TEXT NOT NULL,
            codebar         TEXT UNIQUE NOT NULL,
            quantity        INTEGER NOT NULL DEFAULT 0,
            product_cost    REAL    NOT NULL DEFAULT 0.0,
            selling_price_1 REAL    NOT NULL DEFAULT 0.0,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    // ── 7. Sales (transaction header) ─────────────────────────────────────────
    //
    //  One row per completed register transaction.
    //
    //  adj_type / adj_value mirror the cartAdjustment in usePosStore:
    //    'discount'  → total = subtotal − adj_value
    //    'surcharge' → total = subtotal + adj_value
    //    'none'      → total = subtotal  (adj_value is 0)
    //
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sales (
            id          TEXT    PRIMARY KEY,

            -- Ownership / context
            user_id     TEXT    NOT NULL,               -- Cashier who processed the sale
            session_id  INTEGER NOT NULL DEFAULT 1,     -- Shift / season (future feature, starts at 1)
            customer_id TEXT,                           -- NULL = anonymous walk-in

            -- Financial summary (denormalised for fast reporting — do not derive from items)
            subtotal    REAL    NOT NULL DEFAULT 0.0,   -- Sum of all line_total before adjustment
            adj_type    TEXT    NOT NULL DEFAULT 'none'
                        CHECK(adj_type IN ('discount', 'surcharge', 'none')),
            adj_value   REAL    NOT NULL DEFAULT 0.0,   -- DA amount of the adjustment
            total       REAL    NOT NULL DEFAULT 0.0,   -- Final amount charged

            -- Lifecycle
            status      TEXT    NOT NULL DEFAULT 'completed'
                        CHECK(status IN ('completed', 'voided', 'returned')),

            -- Audit
            created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)     REFERENCES users(id)     ON DELETE RESTRICT,
            FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
        );"
    ).execute(pool).await?;

    // ── 8. Sale items (line items) ────────────────────────────────────────────
    //
    //  One row per product / variant within a sale.
    //
    //  Prices are SNAPSHOTTED at point-of-sale so that future price changes
    //  do not corrupt historical records. Never JOIN products/variants for
    //  price data on an existing sale — use the snapshot columns instead.
    //
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sale_items (
            id           TEXT PRIMARY KEY,
            sale_id      TEXT NOT NULL,

            -- Product references
            product_id   TEXT NOT NULL,    -- Always set (parent product)
            variant_id   TEXT,             -- Set only for variable-type products

            -- Point-of-sale snapshot (immutable after insert)
            product_name TEXT    NOT NULL,              -- Denormalised display name
            unit         TEXT    NOT NULL DEFAULT 'pcs',
            qty          REAL    NOT NULL DEFAULT 1.0,  -- Decimal for weighted items
            unit_cost    REAL    NOT NULL DEFAULT 0.0,  -- Cost at time of sale (margin calc)
            unit_price   REAL    NOT NULL DEFAULT 0.0,  -- Price actually charged per unit
            line_total   REAL    NOT NULL DEFAULT 0.0,  -- qty × unit_price

            -- Weighted-item flag
            is_weighted  INTEGER NOT NULL DEFAULT 0
                         CHECK(is_weighted IN (0, 1)),  -- 0 = pcs, 1 = kg/g/m etc.

            FOREIGN KEY(sale_id)    REFERENCES sales(id)            ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)         ON DELETE RESTRICT,
            FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
        );",
    )
    .execute(pool)
    .await?;

    // ── Indexes ───────────────────────────────────────────────────────────────

    // sales — session reports (daily / shift)
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sales_session    ON sales(session_id);")
        .execute(pool)
        .await?;

    // sales — per-cashier queries
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sales_user       ON sales(user_id);")
        .execute(pool)
        .await?;

    // sales — customer history & debt reconciliation
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sales_customer   ON sales(customer_id);")
        .execute(pool)
        .await?;

    // sales — date-range filters (dashboard, reports)
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);")
        .execute(pool)
        .await?;

    // sale_items — all items belonging to a sale
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items(sale_id);")
        .execute(pool)
        .await?;

    // sale_items — product sales history
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);")
        .execute(pool)
        .await?;

    Ok(())
}

async fn seed_default_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // ── Categories ────────────────────────────────────────────────────────────
    let cat_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM categories")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    if cat_count == 0 {
        sqlx::query(
            "INSERT INTO categories (id, name, description) VALUES
             (?, ?, ?),
             (?, ?, ?)",
        )
        .bind("cat_1")
        .bind("Footwear / Shoes")
        .bind("Sneakers, casual shoes, and premium leather boots")
        .bind("cat_2")
        .bind("Traditional Clothing")
        .bind("Algerian traditional dresses, accessories, and seasonal items")
        .execute(pool)
        .await?;
        println!("_ Reference Category Segments inserted successfully.");
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    if user_count == 0 {
        let admin_password_hash =
            hash("admin", DEFAULT_COST).map_err(|e| sqlx::Error::Protocol(e.to_string()))?;
        sqlx::query(
            "INSERT INTO users (id, username, password_hash, phone_number, role)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("u1")
        .bind("admin")
        .bind(admin_password_hash)
        .bind("0555000000")
        .bind("admin")
        .execute(pool)
        .await?;
        println!("_ Default account generated cleanly -> Username: admin | Password: admin");
    }

    // ── Suppliers ─────────────────────────────────────────────────────────────
    let supplier_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM suppliers")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    if supplier_count == 0 {
        sqlx::query(
            "INSERT INTO suppliers (id, name, phone_number, address, total_debt)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("s1")
        .bind("El Hamiz Wholesale Center")
        .bind("0555112233")
        .bind("Alger, Centre")
        .bind(45000.0)
        .execute(pool)
        .await?;
        println!("_ Seed supplier linked to primary index registry.");
    }

    // ── Customers ─────────────────────────────────────────────────────────────
    let customer_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM customers")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    if customer_count == 0 {
        sqlx::query(
            "INSERT INTO customers (id, name, phone_number, address, total_debt)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("c1")
        .bind("Amine Belkacem")
        .bind("0666123456")
        .bind("Constantine")
        .bind(2500.0)
        .execute(pool)
        .await?;
        println!("_ Seed customer balance files logged.");
    }

    // ── Products & variants ───────────────────────────────────────────────────
    let prod_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    if prod_count == 0 {
        // Simple product
        sqlx::query(
            "INSERT INTO products
             (id, name, product_type, reference, codebar, quantity,
              product_cost, selling_price_1, selling_price_2, selling_price_3, selling_price_4,
              measurement_unit, category_id, supplier_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("p_simple_1")
        .bind("Air Jordan 1 Low")
        .bind("simple")
        .bind("SKU-AJ1-LOW")
        .bind("6131234567890")
        .bind(12)
        .bind(11000.0)
        .bind(15000.0)
        .bind(14000.0)
        .bind(13500.0)
        .bind(13000.0)
        .bind("pcs")
        .bind("cat_1")
        .bind("s1")
        .execute(pool)
        .await?;

        // Variable product (no direct codebar — variants carry them)
        sqlx::query(
            "INSERT INTO products
             (id, name, product_type, reference, codebar, quantity,
              product_cost, selling_price_1, selling_price_2, selling_price_3, selling_price_4,
              measurement_unit, category_id, supplier_id)
             VALUES (?, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, 'pcs', 'cat_1', 's1')",
        )
        .bind("p_var_1")
        .bind("Premium Suede Loafers")
        .bind("variable")
        .bind("SKU-LOAF-SR")
        .bind(8500.0)
        .bind(12000.0)
        .bind(11000.0)
        .bind(10500.0)
        .bind(10000.0)
        .execute(pool)
        .await?;

        // Variants
        sqlx::query(
            "INSERT INTO product_variants
             (id, product_id, variant_name, codebar, quantity, product_cost, selling_price_1)
             VALUES
             (?, ?, ?, ?, ?, ?, ?),
             (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("v_1")
        .bind("p_var_1")
        .bind("Premium Suede Loafers (41 - Black)")
        .bind("613998877001")
        .bind(5)
        .bind(8500.0)
        .bind(12000.0)
        .bind("v_2")
        .bind("p_var_1")
        .bind("Premium Suede Loafers (42 - Black)")
        .bind("613998877002")
        .bind(8)
        .bind(8500.0)
        .bind(12000.0)
        .execute(pool)
        .await?;

        println!("_ Seed products alongside target variation components generated perfectly.");
    }

    Ok(())
}
