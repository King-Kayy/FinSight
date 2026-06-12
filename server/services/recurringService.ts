import { db } from "../db/index";
import { ValidationError, NotFoundError, ForbiddenError } from "../middleware/errors";
import type { RecurringExpense, CreateRecurringExpenseRequest } from "../../shared/api";

export function computeNextRunAt(
  from: Date,
  interval: "daily" | "weekly" | "monthly"
): Date {
  const d = new Date(from);
  if (interval === "daily") d.setDate(d.getDate() + 1);
  else if (interval === "weekly") d.setDate(d.getDate() + 7);
  else if (interval === "monthly") d.setMonth(d.getMonth() + 1);
  return d;
}

export async function listRecurring(userId: number): Promise<RecurringExpense[]> {
  const result = await db.query(
    "SELECT * FROM recurring_expenses WHERE user_id = $1 AND status = 'active' ORDER BY next_run_at ASC",
    [userId]
  );
  return result.rows as RecurringExpense[];
}

export async function createRecurring(
  userId: number,
  data: CreateRecurringExpenseRequest
): Promise<RecurringExpense> {
  if (!data.amount || data.amount <= 0)
    throw new ValidationError("Amount must be greater than 0", "amount");
  if (!data.category) throw new ValidationError("Category is required", "category");
  if (!data.description) throw new ValidationError("Description is required", "description");
  if (!["daily", "weekly", "monthly"].includes(data.interval))
    throw new ValidationError("Interval must be daily, weekly, or monthly", "interval");

  const nextRunAt = computeNextRunAt(new Date(), data.interval);
  const result = await db.query(
    `INSERT INTO recurring_expenses (user_id, amount, category, description, interval, next_run_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, data.amount, data.category, data.description, data.interval, nextRunAt.toISOString()]
  );
  return result.rows[0] as RecurringExpense;
}

export async function deactivateRecurring(
  userId: number,
  id: number
): Promise<RecurringExpense> {
  const existing = await db.query(
    "SELECT * FROM recurring_expenses WHERE id = $1",
    [id]
  );
  if (existing.rows.length === 0) throw new NotFoundError("Recurring expense not found");
  if (existing.rows[0].user_id !== userId) throw new ForbiddenError("Forbidden");

  try {
    await db.query("BEGIN");
    const result = await db.query(
      "UPDATE recurring_expenses SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    await db.query("COMMIT");
    return result.rows[0] as RecurringExpense;
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

export async function processScheduled(): Promise<void> {
  const due = await db.query(
    "SELECT * FROM recurring_expenses WHERE status = 'active' AND next_run_at <= NOW()"
  );
  for (const item of due.rows) {
    try {
      await db.query("BEGIN");
      await db.query(
        "INSERT INTO expenses (user_id, amount, category, description, date) VALUES ($1, $2, $3, $4, $5)",
        [
          item.user_id,
          item.amount,
          item.category,
          item.description,
          new Date().toISOString().split("T")[0],
        ]
      );
      const next = computeNextRunAt(new Date(), item.interval);
      await db.query(
        "UPDATE recurring_expenses SET next_run_at = $1, updated_at = NOW() WHERE id = $2",
        [next.toISOString(), item.id]
      );
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      console.error(`[RecurringService] Failed for id=${item.id}:`, err);
    }
  }
}
