import { db } from "../db/index";
import { ValidationError } from "../middleware/errors";
import type { MonthlyReport, CategoryBreakdown } from "../../shared/api";

// ---------------------------------------------------------------------------
// Pure computation helpers
// ---------------------------------------------------------------------------

export interface MonthlySummary {
  total_income: number;
  total_expenses: number;
  savings: number;
}

/**
 * Compute monthly totals from arrays of amounts.
 * Returns zeros when both arrays are empty / all-zero.
 */
export function computeMonthlySummary(
  income: number[],
  expenses: number[]
): MonthlySummary {
  const total_income = income.reduce((sum, v) => sum + v, 0);
  const total_expenses = expenses.reduce((sum, v) => sum + v, 0);
  const savings = total_income - total_expenses;
  return { total_income, total_expenses, savings };
}

// ---------------------------------------------------------------------------
// Report service
// ---------------------------------------------------------------------------

/**
 * Fetch a monthly report for the given user.
 *
 * - If both `year` and `month` are provided they are used directly.
 * - If neither is provided the current calendar month/year is used.
 * - If only one of the two is supplied a ValidationError is thrown.
 *
 * NOTE (fallback DB): The in-memory fallback store does not support
 * `EXTRACT(MONTH FROM date)` SQL syntax, so when using the fallback we fetch
 * all records for the user and apply the month/year filter in JavaScript.
 * In production with PostgreSQL the SQL-level filtering works correctly.
 */
export async function getMonthlyReport(
  userId: number,
  year?: number,
  month?: number
): Promise<MonthlyReport> {
  // ---------------------------------------------------------------------------
  // Resolve year / month
  // ---------------------------------------------------------------------------
  const bothProvided = year !== undefined && month !== undefined;
  const neitherProvided = year === undefined && month === undefined;

  if (!bothProvided && !neitherProvided) {
    throw new ValidationError(
      "Both year and month must be provided together"
    );
  }

  let resolvedYear: number;
  let resolvedMonth: number;

  if (neitherProvided) {
    const now = new Date();
    resolvedYear = now.getFullYear();
    resolvedMonth = now.getMonth() + 1; // getMonth() is 0-indexed
  } else {
    resolvedYear = year!;
    resolvedMonth = month!;
  }

  // ---------------------------------------------------------------------------
  // Validate ranges
  // ---------------------------------------------------------------------------
  if (resolvedMonth < 1 || resolvedMonth > 12) {
    throw new ValidationError("Month must be between 1 and 12", "month");
  }
  if (resolvedYear < 2000) {
    throw new ValidationError("Year must be >= 2000", "year");
  }

  // ---------------------------------------------------------------------------
  // Fetch records
  // NOTE: The EXTRACT syntax below works correctly with PostgreSQL.
  // For the in-memory fallback we fetch all records for the user then filter
  // by date in JavaScript (the fallback's buildFilter does not handle EXTRACT).
  // ---------------------------------------------------------------------------
  let incomeRows: any[];
  let expenseRows: any[];

  try {
    // Attempt PostgreSQL-style query first
    const incomeResult = await db.query(
      `SELECT * FROM income
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3`,
      [userId, resolvedMonth, resolvedYear]
    );
    const expenseResult = await db.query(
      `SELECT * FROM expenses
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3`,
      [userId, resolvedMonth, resolvedYear]
    );
    incomeRows = incomeResult.rows;
    expenseRows = expenseResult.rows;
  } catch {
    // Fallback: fetch all for user and filter in JS
    // (covers the in-memory store which doesn't support EXTRACT)
    const allIncome = await db.query(
      "SELECT * FROM income WHERE user_id = $1",
      [userId]
    );
    const allExpenses = await db.query(
      "SELECT * FROM expenses WHERE user_id = $1",
      [userId]
    );

    const matchesMonth = (row: any): boolean => {
      const d = new Date(row.date);
      return (
        d.getFullYear() === resolvedYear &&
        d.getMonth() + 1 === resolvedMonth
      );
    };

    incomeRows = allIncome.rows.filter(matchesMonth);
    expenseRows = allExpenses.rows.filter(matchesMonth);
  }

  // ---------------------------------------------------------------------------
  // Compute totals
  // ---------------------------------------------------------------------------
  const incomeAmounts = incomeRows.map((r) => parseFloat(r.amount));
  const expenseAmounts = expenseRows.map((r) => parseFloat(r.amount));

  const { total_income, total_expenses, savings } = computeMonthlySummary(
    incomeAmounts,
    expenseAmounts
  );

  // ---------------------------------------------------------------------------
  // Build expense_by_category
  // ---------------------------------------------------------------------------
  const categoryMap = new Map<string, number>();
  for (const row of expenseRows) {
    const cat: string = row.category ?? "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + parseFloat(row.amount));
  }

  const expense_by_category: CategoryBreakdown[] = [];
  for (const [category, total] of categoryMap.entries()) {
    const percentage =
      total_expenses > 0
        ? parseFloat(((total / total_expenses) * 100).toFixed(2))
        : 0;
    expense_by_category.push({
      category,
      total: total.toFixed(2),
      percentage,
    });
  }

  // Sort by total descending for consistent output
  expense_by_category.sort(
    (a, b) => parseFloat(b.total) - parseFloat(a.total)
  );

  // ---------------------------------------------------------------------------
  // Return report
  // ---------------------------------------------------------------------------
  return {
    year: resolvedYear,
    month: resolvedMonth,
    total_income: total_income.toFixed(2),
    total_expenses: total_expenses.toFixed(2),
    savings: savings.toFixed(2),
    expense_by_category,
  };
}
