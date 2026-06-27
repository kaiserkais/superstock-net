import { print_thermal_printer } from "tauri-plugin-thermal-printer";

/**
 * Standardizes default typographic configurations to reduce structural boilerplate
 */
const makeStyle = (overrides = {}) => ({
  bold: false,
  underline: false,
  align: "left",
  italic: false,
  invert: false,
  font: "A",
  rotate: false,
  upside_down: false,
  size: "normal",
  ...overrides,
});

export const printRepository = {
  /**
   * Transforms invoice transaction objects into structured thermal sections and spools to native hardware
   * @param {Object} sale - Core invoice configuration data block from API
   * @param {Object} settings - Global Zustand system settings application state context
   */
  printInvoiceReceipt: async (sale, settings) => {
    if (!settings.receipt_printer_name) {
      throw new Error("No system printer assigned! Please update configurations in Settings.");
    }

    // Direct assignment now that your database stores 'Mm58' or 'Mm80' cleanly!
    const paperSize = settings.receipt_paper_size || "Mm80"; 
    
    // ─── MATHEMATICAL GRID VALIDATION ───
    // The sum of column_widths must absolutely equal the paper's line character limit.
    let itemColumnWidths = [26, 6, 16]; // Default for Mm80 (26 + 6 + 16 = 48)
    let financialColumnWidths = [32, 16]; // Default for Mm80 (32 + 16 = 48)

    if (paperSize === "Mm58") {
      itemColumnWidths = [16, 5, 11]; // Exact match for Mm58 (16 + 5 + 11 = 32)
      financialColumnWidths = [20, 12]; // Exact match for Mm58 (20 + 12 = 32)
    }

    // Initialize the root payload envelope structure
    const receiptPayload = {
      printer: settings.receipt_printer_name,
      paper_size: paperSize,
      options: {
        code_page: 0,
        use_gbk: false,
      },
      sections: [],
    };

    const sections = receiptPayload.sections;

    // ─── 1. BRAND HEADER SECTION ───
    sections.push({
      Title: {
        text: (settings.store_name || "SUPERSTOCK").toUpperCase(),
        styles: makeStyle({ bold: true, align: "center", size: "Double" }),
      },
    });

    if (settings.welcome_message) {
      sections.push({
        Text: {
          text: settings.welcome_message,
          styles: makeStyle({ align: "center" }),
        },
      });
    }

    sections.push({ Line: { character: "=" } });

    // ─── 2. TRANSACTION METADATA LOGS ───
    sections.push({ Text: { text: `Ticket ID: #${sale.id}`, styles: makeStyle() } });
    sections.push({ Text: { text: `Date: ${new Date(sale.created_at).toLocaleString("fr-DZ")}`, styles: makeStyle() } });
    sections.push({ Text: { text: `Cashier: ${sale.cashier_name || "System"}`, styles: makeStyle() } });
    sections.push({ Text: { text: `Client: ${sale.customer_name || "Walk-in Client"}`, styles: makeStyle() } });

    sections.push({ Line: { character: "-" } });

    // ─── 3. CART CONTENT SNAPSHOT GRID (NATIVE 3-COLUMN TABLE) ───
    const tableBody = sale.items.map((item) => [
      { text: item.product_name, styles: makeStyle({ align: "left" }) },
      { text: `${item.qty}`, styles: makeStyle({ align: "center" }) },
      { text: `${item.line_total.toFixed(2)} DA`, styles: makeStyle({ align: "right" }) },
    ]);

    sections.push({
      Table: {
        columns: 3,
        column_widths: itemColumnWidths, // 🌟 Sums perfectly to 32 or 48 depending on choice
        header: [
          { text: "ITEM DESCRIPTION", styles: makeStyle({ bold: true, align: "left" }) },
          { text: "QTY", styles: makeStyle({ bold: true, align: "center" }) },
          { text: "TOTAL", styles: makeStyle({ bold: true, align: "right" }) },
        ],
        body: tableBody,
        truncate: false,
      },
    });

    sections.push({ Line: { character: "=" } });

    // ─── 4. FINANCIAL SUMMARY BALANCES (NATIVE 2-COLUMN TABLE) ───
    const financialRows = [
      [
        { text: "Subtotal Basket:", styles: makeStyle({ align: "left" }) },
        { text: `${sale.subtotal.toFixed(2)} DA`, styles: makeStyle({ align: "right" }) },
      ],
    ];

    if (sale.adj_value > 0) {
      const adjSign = sale.adj_type === "discount" ? "-" : "+";
      financialRows.push([
        { text: `Adjustment (${sale.adj_type}):`, styles: makeStyle({ align: "left" }) },
        { text: `${adjSign}${sale.adj_value.toFixed(2)} DA`, styles: makeStyle({ align: "right" }) },
      ]);
    }

    financialRows.push([
      { text: "TOTAL BALANCED:", styles: makeStyle({ bold: true, align: "left" }) },
      { text: `${sale.total.toFixed(2)} DA`, styles: makeStyle({ bold: true, align: "right" }) },
    ]);

    sections.push({
      Table: {
        columns: 2,
        column_widths: financialColumnWidths, // 🌟 Sums perfectly to 32 or 48 depending on choice
        header: [],
        body: financialRows,
        truncate: false,
      },
    });

    sections.push({ Line: { character: "=" } });

    // ─── 5. FOOTER FEED TERMINATION ───
    if (settings.thank_you_message) {
      sections.push({
        Text: {
          text: settings.thank_you_message,
          styles: makeStyle({ align: "center", italic: true }),
        },
      });
    } else {
      sections.push({
        Text: {
          text: "Merci de votre visite !",
          styles: makeStyle({ align: "center", bold: true }),
        },
      });
    }

    // Feed lines to push receipt clear past the physical hardware housing cutter unit
    sections.push({ Feed: { feed_type: "lines", value: 3 } });

    try {
      await print_thermal_printer(receiptPayload);
      return { success: true };
    } catch (hardwareError) {
      console.error("Spooler Error Layer dropped target execution:", hardwareError);
      throw new Error(`Thermal Hardware Error: ${hardwareError}`);
    }
  },
};