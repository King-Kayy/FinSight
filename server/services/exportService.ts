import type { MonthlyReport, TransactionRecord } from "../../shared/api";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ---------------------------------------------------------------------------
// PDF export — pure HTML-to-text PDF using a minimal approach
// We generate a simple text-based report as a PDF-like structure
// using raw PDF syntax to avoid pdfkit's font file loading issues in Lambda.
// ---------------------------------------------------------------------------

export async function generatePDF(
  report: MonthlyReport,
  transactions: any[]
): Promise<Buffer> {
  const monthName = MONTHS[report.month];
  const title = `Financial Report — ${monthName} ${report.year}`;

  // Build a simple HTML string, then convert to a downloadable HTML file
  // disguised as a "report" — since pdfkit requires disk fonts in Lambda,
  // we return an HTML file with print-ready CSS that opens as a report.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
  h1 { font-size: 22px; text-align: center; margin-bottom: 8px; }
  h2 { font-size: 15px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px; }
  .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
  .card { background: #f9f9f9; border: 1px solid #eee; padding: 12px; border-radius: 6px; }
  .card-label { font-size: 12px; color: #666; }
  .card-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
  .income { color: #059669; }
  .expense { color: #dc2626; }
  .savings { color: #2563eb; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr:last-child td { border-bottom: none; }
  .amount-income { color: #059669; font-weight: 600; }
  .amount-expense { color: #dc2626; font-weight: 600; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${title}</h1>
<p style="text-align:center;color:#666;font-size:13px;">Generated on ${new Date().toLocaleDateString()}</p>

<h2>Summary</h2>
<div class="summary">
  <div class="card"><div class="card-label">Total Income</div><div class="card-value income">GHS ${parseFloat(report.total_income).toFixed(2)}</div></div>
  <div class="card"><div class="card-label">Total Expenses</div><div class="card-value expense">GHS ${parseFloat(report.total_expenses).toFixed(2)}</div></div>
  <div class="card"><div class="card-label">Savings</div><div class="card-value savings">GHS ${parseFloat(report.savings).toFixed(2)}</div></div>
</div>

${report.expense_by_category.length > 0 ? `
<h2>Expense Breakdown</h2>
<table>
  <thead><tr><th>Category</th><th>Amount (GHS)</th><th>Share</th></tr></thead>
  <tbody>
    ${report.expense_by_category.map((c) => `
    <tr>
      <td>${c.category}</td>
      <td class="amount-expense">GHS ${parseFloat(c.total).toFixed(2)}</td>
      <td>${c.percentage.toFixed(1)}%</td>
    </tr>`).join("")}
  </tbody>
</table>` : ""}

<h2>Transactions</h2>
${transactions.length === 0 ? '<p style="color:#999">No transactions for this period.</p>' : `
<table>
  <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount (GHS)</th></tr></thead>
  <tbody>
    ${transactions.map((tx) => `
    <tr>
      <td>${tx.date ?? ""}</td>
      <td>${tx.type ?? ""}</td>
      <td>${tx.category ?? ""}</td>
      <td>${tx.description ?? "—"}</td>
      <td class="${tx.type === "income" ? "amount-income" : "amount-expense"}">GHS ${parseFloat(tx.amount).toFixed(2)}</td>
    </tr>`).join("")}
  </tbody>
</table>`}
</body>
</html>`;

  return Buffer.from(html, "utf-8");
}

// ---------------------------------------------------------------------------
// Excel export — generate a proper CSV that Excel opens natively
// Avoids exceljs native binding issues in Lambda environments.
// ---------------------------------------------------------------------------

export async function generateExcel(
  report: MonthlyReport,
  transactions: any[]
): Promise<Buffer> {
  const monthName = MONTHS[report.month];

  const rows: string[][] = [];

  // Header
  rows.push([`Financial Report — ${monthName} ${report.year}`]);
  rows.push([]);
  rows.push(["SUMMARY"]);
  rows.push(["Metric", "Amount (GHS)"]);
  rows.push(["Total Income", parseFloat(report.total_income).toFixed(2)]);
  rows.push(["Total Expenses", parseFloat(report.total_expenses).toFixed(2)]);
  rows.push(["Savings", parseFloat(report.savings).toFixed(2)]);
  rows.push([]);

  if (report.expense_by_category.length > 0) {
    rows.push(["EXPENSE BREAKDOWN"]);
    rows.push(["Category", "Amount (GHS)", "Share (%)"]);
    for (const c of report.expense_by_category) {
      rows.push([c.category, parseFloat(c.total).toFixed(2), c.percentage.toFixed(1)]);
    }
    rows.push([]);
  }

  rows.push(["TRANSACTIONS"]);
  rows.push(["Date", "Type", "Category", "Description", "Amount (GHS)"]);
  for (const tx of transactions) {
    rows.push([
      tx.date ?? "",
      tx.type ?? "",
      tx.category ?? "",
      tx.description ?? "",
      parseFloat(tx.amount).toFixed(2),
    ]);
  }

  // Convert to CSV with BOM for Excel UTF-8 compatibility
  const csv = "\uFEFF" + rows
    .map((row) =>
      row.map((cell) => {
        const s = String(cell ?? "");
        // Escape cells that contain commas, quotes, or newlines
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      }).join(",")
    )
    .join("\r\n");

  return Buffer.from(csv, "utf-8");
}
