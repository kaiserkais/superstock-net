use sqlx::SqlitePool;

pub async fn create_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // ── Products (master catalog) ──────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS products (
            id               TEXT PRIMARY KEY,
            name             TEXT NOT NULL,
            product_type     TEXT NOT NULL CHECK(product_type IN ('simple', 'variable')),
            reference        TEXT,
            codebar          TEXT UNIQUE,
            quantity         REAL NOT NULL DEFAULT 0.0,
            product_cost     REAL    NOT NULL DEFAULT 0.0,
            selling_price_1  REAL    NOT NULL DEFAULT 0.0,
            selling_price_2  REAL    NOT NULL DEFAULT 0.0,
            selling_price_3  REAL    NOT NULL DEFAULT 0.0,
            selling_price_4  REAL    NOT NULL DEFAULT 0.0,
            measurement_unit TEXT    NOT NULL DEFAULT 'pcs',
            category_id      TEXT,
            supplier_id      TEXT,
            image_path       TEXT,
            is_archived      INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0, 1)),
            created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id)  ON DELETE SET NULL
        );",
    )
    .execute(pool)
    .await?;

    // ── Product variants (matrix combinations) ─────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS product_variants (
            id              TEXT PRIMARY KEY,
            product_id      TEXT NOT NULL,
            variant_name    TEXT NOT NULL,
            codebar         TEXT UNIQUE NOT NULL,
            quantity        REAL NOT NULL DEFAULT 0.0,
            product_cost    REAL    NOT NULL DEFAULT 0.0,
            selling_price_1 REAL    NOT NULL DEFAULT 0.0,
            is_archived     INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0, 1)),
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn seed_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if count == 0 {
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

        // Variable product
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