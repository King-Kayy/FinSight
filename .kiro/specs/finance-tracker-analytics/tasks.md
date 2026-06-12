# Implementation Plan: Finance Tracker Analytics

## Overview

Implement a full-stack personal finance SPA on the Fusion Starter template. The build proceeds in dependency order: shared types → DB layer → auth → transactions → budgets → reports → dashboard/charts → savings goals → recurring expenses → OCR → export → property-based + integration tests. All amounts are GHS; the stack is React 18 + TypeScript + Express + PostgreSQL/in-memory fallback + Vitest + fast-check.

---

## Tasks

- [ ] 1. Shared TypeScript Interfaces and Utilities
  - [x] 1.1 Define all shared API interfaces in `shared/api.ts`
    - Add `RegisterRequest`, `LoginRequest`, `AuthResponse`, `UserProfile`
    - Add `TransactionRecord`, `CreateTransactionRequest`
    - Add `BudgetRecord`, `CreateBudgetRequest`
    - Add `MonthlyReport`, `CategoryBreakdown`
    - Add `SavingsGoal`, `CreateSavingsGoalRequest`
    - Add `RecurringExpense`, `CreateRecurringExpenseRequest`
    - Add `OCRField`, `OCRResponse`
    - Add `ApiError`
    - _Requirements: 13.1–13.10_

  - [x] 1.2 Create `shared/formatCurrency.ts` with `formatGHS(amount: number): string`
    - Must return `"GHS X.XX"` with exactly two decimal places
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 1.3 Write unit tests for `formatGHS` in `shared/formatCurrency.spec.ts`
    - Test integer amounts, decimals, zero, large values
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 2. Database Layer
  - [x] 2.1 Create `server/db/schema.ts` with `migrate()` function
    - Write `CREATE TABLE IF NOT EXISTS` statements for: `users`, `income`, `expenses`, `budgets`, `savings_goals`, `recurring_expenses`
    - Include all CHECK constraints, UNIQUE constraints, and ON DELETE CASCADE FK references exactly as specified in the design
    - Add all six performance indexes (`idx_income_user_date`, `idx_expenses_user_date`, `idx_budgets_user_period`, `idx_savings_user`, `idx_recurring_active`)
    - _Requirements: 3.1, 4.1, 5.1, 9.1, 10.1_

  - [x] 2.2 Create `server/db/fallback.ts` — in-memory store
    - Implement `query(sql, params)` interface that mirrors `pg.Pool.query`
    - Support INSERT/SELECT/UPDATE/DELETE for all five tables
    - Persist state in module-level Maps keyed by table name
    - _Requirements: 3.1, 4.1, 5.1, 9.1, 10.1_

  - [x] 2.3 Create `server/db/index.ts` — DB connection factory
    - If `DATABASE_URL` env var is present, create and export a `pg.Pool`; call `migrate()` on startup
    - If `DATABASE_URL` is absent, load and export the in-memory fallback store
    - Export a single `db` object with a `query` method used by all services
    - _Requirements: 3.1, 4.1, 5.1, 9.1, 10.1_

- [ ] 3. Authentication — Server
  - [x] 3.1 Create `server/middleware/auth.ts` — JWT verification middleware
    - Read `Authorization: Bearer <token>` header
    - Verify signature against `process.env.JWT_SECRET`; attach `req.user = { id, email }` on success
    - Return `401 Unauthorized` with `ApiError` shape on any failure (expired, bad signature, tampered claims)
    - _Requirements: 2.4, 2.5, 13.10_

  - [ ]* 3.2 Write property test: Property 4 — Invalid JWTs Are Always Rejected
    - Use `fc.string()` to generate arbitrary tokens (random strings, modified valid tokens)
    - Assert every non-valid token returns 401 from any protected endpoint
    - Tag: `// Feature: finance-tracker-analytics, Property 4`
    - _Requirements: 2.5, 13.10_

  - [x] 3.3 Create `server/services/authService.ts`
    - `register(email, name, password)`: hash password with `bcryptjs` (12 rounds), INSERT into `users`, return `UserProfile`; throw `409` on duplicate email, `422` on password < 8 chars or missing fields
    - `login(email, password)`: SELECT user, `bcrypt.compare`, sign JWT (`{ id, email }`, `expiresIn: '24h'`), return `AuthResponse`; throw `401` on mismatch or unknown email
    - _Requirements: 1.1–1.5, 2.1–2.3_

  - [ ]* 3.4 Write property test: Property 2 — Short Passwords Are Always Rejected
    - Use `fc.string({ maxLength: 7 })` to generate passwords of length 0–7
    - Assert each returns 422 from `authService.register`
    - Tag: `// Feature: finance-tracker-analytics, Property 2`
    - _Requirements: 1.3_

  - [ ]* 3.5 Write property test: Property 3 — Valid Login Always Returns a Correctly Structured JWT
    - Register a user with generated valid credentials, then login
    - Decode the JWT and assert payload has `id` and `email`, and `exp` is within ±60 s of `iat + 86400`
    - Tag: `// Feature: finance-tracker-analytics, Property 3`
    - _Requirements: 2.1_

  - [x] 3.6 Create `server/routes/auth.ts` and register routes in `server/index.ts`
    - `POST /api/register` → `authService.register`
    - `POST /api/login` → `authService.login`
    - Wire global Express error middleware (ValidationError → 422, AuthError → 401, ForbiddenError → 403, default → 500) into `server/index.ts`
    - _Requirements: 13.1, 13.2_

  - [ ]* 3.7 Write property test: Property 1 — Valid Registration Always Creates a User
    - Use `fc.record({ email: fc.emailAddress(), name: fc.string({ minLength: 1 }), password: fc.string({ minLength: 8 }) })`
    - Assert each unique email produces a `201` response with a numeric `id`
    - Tag: `// Feature: finance-tracker-analytics, Property 1`
    - _Requirements: 1.1, 1.3_

- [ ] 4. Authentication — Client
  - [x] 4.1 Create `client/lib/api.ts` — fetch wrapper
    - Reads JWT from context/localStorage and injects `Authorization: Bearer <token>` on every request
    - On 401 response, call `logout()` and redirect to `/`
    - Provides typed `api.get<T>`, `api.post<T>`, `api.put<T>`, `api.delete<T>` helpers
    - _Requirements: 2.4, 2.5_

  - [x] 4.2 Create `client/hooks/useAuth.ts` and `AuthContext`
    - Implement `AuthContext` with `{ user, token, login, register, logout, isAuthenticated }`
    - Persist `token` and `user` in `localStorage`; restore on mount
    - `login()` calls `POST /api/login`; `register()` calls `POST /api/register`
    - _Requirements: 2.1, 2.4, 2.5_

  - [ ] 4.3 Create `client/components/layout/ProtectedRoute.tsx`
    - Reads `isAuthenticated` from `useAuth`
    - Redirects unauthenticated users to `/`
    - _Requirements: 2.4, 2.5_

  - [ ] 4.4 Create `client/components/layout/AppShell.tsx`
    - Sidebar with nav links: Dashboard, Transactions, Budgets, Reports, Savings Goals
    - Top bar showing logged-in user's name and a Logout button
    - Wraps all authenticated pages; uses `ProtectedRoute` guard
    - _Requirements: 6.1, 6.4_

  - [ ] 4.5 Implement `client/pages/Index.tsx` — Login/Register page
    - Two tabs: Login and Register
    - Login form: email + password → `useAuth.login()` → redirect to `/dashboard`
    - Register form: name + email + password → `useAuth.register()` → redirect to `/dashboard`
    - Display inline field errors from API `ApiError` responses
    - _Requirements: 1.1–1.4, 2.1–2.3_

  - [ ] 4.6 Update `client/App.tsx` — add all routes
    - Add `<Route path="/savings-goals" element={<SavingsGoals />} />`
    - Wrap `/dashboard`, `/transactions`, `/budgets`, `/reports`, `/savings-goals` in `ProtectedRoute` + `AppShell`
    - _Requirements: 13.1–13.9_

- [ ] 5. Transaction Service and Routes (Income & Expenses)
  - [x] 5.1 Create `server/services/transactionService.ts`
    - `listIncome(userId)`: SELECT from `income` WHERE `user_id = userId` ORDER BY `date DESC`
    - `createIncome(userId, data)`: validate `amount > 0`; INSERT; return created record
    - `updateIncome(userId, id, data)`: validate ownership (403 if mismatch), validate `amount > 0`; UPDATE; return updated record
    - `deleteIncome(userId, id)`: validate ownership; DELETE; return void
    - Mirror all four operations for expenses (`listExpenses`, `createExpense`, `updateExpense`, `deleteExpense`)
    - _Requirements: 3.1–3.6, 4.1–4.6_

  - [ ]* 5.2 Write property test: Property 5 — Income and Expense Create/Read Round-Trip
    - Use `fc.record({ amount: fc.float({ min: 0.01, max: 999999 }), category: fc.string({ minLength: 1 }), date: fc.string(), description: fc.option(fc.string()) })`
    - Assert that after create, the GET list contains a record with matching fields
    - Tag: `// Feature: finance-tracker-analytics, Property 5`
    - _Requirements: 3.1, 4.1_

  - [ ]* 5.3 Write property test: Property 6 — Transaction Lists Are Always Date-Descending
    - Generate N records with random distinct dates; insert all; fetch list
    - Assert `record[i].date >= record[i+1].date` for all consecutive pairs
    - Tag: `// Feature: finance-tracker-analytics, Property 6`
    - _Requirements: 3.2, 4.2_

  - [ ]* 5.4 Write property test: Property 7 — Update Round-Trip Preserves All Updated Fields
    - Create a record; generate a random valid update payload; apply update; fetch list
    - Assert the stored record matches all submitted update fields exactly
    - Tag: `// Feature: finance-tracker-analytics, Property 7`
    - _Requirements: 3.3, 4.3_

  - [ ]* 5.5 Write property test: Property 8 — Amount Validation Rejects Zero and Negative Values
    - Use `fc.oneof(fc.constant(0), fc.float({ max: -0.01 }))` for amount
    - Assert every such request returns 422 and nothing is persisted
    - Tag: `// Feature: finance-tracker-analytics, Property 8`
    - _Requirements: 3.5, 4.5, 5.6, 9.5_

  - [ ] 5.6 Create `server/routes/income.ts` and `server/routes/expenses.ts`; register in `server/index.ts`
    - `GET /api/income`, `POST /api/income`, `PUT /api/income/:id`, `DELETE /api/income/:id`
    - `GET /api/expenses`, `POST /api/expenses`, `PUT /api/expenses/:id`, `DELETE /api/expenses/:id`
    - Apply `authenticateJWT` middleware to all eight routes
    - _Requirements: 13.3, 13.4_

- [ ] 6. Transaction UI (Transactions Page)
  - [ ] 6.1 Create data-fetching hooks `client/hooks/useIncome.ts` and `client/hooks/useExpenses.ts`
    - `useIncome()`: `useQuery(['income'], GET /api/income)`
    - `useCreateIncome()`, `useUpdateIncome()`, `useDeleteIncome()`: mutations that invalidate `['income']`, `['dashboard']`, `['budgets']`, `['reports']` on success
    - Mirror pattern for expenses
    - _Requirements: 3.1–3.4, 4.1–4.4, 6.4_

  - [ ] 6.2 Create `client/components/forms/IncomeForm.tsx` and `client/components/forms/ExpenseForm.tsx`
    - Fields: amount (GHS), category (select or free text), date (date picker), description (optional textarea)
    - Client-side validation: amount must be positive; date and category required
    - Submit via `useCreateIncome` / `useCreateExpense`; show success toast on completion
    - Pre-populate fields when an existing record is passed as prop (edit mode)
    - _Requirements: 3.1, 3.3, 4.1, 4.3_

  - [ ] 6.3 Implement `client/pages/Transactions.tsx`
    - Tabbed view: "Income" tab and "Expenses" tab
    - Each tab: list of records in a table (date, category, amount, description, edit/delete actions), "Add" button that opens `IncomeForm` / `ExpenseForm` in a dialog
    - Clicking edit populates the form with the existing record; delete triggers `useDeleteIncome` / `useDeleteExpense` with a confirmation dialog
    - _Requirements: 3.1–3.4, 4.1–4.4_

- [ ] 7. Budget Service, Routes, and UI
  - [ ] 7.1 Create `server/services/budgetService.ts`
    - `evaluateBudget(budgetAmount, totalExpenses)`: return `{ alert, message, remaining }` per the design algorithm
    - `listBudgets(userId, month?, year?)`: SELECT budgets; compute `total_expenses` and `remaining` inline
    - `createBudget(userId, data)`: validate `amount >= 0` (negative → 422); INSERT; return `BudgetRecord`
    - `updateBudget(userId, id, data)`: validate ownership and amount; UPDATE; return updated `BudgetRecord`
    - _Requirements: 5.1–5.6_

  - [ ]* 7.2 Write unit tests for `evaluateBudget` in `server/services/budgetService.spec.ts`
    - Test: under-budget, exactly at limit, over-budget, zero budget amount
    - _Requirements: 5.3, 5.4_

  - [ ]* 7.3 Write property test: Property 9 — Budget Total Expenses Matches Independently Computed Sum
    - Generate N expense records for a user in a given month/year; insert them; fetch budget for that period
    - Assert `total_expenses` in response equals independently summed amounts
    - Tag: `// Feature: finance-tracker-analytics, Property 9`
    - _Requirements: 5.2_

  - [ ]* 7.4 Write property test: Property 10 — Budget Overage Message Format Is Always Correct
    - Use `fc.tuple(fc.float({ min: 0.01 }), fc.float({ min: 0.01 }))` where `expenses > budget`
    - Assert message matches `"Exceeded budget by GHS X.XX"` with correct overage
    - Tag: `// Feature: finance-tracker-analytics, Property 10`
    - _Requirements: 5.4_

  - [ ] 7.5 Create `server/routes/budgets.ts`; register in `server/index.ts`
    - `GET /api/budgets`, `POST /api/budgets`, `PUT /api/budgets/:id`
    - Apply `authenticateJWT` middleware
    - _Requirements: 13.6_

  - [ ] 7.6 Create `client/hooks/useBudgets.ts`
    - `useBudgets(month?, year?)`: `useQuery(['budgets', month, year], GET /api/budgets?month=&year=)`
    - `useCreateBudget()`, `useUpdateBudget()`: mutations that invalidate `['budgets']` and `['dashboard']`
    - _Requirements: 5.1–5.5_

  - [ ] 7.7 Create `client/components/forms/BudgetForm.tsx`
    - Fields: amount (GHS ≥ 0), month (1–12 select), year (number input ≥ 2000)
    - Submit via `useCreateBudget` or `useUpdateBudget`; show toast on success
    - _Requirements: 5.1, 5.5_

  - [ ] 7.8 Implement `client/pages/Budgets.tsx`
    - List all budgets in a table (month/year, budget amount, total expenses, remaining, alert badge)
    - "Add Budget" button opens `BudgetForm` dialog; existing row "Edit" button opens form pre-populated
    - Display alert badge or remaining-allowance text per the `alert` flag in `BudgetRecord`
    - _Requirements: 5.1–5.5_

- [ ] 8. Reports Service and Route
  - [ ] 8.1 Create `server/services/reportService.ts`
    - `computeMonthlySummary(income, expenses)`: implement the zero-guard algorithm from the design
    - `getMonthlyReport(userId, year, month)`: SELECT income and expenses for the period; compute totals; build `expense_by_category` array with per-category sums and percentages
    - Validate: `month` ∈ [1, 12] and `year` ≥ 2000; throw 422 otherwise
    - Default to current month/year only when **both** params are absent; return 422 when exactly one is provided
    - _Requirements: 8.1–8.3_

  - [ ]* 8.2 Write unit tests for `computeMonthlySummary` in `server/services/reportService.spec.ts`
    - Test: both zero, income only, expenses only, expenses > income (negative savings)
    - _Requirements: 6.3, 6.5_

  - [ ]* 8.3 Write property test: Property 15 — Monthly Report Always Contains All Required Fields
    - Use `fc.array(fc.record({ amount: fc.float({ min: 0.01 }) ... }))` for income and expenses
    - Assert response always has `total_income`, `total_expenses`, `savings`, `expense_by_category`
    - Assert `savings = total_income - total_expenses` and every category in breakdown has at least one expense
    - Tag: `// Feature: finance-tracker-analytics, Property 15`
    - _Requirements: 8.1_

  - [ ]* 8.4 Write property test: Property 16 — Invalid Month/Year Values Are Always Rejected
    - Use `fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 13 }))` for month; `fc.integer({ max: 1999 })` for year
    - Assert each combination returns 422
    - Tag: `// Feature: finance-tracker-analytics, Property 16`
    - _Requirements: 8.3_

  - [ ] 8.5 Create `server/routes/reports.ts`; register in `server/index.ts`
    - `GET /api/reports/monthly` with optional `?year=&month=` query params
    - Apply `authenticateJWT` middleware
    - _Requirements: 13.5_

- [ ] 9. Dashboard, Charts, and Summary Cards
  - [ ] 9.1 Create chart data transformer utilities in `client/lib/chartTransformers.ts`
    - `toPieChartData(expenses: TransactionRecord[])`: group by category, compute percentages
    - `toBarChartData(reports: MonthlyReport[])`: build 12-month income vs expenses dataset
    - `toLineChartData(expenses: TransactionRecord[])`: build daily cumulative spending array for a month
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 9.2 Write property test: Property 12 — Pie Chart Contains All and Only Present Categories
    - Use `fc.array(fc.record({ category: fc.string({ minLength: 1 }), amount: fc.string() }), { minLength: 1 })`
    - Assert output has exactly K slices for K distinct categories and all percentages sum to 100 ±0.01
    - Tag: `// Feature: finance-tracker-analytics, Property 12`
    - _Requirements: 7.1_

  - [ ]* 9.3 Write property test: Property 13 — Bar Chart Always Has Exactly 12 Monthly Data Points
    - Use `fc.array(fc.record({ ... }))` for arbitrary transaction arrays
    - Assert `toBarChartData` output always has exactly 12 labels in ascending chronological order
    - Tag: `// Feature: finance-tracker-analytics, Property 13`
    - _Requirements: 7.2_

  - [ ]* 9.4 Write property test: Property 14 — Line Chart Cumulative Totals Are Monotonically Non-Decreasing
    - Use `fc.array(fc.float({ min: 0 }))` for daily expense amounts
    - Assert `toLineChartData` cumulative values satisfy `value[i] >= value[i-1]` for all i
    - Tag: `// Feature: finance-tracker-analytics, Property 14`
    - _Requirements: 7.3_

  - [ ]* 9.5 Write property test: Property 11 — Dashboard Savings Formula Always Holds
    - Use `fc.tuple(fc.float({ min: 0 }), fc.float({ min: 0 }))` for (total_income, total_expenses) where at least one > 0
    - Assert `computeMonthlySummary` returns savings = total_income − total_expenses formatted as `"GHS X.XX"`
    - Tag: `// Feature: finance-tracker-analytics, Property 11`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 9.6 Create `client/components/charts/PieChart.tsx`
    - Accepts `data: TransactionRecord[]` prop
    - Renders `<Pie>` from `react-chartjs-2` using `toPieChartData`
    - Renders `<EmptyChartMessage>` when data is empty (no chart canvas)
    - Registers required Chart.js modules via `ChartJS.register(...)`
    - _Requirements: 7.1, 7.5, 7.6_

  - [ ] 9.7 Create `client/components/charts/BarChart.tsx`
    - Accepts `data: MonthlyReport[]` prop (12 months)
    - Renders `<Bar>` from `react-chartjs-2` using `toBarChartData`
    - Renders `<EmptyChartMessage>` when data is empty
    - _Requirements: 7.2, 7.5, 7.6_

  - [ ] 9.8 Create `client/components/charts/LineChart.tsx`
    - Accepts `data: TransactionRecord[]` and `month: number` props
    - Renders `<Line>` from `react-chartjs-2` using `toLineChartData`
    - Renders `<EmptyChartMessage>` when data is empty
    - _Requirements: 7.3, 7.5, 7.6_

  - [ ] 9.9 Create `client/components/dashboard/SummaryCard.tsx`
    - Accepts `label: string`, `value: string` (pre-formatted GHS), and optional `variant: "default" | "negative"` props
    - Renders value in red text when `variant === "negative"` (for negative savings per Req 6.6)
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ] 9.10 Create `client/components/dashboard/BudgetAlert.tsx`
    - Accepts `budgets: BudgetRecord[]` prop
    - Renders an alert banner for each budget where `alert === true` showing "Exceeded budget by GHS [overage]"
    - _Requirements: 5.3, 5.4_

  - [ ] 9.11 Create `client/hooks/useReports.ts`
    - `useMonthlyReport(year, month)`: `useQuery(['reports', year, month], GET /api/reports/monthly?year=&month=)`
    - `staleTime: 0`, `refetchOnMount: true`
    - _Requirements: 8.1, 6.4, 7.4_

  - [ ] 9.12 Implement `client/pages/Dashboard.tsx`
    - Fetch current-month report via `useMonthlyReport`; fetch budgets via `useBudgets` for current month
    - Render three `SummaryCard` components (Total Income, Total Expenses, Savings)
    - Apply negative savings style (red) when savings < 0 per Req 6.6
    - Render `BudgetAlert` with current-month budgets
    - Render all three chart components (`PieChart`, `BarChart`, `LineChart`) with appropriate data
    - Render savings goal progress bars via `SavingsGoalCard` components
    - `QueryClient` `staleTime: 0` ensures re-fetch within 2 s after any mutation invalidation
    - _Requirements: 6.1–6.6, 7.1–7.4, 7.6_

- [ ] 10. Checkpoint — Core Feature Tests Pass
  - Ensure all tests pass with `pnpm test --run`. Confirm Dashboard data updates within 2 seconds after creating a transaction. Ask the user if questions arise.

- [ ] 11. Savings Goals Service, Routes, and UI
  - [ ] 11.1 Create `server/services/savingsService.ts`
    - `computeProgress(currentSavings, targetAmount)`: `Math.round((current / target) * 100 * 100) / 100`; return 0 if target ≤ 0
    - `deriveStatus(progressPercentage)`: return `"achieved"` if ≥ 100, else `"active"`
    - `listSavingsGoals(userId)`: SELECT goals; compute `current_savings` as `SUM(income) − SUM(expenses)` for the user; attach `progress_percentage` and `status`
    - `createSavingsGoal(userId, data)`: validate `target_amount > 0` (422), validate `target_date` is in the future (422); INSERT; return `SavingsGoal`
    - `updateSavingsGoal(userId, id, data)`: validate ownership; UPDATE; return updated `SavingsGoal`
    - _Requirements: 9.1–9.6_

  - [ ]* 11.2 Write property test: Property 17 — Savings Goal Progress Formula Always Holds
    - Use `fc.tuple(fc.float({ min: 0.01 }), fc.float({ min: 0.01 }))` for (current_savings, target_amount)
    - Assert `computeProgress(current, target) === round((current / target) * 100, 2)`
    - Tag: `// Feature: finance-tracker-analytics, Property 17`
    - _Requirements: 9.2_

  - [ ]* 11.3 Write property test: Property 18 — Goal Status Transitions to "Achieved" When Progress ≥ 100%
    - Use `fc.tuple(fc.float({ min: 0 }), fc.float({ min: 0 }))` where `current >= target`
    - Assert `deriveStatus(computeProgress(current, target)) === "achieved"` and `progress_percentage >= 100`
    - Tag: `// Feature: finance-tracker-analytics, Property 18`
    - _Requirements: 9.4_

  - [ ] 11.4 Create `server/routes/savingsGoals.ts`; register in `server/index.ts`
    - `GET /api/savings-goals`, `POST /api/savings-goals`, `PUT /api/savings-goals/:id`
    - Apply `authenticateJWT` middleware
    - _Requirements: 13.7_

  - [ ] 11.5 Create `client/hooks/useSavingsGoals.ts`
    - `useSavingsGoals()`: `useQuery(['savings-goals'], GET /api/savings-goals)`
    - `useCreateSavingsGoal()`, `useUpdateSavingsGoal()`: mutations invalidating `['savings-goals']` and `['dashboard']`
    - _Requirements: 9.1–9.4_

  - [ ] 11.6 Create `client/components/dashboard/SavingsGoalCard.tsx`
    - Accepts `goal: SavingsGoal` prop
    - Renders goal name, progress bar (`<Progress value={goal.progress_percentage} />`), `current_savings` / `target_amount` formatted in GHS
    - Shows "Achieved" badge when `goal.status === "achieved"` with bar capped at 100%
    - _Requirements: 9.3, 9.4_

  - [ ] 11.7 Create `client/components/forms/SavingsGoalForm.tsx`
    - Fields: name, target amount (GHS > 0), target date (must be in the future)
    - Submit via `useCreateSavingsGoal` or `useUpdateSavingsGoal`; show toast on success
    - _Requirements: 9.1, 9.5, 9.6_

  - [ ] 11.8 Implement `client/pages/SavingsGoals.tsx`
    - List all savings goals as `SavingsGoalCard` components
    - "Add Goal" button opens `SavingsGoalForm` dialog; each card has an "Edit" action
    - _Requirements: 9.1–9.4_

- [ ] 12. Recurring Expenses Service, Scheduler, Routes, and UI
  - [ ] 12.1 Create `server/services/recurringService.ts`
    - `computeNextRunAt(from: Date, interval: "daily" | "weekly" | "monthly"): Date` — advance by 1 day / 7 days / 1 month
    - `listRecurring(userId)`: SELECT active recurring expenses for user including `next_run_at`
    - `createRecurring(userId, data)`: validate `amount > 0` (422); set `next_run_at` to now + one interval; INSERT; return `RecurringExpense`
    - `deactivateRecurring(userId, id)`: wrap UPDATE in a transaction — atomically set `status = 'inactive'`; ROLLBACK on failure; return updated record
    - `processScheduled()`: SELECT due active rows (`next_run_at <= NOW()`); for each, BEGIN → INSERT expense → UPDATE `next_run_at` → COMMIT; ROLLBACK + log on failure (retry in next 5-minute window)
    - _Requirements: 10.1–10.5_

  - [ ]* 12.2 Write unit tests for `computeNextRunAt` in `server/services/recurringService.spec.ts`
    - Test: daily from Jan 31 → Feb 1, weekly across month boundary, monthly from Jan 31 → Feb 28
    - _Requirements: 10.2_

  - [ ]* 12.3 Write property test: Property 19 — Recurring Expense GET Always Includes Next Scheduled Date
    - Use `fc.oneof(fc.constant("daily"), fc.constant("weekly"), fc.constant("monthly"))` for interval
    - Create a recurring expense; fetch list; assert `next_run_at` is non-null and in the future relative to creation time
    - Tag: `// Feature: finance-tracker-analytics, Property 19`
    - _Requirements: 10.3_

  - [ ] 12.4 Bootstrap the `node-cron` scheduler in `server/index.ts`
    - Import `recurringService.processScheduled`; schedule `*/5 * * * *` cron job
    - _Requirements: 10.2, 10.5_

  - [ ] 12.5 Create `server/routes/recurringExpenses.ts`; register in `server/index.ts`
    - `GET /api/recurring-expenses`, `POST /api/recurring-expenses`, `PUT /api/recurring-expenses/:id/deactivate`
    - Apply `authenticateJWT` middleware
    - _Requirements: 13.3_ (recurring subset), _Requirements: 10.1, 10.3, 10.4_

  - [ ] 12.6 Create `client/hooks/useRecurring.ts`
    - `useRecurring()`: `useQuery(['recurring'], GET /api/recurring-expenses)`
    - `useCreateRecurring()`: mutation invalidating `['recurring']`
    - `useDeactivateRecurring()`: mutation invalidating `['recurring']` and `['expenses']`
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ] 12.7 Create `client/components/forms/RecurringExpenseForm.tsx`
    - Fields: amount (GHS > 0), category, description (required), interval (daily / weekly / monthly select)
    - Submit via `useCreateRecurring`; show toast on success
    - _Requirements: 10.1_

  - [ ] 12.8 Add Recurring Expenses section to `client/pages/Transactions.tsx`
    - Add a third tab "Recurring" listing active recurring expenses (amount, category, description, interval, next_run_at)
    - Each row has a "Deactivate" button that calls `useDeactivateRecurring`
    - "Add Recurring" button opens `RecurringExpenseForm` dialog
    - _Requirements: 10.1, 10.3, 10.4_

- [ ] 13. OCR Service and Route
  - [ ] 13.1 Create `server/services/ocrService.ts`
    - `parseReceiptText(text: string)`: implement the regex-based extraction algorithm from the design (amount near total/paid/ghs/₵ keywords, ISO/slash/dash date patterns, first non-empty line as vendor)
    - `extractReceiptData(buffer: Buffer)`: call `Tesseract.recognize(buffer, "eng")`; pass raw text to `parseReceiptText`; return `OCRResponse`
    - _Requirements: 11.1, 11.3_

  - [ ]* 13.2 Write property test: Property 20 — OCR Response Always Contains Per-Field Extraction Status
    - Use `fc.string()` to generate arbitrary OCR text strings (including empty string)
    - Assert `parseReceiptText` always returns an object with `extracted.amount`, `extracted.date`, `extracted.vendor` each having `value` (string | null) and `found` (boolean)
    - Tag: `// Feature: finance-tracker-analytics, Property 20`
    - _Requirements: 11.3_

  - [ ] 13.3 Create `server/routes/ocr.ts`; register in `server/index.ts`
    - Configure `multer` with `limits: { fileSize: 10 * 1024 * 1024 }` and MIME filter for `image/jpeg`, `image/png`, `application/pdf`
    - Return 413 if file exceeds 10 MB; return 415 if MIME type not allowed
    - `POST /api/receipts/ocr` → `ocrService.extractReceiptData(req.file.buffer)`; return `OCRResponse`
    - Apply `authenticateJWT` middleware
    - _Requirements: 11.1, 11.4, 11.5, 13.8_

  - [ ] 13.4 Add OCR upload UI to `client/pages/Transactions.tsx`
    - Add a "Scan Receipt" button on the Expenses tab
    - Opens a dialog with a file input (accepts JPEG/PNG/PDF, max 10 MB, validated client-side)
    - On submit: POST to `/api/receipts/ocr`; on success, open `ExpenseForm` pre-populated with extracted `amount`, `date`, `vendor` (as description)
    - Show which fields were found/not-found using the `found` flag from `OCRResponse`
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 14. Export Service and Route
  - [ ] 14.1 Create `server/services/exportService.ts`
    - `generatePDF(report: MonthlyReport, transactions: TransactionRecord[])`: use `pdfkit` to build a PDF with a summary section (total income, total expenses, savings) and an itemised transaction list; return a `Buffer`
    - `generateExcel(report: MonthlyReport, transactions: TransactionRecord[])`: use `exceljs` to create an XLSX workbook with a "Summary" sheet and a "Transactions" sheet; return a `Buffer`
    - Both functions must handle empty transaction arrays and still produce a valid file (Req 12.3)
    - _Requirements: 12.1–12.5_

  - [ ]* 14.2 Write property test: Property 21 — PDF Export Contains All Transactions for the Period
    - Use `fc.array(fc.record({ ... }), { maxLength: 500 })` for transaction arrays
    - Call `generatePDF`; parse the resulting buffer; assert the PDF text contains N line items and matching summary values
    - Tag: `// Feature: finance-tracker-analytics, Property 21`
    - _Requirements: 12.1_

  - [ ]* 14.3 Write property test: Property 22 — Excel Export Contains All Transactions Across Two Sheets
    - Use `fc.array(fc.record({ ... }), { maxLength: 500 })` for transaction arrays
    - Call `generateExcel`; load workbook from buffer with `exceljs`; assert ≥ 2 sheets and transactions sheet has exactly N data rows
    - Tag: `// Feature: finance-tracker-analytics, Property 22`
    - _Requirements: 12.2_

  - [ ] 14.4 Create `server/routes/export.ts`; register in `server/index.ts`
    - `GET /api/export/pdf?year=&month=`: call `reportService.getMonthlyReport`, then `exportService.generatePDF`; respond with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="report-YYYY-MM.pdf"`
    - `GET /api/export/excel?year=&month=`: same flow with `exportService.generateExcel`; respond with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and matching `Content-Disposition`
    - Apply `authenticateJWT` middleware
    - _Requirements: 12.1, 12.2, 13.9_

  - [ ] 14.5 Create `client/hooks/useExport.ts`
    - `useExportPDF(year, month)`: trigger `GET /api/export/pdf` and initiate browser file download via `<a download>` element
    - `useExportExcel(year, month)`: same pattern for Excel
    - _Requirements: 12.1, 12.2_

- [ ] 15. Reports Page
  - [ ] 15.1 Implement `client/pages/Reports.tsx`
    - Month/year picker (select inputs, default to current month/year)
    - Render `MonthlyReport` summary (total income, total expenses, savings) via `useMonthlyReport`
    - Render `PieChart`, `BarChart`, `LineChart` with data from the selected report
    - "Export PDF" and "Export Excel" buttons trigger `useExportPDF` / `useExportExcel`
    - _Requirements: 7.1–7.6, 8.1, 12.1, 12.2_

- [ ] 16. Checkpoint — Full Feature Tests Pass
  - Run `pnpm test --run` and `pnpm typecheck`. All tests should pass and TypeScript should report zero errors. Ask the user if any questions arise.

- [ ] 17. Property-Based Test Suite (Vitest + fast-check)
  - [ ] 17.1 Install `fast-check` as a dev dependency: `pnpm add -D fast-check`
    - Confirm `vitest.config.ts` covers test files matching `**/*.spec.ts`
    - _Requirements: (all)_

  - [ ]* 17.2 Collect all property tests into `client/lib/chartTransformers.spec.ts` and `server/services/*.spec.ts`
    - Ensure every property (1–22 as listed in the Testing Strategy section of the design) has a corresponding `it()` block using `fc.assert(fc.property(...))` with at least 100 runs
    - Each test must carry the tag comment: `// Feature: finance-tracker-analytics, Property N: <description>`
    - _Requirements: 1.1–13.10_

- [ ] 18. Final Checkpoint — Production Build Passes
  - Run `pnpm build` and `pnpm typecheck`. Confirm zero build errors and zero type errors. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP iteration
- Each task references the specific requirement clause(s) it satisfies for full traceability
- The in-memory DB fallback (task 2.2) enables all tests to run without a live Postgres instance
- All amounts travel as `NUMERIC(12,2)` strings across the API; parse with `parseFloat` only at computation boundaries
- The `node-cron` scheduler (task 12.4) must be started inside `createServer()` so it is active in development
- `staleTime: 0` on dashboard queries ensures the ≤ 2-second refresh SLA (Req 6.4, 7.4) is met via TanStack Query invalidation
- Checkpoints at tasks 10 and 16 gate subsequent work on a green test suite

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3"] },
    { "id": 3, "tasks": ["3.1", "3.3"] },
    { "id": 4, "tasks": ["3.2", "3.4", "3.5", "3.6"] },
    { "id": 5, "tasks": ["3.7", "4.1", "4.2", "5.1"] },
    { "id": 6, "tasks": ["4.3", "4.4", "5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 7, "tasks": ["4.5", "4.6", "6.1", "7.1", "8.1"] },
    { "id": 8, "tasks": ["6.2", "7.2", "7.3", "7.4", "7.5", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 9, "tasks": ["6.3", "7.6", "9.1", "11.1", "12.1"] },
    { "id": 10, "tasks": ["7.7", "7.8", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8", "9.9", "9.10", "9.11", "11.2", "11.3", "11.4", "12.2", "12.3", "12.4", "12.5", "13.1"] },
    { "id": 11, "tasks": ["9.12", "11.5", "11.6", "11.7", "11.8", "12.6", "12.7", "12.8", "13.2", "13.3", "14.1"] },
    { "id": 12, "tasks": ["13.4", "14.2", "14.3", "14.4"] },
    { "id": 13, "tasks": ["14.5", "15.1"] },
    { "id": 14, "tasks": ["17.1"] },
    { "id": 15, "tasks": ["17.2"] }
  ]
}
```
