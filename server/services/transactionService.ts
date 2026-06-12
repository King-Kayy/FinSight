import { db } from "../db/index";
import { ValidationError, NotFoundError, ForbiddenError } from "../middleware/errors";
import type { TransactionRecord, CreateTransactionRequest } from "../../shared/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateTransaction(data: CreateTransactionRequest): void {
  if (data.amount <= 0) {
    throw new ValidationError("Amount must be greater than 0", "amount");
  }
  if (!data.category || data.category.trim() === "") {
    throw new ValidationError("Category is required", "category");
  }
  if (!data.date || data.date.trim() === "") {
    throw new ValidationError("Date is required", "date");
  }
}

function validateAmountIfProvided(amount?: number): void {
  if (amount !== undefined && amount <= 0) {
    throw new ValidationError("Amount must be greater than 0", "amount");
  }
}

// ---------------------------------------------------------------------------
// Income operations
// ---------------------------------------------------------------------------

export async function listIncome(userId: number): Promise<TransactionRecord[]> {
  const result = await db.query(
    "SELECT * FROM income WHERE user_id = $1 ORDER BY date DESC",
    [userId]
  );
  return result.rows as TransactionRecord[];
}

export async function createIncome(
  userId: number,
  data: CreateTransactionRequest
): Promise<TransactionRecord> {
  validateTransaction(data);

  const result = await db.query(
    `INSERT INTO income (user_id, amount, category, description, date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, data.amount, data.category, data.description ?? null, data.date]
  );
  return result.rows[0] as TransactionRecord;
}

export async function updateIncome(
  userId: number,
  id: number,
  data: CreateTransactionRequest
): Promise<TransactionRecord> {
  const existing = await db.query("SELECT * FROM income WHERE id = $1", [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("Income record not found");
  }
  if (existing.rows[0].user_id !== userId) {
    throw new ForbiddenError("You do not have permission to update this record");
  }

  validateAmountIfProvided(data.amount);
  validateTransaction(data);

  const result = await db.query(
    `UPDATE income
     SET amount = $1, category = $2, description = $3, date = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [data.amount, data.category, data.description ?? null, data.date, id]
  );
  return result.rows[0] as TransactionRecord;
}

export async function deleteIncome(userId: number, id: number): Promise<void> {
  const existing = await db.query("SELECT * FROM income WHERE id = $1", [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("Income record not found");
  }
  if (existing.rows[0].user_id !== userId) {
    throw new ForbiddenError("You do not have permission to delete this record");
  }

  await db.query("DELETE FROM income WHERE id = $1 AND user_id = $2", [id, userId]);
}

// ---------------------------------------------------------------------------
// Expense operations
// ---------------------------------------------------------------------------

export async function listExpenses(userId: number): Promise<TransactionRecord[]> {
  const result = await db.query(
    "SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC",
    [userId]
  );
  return result.rows as TransactionRecord[];
}

export async function createExpense(
  userId: number,
  data: CreateTransactionRequest
): Promise<TransactionRecord> {
  validateTransaction(data);

  const result = await db.query(
    `INSERT INTO expenses (user_id, amount, category, description, date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, data.amount, data.category, data.description ?? null, data.date]
  );
  return result.rows[0] as TransactionRecord;
}

export async function updateExpense(
  userId: number,
  id: number,
  data: CreateTransactionRequest
): Promise<TransactionRecord> {
  const existing = await db.query("SELECT * FROM expenses WHERE id = $1", [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("Expense record not found");
  }
  if (existing.rows[0].user_id !== userId) {
    throw new ForbiddenError("You do not have permission to update this record");
  }

  validateAmountIfProvided(data.amount);
  validateTransaction(data);

  const result = await db.query(
    `UPDATE expenses
     SET amount = $1, category = $2, description = $3, date = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [data.amount, data.category, data.description ?? null, data.date, id]
  );
  return result.rows[0] as TransactionRecord;
}

export async function deleteExpense(userId: number, id: number): Promise<void> {
  const existing = await db.query("SELECT * FROM expenses WHERE id = $1", [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("Expense record not found");
  }
  if (existing.rows[0].user_id !== userId) {
    throw new ForbiddenError("You do not have permission to delete this record");
  }

  await db.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [id, userId]);
}
