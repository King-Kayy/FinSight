import { db } from "../db/index";
import { ValidationError, NotFoundError, ForbiddenError } from "../middleware/errors";
import type { SavingsGoal, CreateSavingsGoalRequest } from "../../shared/api";

export function computeProgress(currentSavings: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Math.round((currentSavings / targetAmount) * 100 * 100) / 100;
}

export function deriveStatus(progress: number): "active" | "achieved" {
  return progress >= 100 ? "achieved" : "active";
}

async function getCurrentSavings(userId: number): Promise<number> {
  // Sum income minus expenses — represents total net savings available
  const incomeRes = await db.query(
    "SELECT * FROM income WHERE user_id = $1",
    [userId]
  );
  const expenseRes = await db.query(
    "SELECT * FROM expenses WHERE user_id = $1",
    [userId]
  );
  const totalIncome = incomeRes.rows.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
  const totalExpenses = expenseRes.rows.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
  return Math.max(0, totalIncome - totalExpenses);
}

export async function listSavingsGoals(userId: number): Promise<SavingsGoal[]> {
  const result = await db.query(
    "SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  const currentSavings = await getCurrentSavings(userId);

  return result.rows.map((row) => {
    const target = parseFloat(row.target_amount);
    const progress = computeProgress(currentSavings, target);
    return {
      id: row.id,
      name: row.name,
      target_amount: row.target_amount,
      target_date: row.target_date,
      status: deriveStatus(progress),
      current_savings: currentSavings.toFixed(2),
      progress_percentage: progress,
    } as SavingsGoal;
  });
}

export async function createSavingsGoal(
  userId: number,
  data: CreateSavingsGoalRequest
): Promise<SavingsGoal> {
  if (!data.name) throw new ValidationError("Name is required", "name");
  if (!data.target_amount || data.target_amount <= 0)
    throw new ValidationError("Target amount must be greater than 0", "target_amount");
  if (!data.target_date) throw new ValidationError("Target date is required", "target_date");
  const targetDate = new Date(data.target_date);
  if (isNaN(targetDate.getTime()) || targetDate <= new Date())
    throw new ValidationError("Target date must be in the future", "target_date");

  const result = await db.query(
    "INSERT INTO savings_goals (user_id, name, target_amount, target_date) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, data.name, data.target_amount, data.target_date]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    target_amount: row.target_amount,
    target_date: row.target_date,
    status: "active",
    current_savings: "0.00",
    progress_percentage: 0,
  } as SavingsGoal;
}

export async function deleteSavingsGoal(userId: number, id: number): Promise<void> {
  const existing = await db.query("SELECT * FROM savings_goals WHERE id = $1", [id]);
  if (existing.rows.length === 0) throw new NotFoundError("Savings goal not found");
  if (existing.rows[0].user_id !== userId) throw new ForbiddenError("Forbidden");
  await db.query("DELETE FROM savings_goals WHERE id = $1", [id]);
}

export async function updateSavingsGoal(
  userId: number,
  id: number,
  data: Partial<CreateSavingsGoalRequest>
): Promise<SavingsGoal> {
  const existing = await db.query("SELECT * FROM savings_goals WHERE id = $1", [id]);
  if (existing.rows.length === 0) throw new NotFoundError("Savings goal not found");
  if (existing.rows[0].user_id !== userId) throw new ForbiddenError("Forbidden");
  if (data.target_amount !== undefined && data.target_amount <= 0)
    throw new ValidationError("Target amount must be greater than 0", "target_amount");

  const row = existing.rows[0];
  const newName = data.name ?? row.name;
  const newAmount = data.target_amount ?? parseFloat(row.target_amount);
  const newDate = data.target_date ?? row.target_date;

  await db.query(
    "UPDATE savings_goals SET name=$1, target_amount=$2, target_date=$3, updated_at=NOW() WHERE id=$4",
    [newName, newAmount, newDate, id]
  );
  const goals = await listSavingsGoals(userId);
  const updated = goals.find((g) => g.id === id);
  if (!updated) throw new NotFoundError("Savings goal not found after update");
  return updated;
}
