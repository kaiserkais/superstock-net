use sqlx::SqlitePool;

pub async fn create_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {
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
    Ok(())
}

pub async fn seed_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM customers")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if count == 0 {
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
    Ok(())
}