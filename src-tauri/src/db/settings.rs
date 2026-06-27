use sqlx::SqlitePool;

pub async fn create_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS settings (
            -- Enforces a single row in the database (id must always be 1)
            id                          INTEGER PRIMARY KEY CHECK (id = 1),
            store_name                  TEXT NOT NULL,
            welcome_message             TEXT,
            thank_you_message           TEXT,
            
            -- Receipt Printer Configurations
            receipt_printer_name        TEXT,
            receipt_paper_size          TEXT NOT NULL CHECK(receipt_paper_size IN ('Mm58', 'Mm80')),
            
            -- Invoice Printer Configurations
            invoice_printer_name        TEXT,
            invoice_paper_size          TEXT NOT NULL CHECK(invoice_paper_size IN ('A4', 'A5')),
            
            -- Barcode Printer Configurations
            barcode_printer_name        TEXT,
            barcode_paper_dimension     TEXT NOT NULL CHECK(barcode_paper_dimension IN ('45mm x 35mm', '40mm x 20mm')),
            
            -- Core Operational Toggles (SQLite treats 0 as false, 1 as true)
            print_receipt_on_sale       INTEGER NOT NULL DEFAULT 1 CHECK(print_receipt_on_sale IN (0, 1)),
            tax_percentage              REAL NOT NULL DEFAULT 0.0,
            balance_prefix              TEXT NOT NULL DEFAULT '21',
            automatic_backup            INTEGER NOT NULL DEFAULT 1 CHECK(automatic_backup IN (0, 1))
        );",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn seed_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM settings")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    // If no settings profile exists, populate the registry with factory defaults
    if count == 0 {
        sqlx::query(
            "INSERT INTO settings (
                id, store_name, welcome_message, thank_you_message,
                receipt_printer_name, receipt_paper_size,
                invoice_printer_name, invoice_paper_size,
                barcode_printer_name, barcode_paper_dimension,
                print_receipt_on_sale, tax_percentage, balance_prefix, automatic_backup
             ) VALUES (
                1, ?, ?, ?,
                NULL, 'Mm80',
                NULL, 'A4',
                NULL, '40mm x 20mm',
                1, 0.0, '21', 1
             );",
        )
        .bind("SuperStock")
        .bind("Welcome to our store")
        .bind("Thank you for your visit!")
        .execute(pool)
        .await?;

        println!("_ Base application settings engine records seeded successfully.");
    }
    Ok(())
}