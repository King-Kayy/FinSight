import type { MonthlyReport, TransactionRecord } from "../../shared/api";

// ---------------------------------------------------------------------------
// PDF export using pdfkit
// ---------------------------------------------------------------------------

export async function generatePDF(
  report: MonthlyReport,
  transactions: TransactionRecord[]
): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    const monthName = new Date(report.year, report.month - 1).toLocaleString("default", {
      month: "long",
    });
    doc.fontSize(20).text(`Financial Report — ${monthName} ${report.year}`, { align: "center" });
    doc.moveDown();

    // Summary
    doc.fontSize(14).text("Summary", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Total Income:    GHS ${report.total_income}`);
    doc.text(`Total Expenses:  GHS ${report.total_expenses}`);
    doc.text(`Savings:         GHS ${report.savings}`);
    doc.moveDown();

    // Transactions table header
    doc.fontSize(14).text("Transactions", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    const col = { date: 50, category: 130, description: 250, amount: 460 };
    doc
      .font("Helvetica-Bold")
      .text("Date", col.date, doc.y, { continued: false });
    const headerY = doc.y - 12;
    doc.text("Date", col.date, headerY);
    doc.text("Category", col.category, headerY);
    doc.text("Description", col.description, headerY);
    doc.text("Amount (GHS)", col.amount, headerY);
    doc.moveDown(0.5);
    doc.font("Helvetica");

    if (transactions.length === 0) {
      doc.text("No transactions for this period.");
    } else {
      for (const tx of transactions) {
        const y = doc.y;
        doc.text(tx.date ?? "", col.date, y);
        doc.text(tx.category ?? "", col.category, y);
        doc.text(tx.description ?? "", col.description, y, { width: 200 });
        doc.text(tx.amount ?? "0.00", col.amount, y);
        doc.moveDown(0.3);
      }
    }

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// Excel export using exceljs
// ---------------------------------------------------------------------------

export async function generateExcel(
  report: MonthlyReport,
  transactions: TransactionRecord[]
): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  // Summary sheet
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 25 },
    { header: "Amount (GHS)", key: "amount", width: 20 },
  ];
  summarySheet.addRow({ metric: "Total Income", amount: report.total_income });
  summarySheet.addRow({ metric: "Total Expenses", amount: report.total_expenses });
  summarySheet.addRow({ metric: "Savings", amount: report.savings });

  // Transactions sheet
  const txSheet = workbook.addWorksheet("Transactions");
  txSheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Category", key: "category", width: 20 },
    { header: "Description", key: "description", width: 35 },
    { header: "Amount (GHS)", key: "amount", width: 20 },
  ];

  for (const tx of transactions) {
    txSheet.addRow({
      date: tx.date,
      category: tx.category,
      description: tx.description ?? "",
      amount: tx.amount,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
