import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { getMonthlyReport } from "../services/reportService";
import { generatePDF, generateExcel } from "../services/exportService";
import { db } from "../db/index";

const router = Router();
router.use(authenticateJWT);

async function getTransactionsForPeriod(userId: number, year: number, month: number) {
  // Always fetch all for user and filter in JS — works with both pg and fallback
  const allInc = await db.query(
    "SELECT *, 'income' AS type FROM income WHERE user_id = $1",
    [userId]
  );
  const allExp = await db.query(
    "SELECT *, 'expense' AS type FROM expenses WHERE user_id = $1",
    [userId]
  );
  const filter = (r: any) => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  };
  return [...allInc.rows.filter(filter), ...allExp.rows.filter(filter)].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

router.get("/export/pdf", async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const report = await getMonthlyReport(req.user!.id, year, month);
    const transactions = await getTransactionsForPeriod(req.user!.id, report.year, report.month);
    const pdf = await generatePDF(report, transactions);
    const filename = `report-${report.year}-${String(report.month).padStart(2, "0")}.pdf`;
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.get("/export/excel", async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const report = await getMonthlyReport(req.user!.id, year, month);
    const transactions = await getTransactionsForPeriod(req.user!.id, report.year, report.month);
    const xlsx = await generateExcel(report, transactions);
    const filename = `report-${report.year}-${String(report.month).padStart(2, "0")}.xlsx`;
    res.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(xlsx);
  } catch (err) {
    next(err);
  }
});

export default router;
