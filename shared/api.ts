/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Income / Expenses (shared TransactionRecord shape)
// ---------------------------------------------------------------------------

export interface TransactionRecord {
  id: number;
  amount: string; // NUMERIC(12,2) serialised as string
  category: string;
  description?: string;
  date: string; // ISO date "YYYY-MM-DD"
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionRequest {
  amount: number;
  category: string;
  description?: string;
  date: string; // ISO date "YYYY-MM-DD"
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export interface BudgetRecord {
  id: number;
  amount: string;
  month: number;
  year: number;
  total_expenses: string;
  remaining: string;
  alert: boolean;
}

export interface CreateBudgetRequest {
  amount: number;
  month: number;
  year: number;
}

// ---------------------------------------------------------------------------
// Monthly Report
// ---------------------------------------------------------------------------

export interface MonthlyReport {
  year: number;
  month: number;
  total_income: string;
  total_expenses: string;
  savings: string;
  expense_by_category: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  category: string;
  total: string;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Savings Goals
// ---------------------------------------------------------------------------

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: string;
  target_date: string; // ISO date "YYYY-MM-DD"
  status: "active" | "achieved";
  current_savings: string;
  progress_percentage: number;
}

export interface CreateSavingsGoalRequest {
  name: string;
  target_amount: number;
  target_date: string; // ISO date "YYYY-MM-DD"
}

// ---------------------------------------------------------------------------
// Recurring Expenses
// ---------------------------------------------------------------------------

export interface RecurringExpense {
  id: number;
  amount: string;
  category: string;
  description: string;
  interval: "daily" | "weekly" | "monthly";
  status: "active" | "inactive";
  next_run_at: string; // ISO timestamp
}

export interface CreateRecurringExpenseRequest {
  amount: number;
  category: string;
  description: string;
  interval: "daily" | "weekly" | "monthly";
}

// ---------------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------------

export interface OCRField {
  value: string | null;
  found: boolean;
}

export interface OCRResponse {
  extracted: {
    amount: OCRField;
    date: OCRField;
    vendor: OCRField;
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface ApiError {
  error: string;
  field?: string;
}
