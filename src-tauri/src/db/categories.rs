use sqlx::SqlitePool;

pub async fn create_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS categories (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL UNIQUE,
            description TEXT
        );",
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn seed_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM categories")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if count == 0 {
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
    Ok(())
}