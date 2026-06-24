use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use bcrypt::verify;
use sqlx::Row;
use crate::AppState;

#[derive(serde::Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(serde::Serialize)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub phone_number: Option<String>,
    pub role: String,
}

#[derive(serde::Serialize)]
pub struct LoginResponse {
    pub status: String,
    pub user: UserProfile,
}

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    
    // Trim input defensively to catch unintended spaces
    let username = payload.username.trim();
    let password = &payload.password;

    println!("🔑 [Login Attempt] Username: '{}' | Password length: {}", username, password.len());

    // Query user profile securely from SQLite
    let row = sqlx::query("SELECT id, username, password_hash, phone_number, role FROM users WHERE username = ?")
        .bind(username)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            println!("❌ [DB Error] Failed during credential check: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if let Some(user_row) = row {
        let db_username: String = user_row.get("username");
        let password_hash: String = user_row.get("password_hash");
        
        println!("🔍 [User Found] Matches DB record: '{}'. Testing cryptographic hash consistency...", db_username);
        
        // Verify incoming plain password against database bcrypt hash string
        match verify(password, &password_hash) {
            Ok(true) => {
                println!("✅ [Success] Password matched for user: '{}'", username);
                let profile = UserProfile {
                    id: user_row.get::<String, _>("id"),
                    username: db_username,
                    phone_number: user_row.get::<Option<String>, _>("phone_number"),
                    role: user_row.get::<String, _>("role"),
                };

                return Ok(Json(LoginResponse {
                    status: "success".to_string(),
                    user: profile,
                }));
            }
            Ok(false) => {
                println!("❌ [Failed] Cryptographic password mismatch for user: '{}'", username);
            }
            Err(e) => {
                println!("❌ [Bcrypt Error] Verification crashed: {}", e);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, "Crypto verification engine error".to_string()));
            }
        }
    } else {
        println!("❌ [Failed] Username '{}' does not exist in the database table.", username);
    }

    Err((StatusCode::UNAUTHORIZED, "Invalid username or password".to_string()))
}