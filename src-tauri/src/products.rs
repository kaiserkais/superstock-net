use crate::AppState;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use sqlx::Row;
use std::sync::Arc;

// Import the Axum multipart extractor
use axum::extract::Multipart;
use axum::extract::Path;

// ─── SERIALIZATION STRUCTS FOR JSON OUTPUTS ──────────────────────────────

#[derive(serde::Serialize)]
pub struct ProductVariantOut {
    pub id: String,
    pub variant_name: String,
    pub codebar: String,
    pub quantity: i32,
    pub product_cost: f64,
    pub selling_price_1: f64,
}

#[derive(serde::Serialize)]
pub struct ProductOut {
    pub id: String,
    pub name: String,
    pub product_type: String,
    pub reference: Option<String>,
    pub codebar: Option<String>,
    pub quantity: i32,
    pub product_cost: f64,
    pub selling_price_1: f64,
    pub selling_price_2: f64,
    pub selling_price_3: f64,
    pub selling_price_4: f64,
    pub measurement_unit: String,
    pub category_id: Option<String>,
    pub supplier_id: Option<String>,
    pub image_path: Option<String>,
    pub variants: Vec<ProductVariantOut>,
}

// ─── DESERIALIZATION STRUCTS FOR FRONTEND PAYLOADS ────────────────────────

#[derive(serde::Deserialize)]
pub struct VariantInput {
    pub variant_name: String,
    pub codebar: String,
    pub product_cost: String,
    pub selling_price_1: String,
    pub quantity: String,
}

// ─── ROUTE HANDLERS ──────────────────────────────────────────────────────
/// PUT /api/products/:id - Update an existing product asset alongside its variations matrix
pub async fn edit_product(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut name = String::new();
    let mut product_type = String::from("simple");
    let mut reference: Option<String> = None;
    let mut codebar: Option<String> = None;
    let mut quantity: Option<String> = None;
    let mut product_cost = String::from("0");
    let mut selling_price_1 = String::from("0");
    let mut selling_price_2 = String::from("0");
    let mut selling_price_3 = String::from("0");
    let mut selling_price_4 = String::from("0");
    let mut measurement_unit = String::from("pcs");
    let mut category_id = String::new();
    let mut supplier_id = String::new();
    let mut variations_raw: Option<String> = None;

    let mut image_bytes: Option<Vec<u8>> = None;
    let mut image_ext = String::from("jpg");

    // Loop through streaming data fields sequentially
    while let Ok(Some(field)) = multipart.next_field().await {
        let field_name = match field.name() {
            Some(n) => n.to_string(),
            None => continue,
        };

        if field_name == "image" {
            let filename = field.file_name().unwrap_or("image.jpg").to_string();
            image_ext = std::path::Path::new(&filename)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("jpg")
                .to_string();

            if let Ok(bytes) = field.bytes().await {
                if !bytes.is_empty() {
                    image_bytes = Some(bytes.to_vec());
                }
            }
        } else if let Ok(text_value) = field.text().await {
            match field_name.as_str() {
                "name" => name = text_value,
                "product_type" => product_type = text_value,
                "reference" => reference = if text_value.trim().is_empty() { None } else { Some(text_value) },
                "codebar" => codebar = if text_value.trim().is_empty() { None } else { Some(text_value) },
                "quantity" => quantity = Some(text_value),
                "product_cost" => product_cost = text_value,
                "selling_price_1" => selling_price_1 = text_value,
                "selling_price_2" => selling_price_2 = text_value,
                "selling_price_3" => selling_price_3 = text_value,
                "selling_price_4" => selling_price_4 = text_value,
                "measurement_unit" => measurement_unit = text_value,
                "category_id" => category_id = text_value,
                "supplier_id" => supplier_id = text_value,
                "variations" => variations_raw = Some(text_value),
                _ => {}
            }
        }
    }

    let cost: f64 = product_cost.parse().unwrap_or(0.0);
    let p1: f64 = selling_price_1.parse().unwrap_or(0.0);
    let p2: f64 = selling_price_2.parse().unwrap_or(0.0);
    let p3: f64 = selling_price_3.parse().unwrap_or(0.0);
    let p4: f64 = selling_price_4.parse().unwrap_or(0.0);
    let base_qty: i32 = quantity.and_then(|q| q.parse().ok()).unwrap_or(0);

    // Process new image stream if provided
    let mut final_image_path: Option<String> = None;
    if let Some(bytes) = image_bytes {
        let base_dir = match std::env::var("APPDATA") {
            Ok(path) => std::path::PathBuf::from(path).join("SuperStock"),
            Err(_) => {
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                std::path::PathBuf::from(home).join(".local").join("share").join("SuperStock")
            }
        };
        let target_dir = base_dir.join("product_images");

        if tokio::fs::create_dir_all(&target_dir).await.is_ok() {
            let file_name = format!("{}.{}", id, image_ext);
            let absolute_filepath = target_dir.join(&file_name);
            if tokio::fs::write(&absolute_filepath, bytes).await.is_ok() {
                final_image_path = Some(file_name);
            }
        }
    }

    let mut tx = match state.db.begin().await {
        Ok(transaction) => transaction,
        Err(e) => {
            println!("❌ Failed to open database transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Transaction failure").into_response();
        }
    };

    // Step A: Update Parent Registry Row
    let update_parent_result = if let Some(img_path) = final_image_path {
        sqlx::query(
            "UPDATE products SET name = ?, product_type = ?, reference = ?, codebar = ?, quantity = ?, \
             product_cost = ?, selling_price_1 = ?, selling_price_2 = ?, selling_price_3 = ?, selling_price_4 = ?, \
             measurement_unit = ?, category_id = ?, supplier_id = ?, image_path = ? WHERE id = ?"
        )
        .bind(&name).bind(&product_type).bind(&reference)
        .bind(codebar.clone()) //leave main codebar was like this if product_type == "simple" { codebar.clone() } else { None }
        .bind(if product_type == "simple" { base_qty } else { 0 })
        .bind(cost).bind(p1).bind(p2).bind(p3).bind(p4)
        .bind(&measurement_unit).bind(&category_id).bind(&supplier_id)
        .bind(img_path).bind(&id)
        .execute(&mut *tx)
        .await
    } else {
        sqlx::query(
            "UPDATE products SET name = ?, product_type = ?, reference = ?, codebar = ?, quantity = ?, \
             product_cost = ?, selling_price_1 = ?, selling_price_2 = ?, selling_price_3 = ?, selling_price_4 = ?, \
             measurement_unit = ?, category_id = ?, supplier_id = ? WHERE id = ?"
        )
        .bind(&name).bind(&product_type).bind(&reference)
        .bind(codebar.clone()) // leave main code bar was like this if product_type == "simple" { codebar.clone() } else { None }
        .bind(if product_type == "simple" { base_qty } else { 0 })
        .bind(cost).bind(p1).bind(p2).bind(p3).bind(p4)
        .bind(&measurement_unit).bind(&category_id).bind(&supplier_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
    };

    if let Err(e) = update_parent_result {
        println!("❌ Master record modification rejected: {}", e);
        return (StatusCode::BAD_REQUEST, "Database update rejected").into_response();
    }

    // Step B: Clear old variants to rewrite updated layout
    if let Err(e) = sqlx::query("DELETE FROM product_variants WHERE product_id = ?").bind(&id).execute(&mut *tx).await {
        println!("❌ Failed to prune historical combination rows: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Variant sync failure").into_response();
    }

    // Step C: Write Fresh Matrix Variations (Only if 'variable')
    if product_type == "variable" {
        if let Some(raw_json_str) = variations_raw {
            if let Ok(variations_list) = serde_json::from_str::<Vec<VariantInput>>(&raw_json_str) {
                let current_timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_micros();
                for (idx, var) in variations_list.iter().enumerate() {
                    let generated_variant_id = format!("v_{}_{}", current_timestamp, idx);
                    let v_cost: f64 = var.product_cost.parse().unwrap_or(cost);
                    let v_p1: f64 = var.selling_price_1.parse().unwrap_or(p1);
                    let v_qty: i32 = var.quantity.parse().unwrap_or(0);

                    let insert_var_result = sqlx::query(
                        "INSERT INTO product_variants (id, product_id, variant_name, codebar, quantity, product_cost, selling_price_1) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    )
                    .bind(generated_variant_id).bind(&id).bind(&var.variant_name).bind(&var.codebar).bind(v_qty).bind(v_cost).bind(v_p1)
                    .execute(&mut *tx)
                    .await;

                    if let Err(e) = insert_var_result {
                        println!("❌ Combinatorial matrix write interrupted: {}", e);
                        return (StatusCode::BAD_REQUEST, "Combination model contains an identical codebar constraint").into_response();
                    }
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        println!("❌ Transaction confirmation collapsed: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Storage write checkpoint dropped").into_response();
    }

    (StatusCode::OK, Json(serde_json::json!({ "id": id, "status": "updated" }))).into_response()
}
/// GET /api/products - Lists all catalog products alongside nested child combinations
pub async fn get_products(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let prod_rows_result = sqlx::query(
        "SELECT id, name, product_type, reference, codebar, quantity, product_cost, \
                selling_price_1, selling_price_2, selling_price_3, selling_price_4, \
                measurement_unit, category_id, supplier_id, image_path FROM products", // 👈 Added image_path here
    )
    .fetch_all(&state.db)
    .await;

    let prod_rows = match prod_rows_result {
        Ok(rows) => rows,
        Err(e) => {
            println!("❌ Database read failure on products catalog: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load master products").into_response();
        }
    };

    let var_rows_result = sqlx::query(
        "SELECT id, product_id, variant_name, codebar, quantity, product_cost, selling_price_1 FROM product_variants"
    )
    .fetch_all(&state.db)
    .await;

    let var_rows = match var_rows_result {
        Ok(rows) => rows,
        Err(e) => {
            println!("❌ Database read failure on variations matrix: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to load variant matrices").into_response();
        }
    };

    let mut catalog: Vec<ProductOut> = Vec::new();

    for p_row in prod_rows {
        let p_id: String = p_row.get("id");
        let mut attached_variants = Vec::new();

        for v_row in &var_rows {
            let parent_link: String = v_row.get("product_id");
            if parent_link == p_id {
                attached_variants.push(ProductVariantOut {
                    id: v_row.get("id"),
                    variant_name: v_row.get("variant_name"),
                    codebar: v_row.get("codebar"),
                    quantity: v_row.get("quantity"),
                    product_cost: v_row.get("product_cost"),
                    selling_price_1: v_row.get("selling_price_1"),
                });
            }
        }

        catalog.push(ProductOut {
            id: p_id,
            name: p_row.get("name"),
            product_type: p_row.get("product_type"),
            reference: p_row.get("reference"),
            codebar: p_row.get("codebar"),
            quantity: p_row.get("quantity"),
            product_cost: p_row.get("product_cost"),
            selling_price_1: p_row.get("selling_price_1"),
            selling_price_2: p_row.get("selling_price_2"),
            selling_price_3: p_row.get("selling_price_3"),
            selling_price_4: p_row.get("selling_price_4"),
            measurement_unit: p_row.get("measurement_unit"),
            category_id: p_row.get("category_id"),
            supplier_id: p_row.get("supplier_id"),
            image_path: p_row.get("image_path"), // 👈 Add this mapping here!
            variants: attached_variants,
        });
    }

    (StatusCode::OK, Json(catalog)).into_response()
}

/// POST /api/products - Provision a new asset file via multipart binary streams
pub async fn create_product(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    // Core structural variable placeholders
    let mut name = String::new();
    let mut product_type = String::from("simple");
    let mut reference: Option<String> = None;
    let mut codebar: Option<String> = None;
    let mut quantity: Option<String> = None;
    let mut product_cost = String::from("0");
    let mut selling_price_1 = String::from("0");
    let mut selling_price_2 = String::from("0");
    let mut selling_price_3 = String::from("0");
    let mut selling_price_4 = String::from("0");
    let mut measurement_unit = String::from("pcs");
    let mut category_id = String::new();
    let mut supplier_id = String::new();
    let mut variations_raw: Option<String> = None;

    // Binary memory block targets for processing incoming files
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut image_ext = String::from("jpg");

    // Loop through streaming data fields sequentially
    while let Ok(Some(field)) = multipart.next_field().await {
        let field_name = match field.name() {
            Some(n) => n.to_string(),
            None => continue,
        };

        if field_name == "image" {
            let filename = field.file_name().unwrap_or("image.jpg").to_string();
            image_ext = std::path::Path::new(&filename)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("jpg")
                .to_string();

            if let Ok(bytes) = field.bytes().await {
                if !bytes.is_empty() {
                    image_bytes = Some(bytes.to_vec());
                }
            }
        } else if let Ok(text_value) = field.text().await {
            match field_name.as_str() {
                "name" => name = text_value,
                "product_type" => product_type = text_value,
                "reference" => {
                    reference = if text_value.trim().is_empty() {
                        None
                    } else {
                        Some(text_value)
                    }
                }
                "codebar" => {
                    codebar = if text_value.trim().is_empty() {
                        None
                    } else {
                        Some(text_value)
                    }
                }
                "quantity" => quantity = Some(text_value),
                "product_cost" => product_cost = text_value,
                "selling_price_1" => selling_price_1 = text_value,
                "selling_price_2" => selling_price_2 = text_value,
                "selling_price_3" => selling_price_3 = text_value,
                "selling_price_4" => selling_price_4 = text_value,
                "measurement_unit" => measurement_unit = text_value,
                "category_id" => category_id = text_value,
                "supplier_id" => supplier_id = text_value,
                "variations" => variations_raw = Some(text_value),
                _ => {}
            }
        }
    }

    if product_type != "simple" && product_type != "variable" {
        return (
            StatusCode::BAD_REQUEST,
            "Invalid structural paradigm constraint",
        )
            .into_response();
    }

    let cost: f64 = product_cost.parse().unwrap_or(0.0);
    let p1: f64 = selling_price_1.parse().unwrap_or(0.0);
    let p2: f64 = selling_price_2.parse().unwrap_or(0.0);
    let p3: f64 = selling_price_3.parse().unwrap_or(0.0);
    let p4: f64 = selling_price_4.parse().unwrap_or(0.0);

    let base_qty: i32 = match &quantity {
        Some(qty_str) => qty_str.parse().unwrap_or(0),
        None => 0,
    };

    let current_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros();
    let generated_product_id = format!("p_{}", current_timestamp);

    // ─── STREAM RAW BINARY TO NATIVE SYSTEM STORAGE ───────────────────────
    let mut final_image_path: Option<String> = None;

    if let Some(bytes) = image_bytes {
        // 1. Resolve platform-specific safe system data path
        let base_dir = match std::env::var("APPDATA") {
            Ok(path) => std::path::PathBuf::from(path).join("SuperStock"),
            Err(_) => {
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                std::path::PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("SuperStock")
            }
        };

        let target_dir = base_dir.join("product_images");

        // 2. Safely create directories outside the development workspace
        if tokio::fs::create_dir_all(&target_dir).await.is_ok() {
            let file_name = format!("{}.{}", generated_product_id, image_ext);
            let absolute_filepath = target_dir.join(&file_name);

            // 3. Write raw bytes securely to permanent system disk
            if tokio::fs::write(&absolute_filepath, bytes).await.is_ok() {
                // 💡 TIP: Save ONLY the clean filename in the database.
                // This prevents hardcoding strict system paths into your DB data rows.
                final_image_path = Some(file_name);
            }
        }
    }

    let mut tx = match state.db.begin().await {
        Ok(transaction) => transaction,
        Err(e) => {
            println!("❌ Failed to open database transaction: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Transaction failure").into_response();
        }
    };

    // Step A: Write Parent Registry Row (binding our clean file path string)
    let insert_parent_result = sqlx::query(
        "INSERT INTO products (
            id, name, product_type, reference, codebar, quantity, 
            product_cost, selling_price_1, selling_price_2, selling_price_3, selling_price_4, 
            measurement_unit, category_id, supplier_id, image_path
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&generated_product_id)
    .bind(&name)
    .bind(&product_type)
    .bind(&reference)
    .bind(if product_type == "simple" {
        codebar.clone()
    } else {
        None
    })
    .bind(if product_type == "simple" {
        base_qty
    } else {
        0
    })
    .bind(cost)
    .bind(p1)
    .bind(p2)
    .bind(p3)
    .bind(p4)
    .bind(&measurement_unit)
    .bind(&category_id)
    .bind(&supplier_id)
    .bind(final_image_path) // Saves as lightweight text path e.g. "appdata/product_images/p_12.jpg"
    .execute(&mut *tx)
    .await;

    if let Err(e) = insert_parent_result {
        println!("❌ Master record assignment rejected: {}", e);
        return (
            StatusCode::BAD_REQUEST,
            "Duplicate barcode key or malformed taxonomy reference",
        )
            .into_response();
    }

    // Step B: Loop and Process Matrix Variations (Only if 'variable')
    if product_type == "variable" {
        if let Some(raw_json_str) = variations_raw {
            if let Ok(variations_list) = serde_json::from_str::<Vec<VariantInput>>(&raw_json_str) {
                for (idx, var) in variations_list.iter().enumerate() {
                    let generated_variant_id = format!("v_{}_{}", current_timestamp, idx);
                    let v_cost: f64 = var.product_cost.parse().unwrap_or(cost);
                    let v_p1: f64 = var.selling_price_1.parse().unwrap_or(p1);
                    let v_qty: i32 = var.quantity.parse().unwrap_or(0);

                    let insert_var_result = sqlx::query(
                        "INSERT INTO product_variants (
                            id, product_id, variant_name, codebar, quantity, product_cost, selling_price_1
                         ) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    )
                    .bind(generated_variant_id)
                    .bind(&generated_product_id)
                    .bind(&var.variant_name)
                    .bind(&var.codebar)
                    .bind(v_qty)
                    .bind(v_cost)
                    .bind(v_p1)
                    .execute(&mut *tx)
                    .await;

                    if let Err(e) = insert_var_result {
                        println!("❌ Combinatorial matrix write interrupted: {}", e);
                        return (
                            StatusCode::BAD_REQUEST,
                            "Combination sub-model contains a duplicate barcode",
                        )
                            .into_response();
                    }
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        println!("❌ Transaction confirmation collapsed: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Storage write checkpoint dropped",
        )
            .into_response();
    }

    (
        StatusCode::CREATED,
        Json(serde_json::json!({ "id": generated_product_id, "status": "success" })),
    )
        .into_response()
}
