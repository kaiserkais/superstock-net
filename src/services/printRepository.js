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
   * ─── 🧾 ROUTINE 1: NATIVE THERMAL RECEIPT HARDWARE SPOOLER ───
   * Transforms invoice transaction objects into structured thermal sections and spools to native hardware
   * @param {Object} sale - Core invoice configuration data block from API/Store
   * @param {Object} settings - Global Zustand system settings application state context
   */
  printInvoiceReceipt: async (sale, settings) => {
    if (!settings.receipt_printer_name) {
      throw new Error("No system printer assigned! Please update configurations in Settings.");
    }

    const paperSize = settings.receipt_paper_size || "Mm80"; 
    
    // ─── 📊 RECALCULATED MATHEMATICAL GRID FOR 4 COLUMNS ───
    let itemColumnWidths = [20, 5, 10, 13];    // For Mm80: 20 + 5 + 10 + 13 = 48 chars
    let financialColumnWidths = [32, 16];      // For Mm80: 32 + 16 = 48 chars

    if (paperSize === "Mm58") {
      itemColumnWidths = [11, 4, 8, 9];        // For Mm58: 11 + 4 + 8 + 9 = 32 chars
      financialColumnWidths = [20, 12];        // For Mm58: 20 + 12 = 32 chars
    }

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

    // ─── 3. CART CONTENT SNAPSHOT GRID (NATIVE 4-COLUMN TABLE) ───
    const tableBody = sale.items.map((item) => [
      { text: item.product_name || item.name, styles: makeStyle({ align: "left" }) },
      { text: `${item.qty}`, styles: makeStyle({ align: "center" }) },
      { text: `${Number(item.unit_price || item.settledPrice || 0).toFixed(2)}`, styles: makeStyle({ align: "right" }) }, 
      { text: `${Number(item.line_total || (item.qty * (item.unit_price || item.settledPrice || 0))).toFixed(2)}`, styles: makeStyle({ align: "right" }) },
    ]);

    sections.push({
      Table: {
        columns: 4, 
        column_widths: itemColumnWidths,
        header: [
          { text: "ITEM DESCRIPTION", styles: makeStyle({ bold: true, align: "left" }) },
          { text: "QTY", styles: makeStyle({ bold: true, align: "center" }) },
          { text: "P.U", styles: makeStyle({ bold: true, align: "right" }) }, 
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
        column_widths: financialColumnWidths,
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

    sections.push({ Feed: { feed_type: "lines", value: 3 } });

    try {
      await print_thermal_printer(receiptPayload);
      return { success: true };
    } catch (hardwareError) {
      console.error("Spooler Error Layer dropped target execution:", hardwareError);
      throw new Error(`Thermal Hardware Error: ${hardwareError}`);
    }
  },

  /**
   * ─── 🖥️ ROUTINE 2: SYSTEM BROWSER WINDOW DOCUMENT PRINTER (A4/Letter) ───
   * Generates a structural HTML invoice payload and executes through a hidden document window iframe sandbox
   * @param {Object} sale - Standard transaction metadata data block
   * @param {Object} settings - Global layout configuration frame properties
   */
  printInvoice: async (sale, settings) => {
    const storeTitle = settings.store_name || "SuperStock POS";
    const taxPercentage = Number(settings.tax_percentage || 0);

    const subtotal = Number(sale.subtotal || 0);
    
    // Distinguish adjustments safely to feed calculations
    const shippingFee = sale.adj_type && sale.adj_type !== "discount" ? Number(sale.adj_value || 0) : 0;
    const discountAmount = sale.adj_type === "discount" ? Number(sale.adj_value || 0) : 0;

    const taxAmount = taxPercentage > 0
      ? ((subtotal + shippingFee - discountAmount) * taxPercentage) / 100
      : 0;

    const grandTotal = Number(sale.total || (subtotal + shippingFee - discountAmount + taxAmount));
    const today = sale.created_at 
      ? new Date(sale.created_at).toLocaleDateString("fr-DZ") 
      : new Date().toLocaleDateString("fr-DZ");

    const clientName = sale.customer_name || "";
    const clientPhone = sale.customer_phone || sale.client_phone || "";

    // Generate dynamic rows mapping varying cart structural models elegantly
    const rowsHtml = (sale.items || []).map(item => {
      const pName = item.product_name || item.name || "Article";
      const pVariant = item.combination || item.variant_name || "Standard";
      const qty = Number(item.qty) || 1;
      const unitPrice = Number(item.unit_price || item.settledPrice || 0);
      const lineTotal = Number(item.line_total || (unitPrice * qty));

      return `
        <tr>
          <td>
            <strong>${pName}</strong>
            <div class="variant-sub">${pVariant}</div>
          </td>
          <td style="text-align:center;">${qty}</td>
          <td style="text-align:right;">${unitPrice.toLocaleString("fr-DZ")} DA</td>
          <td style="text-align:right;font-weight:600;">${lineTotal.toLocaleString("fr-DZ")} DA</td>
        </tr>
      `;
    }).join("");

    // 🌟 Dynamic Discount Row Block
    const discountRowHtml = discountAmount > 0 ? `
      <div class="sum-row" style="color: #e53e3e; font-weight: 500;">
        <span>Remise</span>
        <span>-${discountAmount.toLocaleString("fr-DZ")} DA</span>
      </div>
    ` : "";

    const taxRowHtml = taxPercentage > 0 ? `
      <div class="sum-row">
        <span>TVA (${taxPercentage}%)</span>
        <span>${taxAmount.toLocaleString("fr-DZ")} DA</span>
      </div>
    ` : "";

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    font-size: 12px;
    color: #111;
    padding: 10mm;
    line-height: 1.5;
  }
  .inv-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    margin-bottom: 24px;
    border-bottom: 2px solid #111;
  }
  .store-name {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .inv-tag {
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #888;
    margin-top: 3px;
  }
  .inv-label {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #888;
    margin-bottom: 2px;
  }
  .inv-value { font-size: 13px; font-weight: 600; }
  .meta-row {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }
  .meta-block { flex: 1; }
  .field-line {
    border-bottom: 1px solid #111;
    height: 22px;
    margin-bottom: 8px;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #111; color: #fff; }
  thead th {
    padding: 9px 10px;
    font-size: 9.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-weight: 600;
    border: none;
  }
  tbody tr:nth-child(even) { background: #f7f7f5; }
  tbody td {
    padding: 9px 10px;
    border: none;
    border-bottom: 0.5px solid #ddd;
    font-size: 11.5px;
    vertical-align: middle;
  }
  .variant-sub { font-size: 10px; color: #888; margin-top: 2px; }
  .summary-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .summary-box { width: 260px; }
  .sum-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 12px;
    color: #555;
    border-bottom: 0.5px solid #ddd;
  }
  .sum-total {
    display: flex;
    justify-content: space-between;
    padding: 10px 0 4px;
    font-size: 15px;
    font-weight: 800;
    color: #111;
    letter-spacing: 0.5px;
  }
  .footer-row {
    display: flex;
    justify-content: space-between;
    margin-top: 28px;
    padding-top: 16px;
    border-top: 0.5px solid #ddd;
  }
  .sig-block { width: 200px; }
  .sig-line {
    border-top: 1px solid #111;
    margin-top: 44px;
    padding-top: 5px;
    font-size: 10px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #888;
    text-align: center;
  }
  .thanks {
    text-align: center;
    margin-top: 24px;
    font-size: 11px;
    color: #888;
    letter-spacing: 0.5px;
  }
  @media print { body { padding: 8mm; } }
</style>
</head>
<body>

  <div class="inv-header">
    <div>
      <div class="store-name">${storeTitle}</div>
      <div class="inv-tag">Point de vente</div>
    </div>
    <div style="text-align:right;">
      <div class="inv-label">Facture de vente</div>
      <div class="inv-label" style="margin-top:8px;">Date</div>
      <div class="inv-value">${today}</div>
    </div>
  </div>

  <div class="meta-row">
    <div class="meta-block">
      <div class="inv-label">Nom du client</div>
      ${clientName 
        ? `<div class="inv-value" style="margin-bottom: 8px; border-bottom: 1px dashed #ddd; padding-bottom: 2px;">${clientName}</div>` 
        : `<div class="field-line"></div>`
      }
      
      <div class="inv-label">Téléphone</div>
      ${clientPhone 
        ? `<div class="inv-value" style="margin-bottom: 8px; border-bottom: 1px dashed #ddd; padding-bottom: 2px;">${clientPhone}</div>` 
        : `<div class="field-line"></div>`
      }
    </div>
    <div class="meta-block" style="max-width:200px;">
      <div class="inv-label">Adresse</div>
      <div class="field-line"></div>
      <div class="field-line"></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Description</th>
        <th style="text-align:center;width:56px;">Qté</th>
        <th style="text-align:right;width:120px;">Prix unitaire</th>
        <th style="text-align:right;width:130px;">Montant</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="summary-wrap">
    <div class="summary-box">
      <div class="sum-row"><span>Sous-total</span><span>${subtotal.toLocaleString("fr-DZ")} DA</span></div>
      ${discountRowHtml} <div class="sum-row"><span>Livraison</span><span>${shippingFee.toLocaleString("fr-DZ")} DA</span></div>
      ${taxRowHtml}
      <div class="sum-total"><span>TOTAL</span><span>${grandTotal.toLocaleString("fr-DZ")} DA</span></div>
    </div>
  </div>

  <div class="footer-row">
    <div class="sig-block"><div class="sig-line">Signature client</div></div>
    <div class="sig-block"><div class="sig-line">Représentant du magasin</div></div>
  </div>

  <div class="thanks">Merci pour votre achat.</div>

</body>
</html>`;

    // Instantiate sandboxed offscreen document view container
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, { position: "fixed", width: "0", height: "0", border: "none" });
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Spool runtime execution context cleanly using basic promises
    return new Promise((resolve) => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
        resolve({ success: true });
      }, 300);
    });
  },
};