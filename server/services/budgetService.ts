import { db } from "../db/index";
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from "../middleware/errors";
import type { BudgetRecord, CreateBudgetRequest } from "../../shared/api";

// ---------------------------------------------------------------------------
// Pure helper — no DB access
// ---------------------------------------------------------------------------

export function evaluateBudget(
  budgetAmount: number,
  totalExpenses: number
): { alert: boolean; message: string; remaining: number } {
  if (budgetAmount === 0) {
    return { alert: false, message: "Budget tracking disabled", remaining: 0 };
  }
  if (totalExpenses > budgetAmount) {
    const exceeded = (totalExpenses - budgetAmount).toFixed(2);
    return { alert: true, message: `Exceeded budget by GHS ${exceeded}`, remaining: 0 };
  }
  const remaining = budgetAmount - totalExpenses;
  return { alert: false, message: `GHS ${remaining.toFixed(2)} remaining`, remaining };
}

// ---------------------------------------------------------------------------
// Helper: sum expenses for a given user/month/year in JS
// Works with both PostgreSQL and the in-memory fallback.
// ---------------------------------------------------------------------------

async function sumExpensesForPeriod(
  userId: number,
  month: number,
  year: number
): Promise<number> {
  // Try PostgreSQL-native aggregation first
  try {
    const res = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3`,
      [userId, month, year]
    );
    // pg returns a string for NUMERIC; fallback returns 0 as number
    const raw = res.rows[0]?.total;
    if (raw !== undefined && raw !== null) return parseFloat(raw);
  } catch {
    // fall through to JS path
  }

  // Fallback: fetch all expenses for user and filter in JS
  const res = await db.query(
    "SELECT * FROM expenses WHERE user_id = $1",
    [userId]
  );
  return res.rows
    .filter((r: any) => {
      const d = new Date(r.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
}

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------

export async function listBudgets(
  userId: number,
  month?: number,
  year?: number
): Promise<BudgetRecord[]> {
  let sql = "SELECT * FROM budgets WHERE user_id = $1";
  const params: any[] = [userId];

  if (month !== undefined) {
    params.push(month);
    sql += ` AND month = $${params.length}`;
  }
  if (year !== undefined) {
    params.push(year);
    sql += ` AND year = $${params.length}`;
  }
  sql += " ORDER BY year DESC, month DESC";

  const result = await db.query(sql, params);

  const records: BudgetRecord[] = await Promise.all(
    result.rows.map(async (row: any) => {
      const totalExpenses = await sumExpensesForPeriod(userId, row.month, row.year);
      const budgetAmount = parseFloat(row.amount);
      const evaluation = evaluateBudget(budgetAmount, totalExpenses);
      return {
        id: row.id,
        amount: String(row.amount),
        month: row.month,
        year: row.year,
        total_expenses: totalExpenses.toFixed(2),
        remaining: evaluation.remaining.toFixed(2),
        alert: evaluation.alert,
      } as BudgetRecord;
    })
  );

  return records;
}

export async function createBudget(
  userId: number,
  data: CreateBudgetRequest
): Promise<BudgetRecord> {
  if (data.amount < 0) throw new ValidationError("Amount must be >= 0", "amount");
  if (!Number.isInteger(data.month) || data.month < 1 || data.month > 12)
    throw new ValidationError("Month must be between 1 and 12", "month");
  if (!Number.isInteger(data.year) || data.year < 2000)
    throw new ValidationError("Year must be >= 2000", "year");

  // In-memory fallback: check for duplicate manually
  const existing = await db.query(
    "SELECT * FROM budgets WHERE user_id = $1",
    [userId]
  );
  const dup = existing.rows.find(
    (r: any) => r.month === data.month && r.year === data.year
  );
  if (dup) throw new ConflictError("Budget already exists for this period");

  let insertResult;
  try {
    insertResult = await db.query(
      `INSERT INTO budgets (user_id, amount, month, year) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, data.amount, data.month, data.year]
    );
  } catch (err: any) {
    if (err?.code === "23505" || /unique|duplicate/i.test(err?.message ?? "")) {
      throw new ConflictError("Budget already exists for this period");
    }
    throw err;
  }

  const row = insertResult.rows[0];
  const totalExpenses = await sumExpensesForPeriod(userId, row.month, row.year);
  const budgetAmount = parseFloat(row.amount);
  const evaluation = evaluateBudget(budgetAmount, totalExpenses);

  return {
    id: row.id,
    amount: String(row.amount),
    month: row.month,
    year: row.year,
    total_expenses: totalExpenses.toFixed(2),
    remaining: evaluation.remaining.toFixed(2),
    alert: evaluation.alert,
  } as BudgetRecord;
}

export async function updateBudget(
  userId: number,
  id: number,
  data: { amount: number }
): Promise<BudgetRecord> {
  const existing = await db.query("SELECT * FROM budgets WHERE id = $1", [id]);
  if (existing.rows.length === 0) throw new NotFoundError("Budget not found");
  if (existing.rows[0].user_id !== userId)
    throw new ForbiddenError("You do not have permission to update this budget");
  if (data.amount < 0) throw new ValidationError("Amount must be >= 0", "amount");

  const updateResult = await db.query(
    `UPDATE budgets SET amount = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [data.amount, id]
  );

  const row = updateResult.rows[0];
  const totalExpenses = await sumExpensesForPeriod(userId, row.month, row.year);
  const budgetAmount = parseFloat(row.amount);
  const evaluation = evaluateBudget(budgetAmount, totalExpenses);

  return {
    id: row.id,
    amount: String(row.amount),
    month: row.month,
    year: row.year,
    total_expenses: totalExpenses.toFixed(2),
    remaining: evaluation.remaining.toFixed(2),
    alert: evaluation.alert,
  } as BudgetRecord;
}
