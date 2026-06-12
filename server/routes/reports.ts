import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { getMonthlyReport } from "../services/reportService";

const router = Router();
router.use(authenticateJWT);

/**
 * GET /api/reports/monthly?year=&month=
 *
 * Returns a monthly income/expense summary for the authenticated user.
 * Both `year` and `month` are optional; if omitted the current month is used.
 * If only one is supplied the service throws a ValidationError (422).
 */
router.get("/reports/monthly", async (req, res, next) => {
  try {
    const year =
      req.query.year !== undefined ? parseInt(req.query.year as string, 10) : undefined;
    const month =
      req.query.month !== undefined ? parseInt(req.query.month as string, 10) : undefined;

    const report = await getMonthlyReport(req.user!.id, year, month);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
