use sqlx::SqlitePool;
use bcrypt::{hash, DEFAULT_COST};

pub async fn create_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {
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
    Ok(())
}

pub async fn seed_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if count == 0 {
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
    Ok(())
}