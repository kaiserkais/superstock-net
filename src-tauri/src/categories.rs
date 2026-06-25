use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::Row;
use std::sync::Arc;

// ─── DATA MODELS ──────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct CategoryOut {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub product_count: i32, // Dynamically computed from relations
}

#[derive(serde::Deserialize)]
pub struct CategoryInput {
    pub name: String,
    pub description: Option<String>, // Can be null/None from frontend
}

// ─── ROUTE HANDLERS ──────────────────────────────────────────────────────

/// GET /api/categories - Lists all categories along with their current product count
pub async fn get_categories(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    // Left join ensures categories with 0 products are still listed correctly
    let query_str = "
        SELECT 
            c.id, 
            c.name, 
            c.description, 
            COUNT(p.id) as product_count 
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
    ";

    let rows_result = sqlx::query(query_str)
        .fetch_all(&state.db)
        .await;

    let rows = match rows_result {
        Ok(r) => r,
        Err(e) => {
            println!("❌ Database read failure on categories registry: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to fetch categories list",
            )
                .into_response();
        }
    };

    let mut categories_list = Vec::new();
    for row in rows {
        let desc: Option<String> = row.get("description");
        // Ensure empty strings from frontend or DB are treated as None consistently
        let clean_desc = desc.and_then(|d| if d.trim().is_empty() { None } else { Some(d) });

        categories_list.push(CategoryOut {
            id: row.get("id"),
            name: row.get("name"),
            description: clean_desc,
            product_count: row.get("product_count"),
        });
    }

    (StatusCode::OK, Json(categories_list)).into_response()
}

/// POST /api/categories - Register a new inventory category segment
pub async fn create_category(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CategoryInput>,
) -> impl IntoResponse {
    if payload.name.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, "Category name cannot be empty").into_response();
    }

    // Generate a unique token tracking identifier using epoch microseconds
    let current_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros();
    let generated_id = format!("cat_{}", current_timestamp);

    let clean_desc = payload.description.and_then(|d| if d.trim().is_empty() { None } else { Some(d) });

    let insert_result = sqlx::query(
        "INSERT INTO categories (id, name, description) VALUES (?, ?, ?)"
    )
    .bind(&generated_id)
    .bind(payload.name.trim())
    .bind(clean_desc)
    .execute(&state.db)
    .await;

    match insert_result {
        Ok(_) => {
            println!("✅ Category structure registered safely: {}", generated_id);
            (
                StatusCode::CREATED,
                Json(serde_json::json!({ "id": generated_id, "status": "created" })),
            )
                .into_response()
        }
        Err(e) => {
            println!("❌ Failed to write new category segment: {}", e);
            // Check for SQLite UNIQUE constraint violation
            if e.to_string().contains("UNIQUE constraint failed") {
                return (
                    StatusCode::BAD_REQUEST,
                    "A category with this exact name already exists",
                )
                    .into_response();
            }
            (StatusCode::INTERNAL_SERVER_ERROR, "Database assignment failed").into_response()
        }
    }
}

/// PUT /api/categories/:id - Update an existing category details
pub async fn edit_category(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<CategoryInput>,
) -> impl IntoResponse {
    if payload.name.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, "Category name cannot be empty").into_response();
    }

    let clean_desc = payload.description.and_then(|d| if d.trim().is_empty() { None } else { Some(d) });

    let update_result = sqlx::query(
        "UPDATE categories SET name = ?, description = ? WHERE id = ?"
    )
    .bind(payload.name.trim())
    .bind(clean_desc)
    .bind(&id)
    .execute(&state.db)
    .await;

    match update_result {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return (StatusCode::NOT_FOUND, "Target category asset not found").into_response();
            }
            println!("📝 Category record modifications committed: {}", id);
            (
                StatusCode::OK,
                Json(serde_json::json!({ "id": id, "status": "updated" })),
            )
                .into_response()
        }
        Err(e) => {
            println!("❌ Failed to modify category properties: {}", e);
            if e.to_string().contains("UNIQUE constraint failed") {
                return (
                    StatusCode::BAD_REQUEST,
                    "Another category is already using that name",
                )
                    .into_response();
            }
            (StatusCode::INTERNAL_SERVER_ERROR, "Database modify operation dropped").into_response()
        }
    }
}

/// DELETE /api/categories/:id - Safely evict a category profile from registry index
pub async fn delete_category(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // Note: Due to your `ON DELETE SET NULL` constraint on the products table schema,
    // any products linked to this category will automatically have their category_id safely set to null.
    let delete_result = sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await;

    match delete_result {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return StatusCode::NOT_FOUND.into_response();
            }
            println!("🗑️ Category mapping matrix detached and removed: {}", id);
            StatusCode::NO_CONTENT.into_response()
        }
        Err(e) => {
            println!("❌ Database failed to drop category record line: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to execute cascade record purge",
            )
                .into_response()
        }
    }
}