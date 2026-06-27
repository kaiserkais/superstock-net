use sqlx::SqlitePool;

pub async fn create_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {
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
    Ok(())
}

pub async fn seed_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM suppliers")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if count == 0 {
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
    Ok(())
}