use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use bcrypt::{hash, DEFAULT_COST};
use sqlx::Row;

#[derive(serde::Serialize)]
pub struct StaffUser {
    pub id: String,
    pub username: String,
    pub phone_number: Option<String>,
    pub role: String,
}

#[derive(serde::Deserialize)]
pub struct CreateStaffPayload {
    pub username: String,
    pub password: String,
    pub phone_number: Option<String>,
    pub role: String,
}

#[derive(serde::Deserialize)]
pub struct UpdateStaffPayload {
    pub username: String,
    pub password: Option<String>, // Optional: Only update hash if changed
    pub phone_number: Option<String>,
    pub role: String,
}

/// GET /api/staff - List all staff registry files
pub async fn get_staff(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let rows_result = sqlx::query("SELECT id, username, phone_number, role FROM users")
        .fetch_all(&state.db)
        .await;

    match rows_result {
        Ok(rows) => {
            let staff: Vec<StaffUser> = rows.iter().map(|row| StaffUser {
                id: row.get("id"),
                username: row.get("username"),
                phone_number: row.get("phone_number"),
                role: row.get("role"),
            }).collect();
            
            (StatusCode::OK, Json(staff)).into_response()
        }
        Err(e) => {
            println!("❌ Database read failure: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load staff files").into_response()
        }
    }
}

/// POST /api/staff - Provision a new operator profile
pub async fn create_staff(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateStaffPayload>,
) -> impl IntoResponse {
    // Basic validation
    if payload.role != "admin" && payload.role != "cashier" {
        return (StatusCode::BAD_REQUEST, "Invalid privilege context role").into_response();
    }

    // Generate password hash
    let password_hash = match hash(&payload.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Encryption routine failed").into_response(),
    };

    // Generate a unique ID (Using a millisecond timestamp as a clean fallback)
    let generated_id = format!("u_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis());

    let insert_result = sqlx::query(
        "INSERT INTO users (id, username, password_hash, phone_number, role) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&generated_id)
    .bind(&payload.username)
    .bind(password_hash)
    .bind(&payload.phone_number)
    .bind(&payload.role)
    .execute(&state.db)
    .await;

    match insert_result {
        Ok(_) => (StatusCode::CREATED, Json(serde_json::json!({ "id": generated_id, "status": "success" }))).into_response(),
        Err(e) => {
            println!("❌ Operator generation failed: {}", e);
            (StatusCode::BAD_REQUEST, "Username already assigned or malformed dynamic input").into_response()
        }
    }
}

/// PUT /api/staff/:id - Modify profile parameters
pub async fn update_staff(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateStaffPayload>,
) -> impl IntoResponse {
    if payload.role != "admin" && payload.role != "cashier" {
        return (StatusCode::BAD_REQUEST, "Invalid profile role assignment").into_response();
    }

    if let Some(ref new_password) = payload.password {
        // Changing password along with metrics
        let password_hash = match hash(new_password, DEFAULT_COST) {
            Ok(h) => h,
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Encryption failure").into_response(),
        };

        let result = sqlx::query(
            "UPDATE users SET username = ?, password_hash = ?, phone_number = ?, role = ? WHERE id = ?"
        )
        .bind(&payload.username)
        .bind(password_hash)
        .bind(&payload.phone_number)
        .bind(&payload.role)
        .bind(&id)
        .execute(&state.db)
        .await;

        if result.is_err() { return (StatusCode::INTERNAL_SERVER_ERROR, "Profile alteration failed").into_response(); }
    } else {
        // Keep existing password, update structural fields only
        let result = sqlx::query(
            "UPDATE users SET username = ?, phone_number = ?, role = ? WHERE id = ?"
        )
        .bind(&payload.username)
        .bind(&payload.phone_number)
        .bind(&payload.role)
        .bind(&id)
        .execute(&state.db)
        .await;

        if result.is_err() { return (StatusCode::INTERNAL_SERVER_ERROR, "Profile alteration failed").into_response(); }
    }

    (StatusCode::OK, "Profile committed successfully").into_response()
}

/// DELETE /api/staff/:id - Remove system authorization keys
pub async fn delete_staff(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // Safety lock: Prevent deleting the root administrator account to prevent softlocks
    if id == "u1" {
        return (StatusCode::FORBIDDEN, "Root architecture operator cannot be purged").into_response();
    }

    match sqlx::query("DELETE FROM users WHERE id = ?").bind(&id).execute(&state.db).await {
        Ok(res) if res.rows_affected() > 0 => (StatusCode::OK, "Access privileges purged").into_response(),
        Ok(_) => (StatusCode::NOT_FOUND, "Target profile not located").into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database deletion operation failed").into_response(),
    }
}