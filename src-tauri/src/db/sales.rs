use sqlx::SqlitePool;

pub async fn create_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // ── Sales (transaction header) ─────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sales (
            id          TEXT    PRIMARY KEY,
            user_id     TEXT    NOT NULL,
            session_id  INTEGER NOT NULL DEFAULT 1,
            customer_id TEXT,
            subtotal    REAL    NOT NULL DEFAULT 0.0,
            adj_type    TEXT    NOT NULL DEFAULT 'none' CHECK(adj_type IN ('discount', 'surcharge', 'none')),
            adj_value   REAL    NOT NULL DEFAULT 0.0,
            total       REAL    NOT NULL DEFAULT 0.0,
            status      TEXT    NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'voided', 'returned')),
            created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id)     REFERENCES users(id)     ON DELETE RESTRICT,
            FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
        );",
    )
    .execute(pool)
    .await?;

    // ── Sale items (line items with Snapshotting Engine) ───────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sale_items (
            id           TEXT PRIMARY KEY,
            sale_id      TEXT NOT NULL,
            product_id   TEXT, 
            variant_id   TEXT, 
            product_name TEXT    NOT NULL,
            variant_name TEXT,
            codebar      TEXT,
            unit         TEXT    NOT NULL DEFAULT 'pcs',
            qty          REAL    NOT NULL DEFAULT 1.0,  
            unit_cost    REAL    NOT NULL DEFAULT 0.0,
            unit_price   REAL    NOT NULL DEFAULT 0.0,
            line_total   REAL    NOT NULL DEFAULT 0.0,
            is_weighted  INTEGER NOT NULL DEFAULT 0 CHECK(is_weighted IN (0, 1)),
            FOREIGN KEY(sale_id)    REFERENCES sales(id)            ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)         ON DELETE SET NULL,
            FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
        );",
    )
    .execute(pool)
    .await?;

    // ── Indexes ───────────────────────────────────────────────────────────────
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sales_session     ON sales(session_id);").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sales_user        ON sales(user_id);").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sales_customer    ON sales(customer_id);").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sales_created_at  ON sales(created_at);").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sale_items_sale   ON sale_items(sale_id);").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);").execute(pool).await?;

    Ok(())
}

pub async fn seed_data(_pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Left intentionally available for feature logging symmetry
    Ok(())
}