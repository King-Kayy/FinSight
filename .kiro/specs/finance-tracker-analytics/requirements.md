# Requirements Document

## Introduction

This document specifies the requirements for a financial management web application (Finance Tracker Analytics) built as a full-stack SPA using React 18, TypeScript, Express, and PostgreSQL/MongoDB. The application enables users to record and manage income and expenses, set budgets with alert thresholds, visualise spending patterns through charts, track savings goals, automate recurring transactions, scan receipt images via OCR, and export reports to PDF or Excel. All monetary values are denominated in GHS (Ghana Cedis).

## Glossary

- **System**: The Finance Tracker Analytics web application as a whole.
- **Auth_Service**: The server-side module responsible for user registration, login, and session/token management.
- **Transaction_Service**: The server-side module responsible for creating, reading, updating, and deleting income and expense records.
- **Budget_Service**: The server-side module responsible for managing budget records and evaluating threshold alerts.
- **Dashboard**: The client-side page that aggregates and displays real-time financial summaries.
- **Report_Service**: The server-side module responsible for generating monthly comparison data and producing PDF/Excel exports.
- **Chart_Component**: The client-side React component that renders Chart.js visualisations.
- **Savings_Goal**: A user-defined target amount tied to a time horizon, against which actual savings progress is measured.
- **Recurring_Expense**: An expense record configured to be automatically re-created on a defined schedule (e.g. daily, weekly, monthly).
- **OCR_Service**: The server-side module that processes uploaded receipt images and extracts structured financial data.
- **Export_Service**: The server-side module that generates PDF and Excel report files for download.
- **User**: An authenticated person with a unique account in the System.
- **JWT**: JSON Web Token used to authenticate API requests after login.
- **GHS**: Ghana Cedi — the currency unit used throughout the System.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to register an account, so that I can securely store and access my personal financial data.

#### Acceptance Criteria

1. WHEN a registration request is submitted with a unique email address, a display name, and a password of at least 8 characters, THE Auth_Service SHALL create a new User record and return a success response.
2. WHEN a registration request is submitted with an email address that already exists in the System, THE Auth_Service SHALL return a 409 Conflict error with a descriptive message.
3. WHEN a registration request is submitted with a password fewer than 8 characters, THE Auth_Service SHALL return a 422 Unprocessable Entity error identifying the failing field.
4. WHEN a registration request is submitted with a missing email or missing password field, THE Auth_Service SHALL return a 400 Bad Request error identifying each missing field.
5. THE Auth_Service SHALL store passwords as a cryptographic hash and SHALL NOT store plaintext passwords.

---

### Requirement 2: User Login and Session Management

**User Story:** As a registered user, I want to log in with my credentials, so that I can access my financial data across sessions.

#### Acceptance Criteria

1. WHEN a login request is submitted with a valid email and matching password, THE Auth_Service SHALL return a signed JWT with an expiry of 24 hours.
2. WHEN a login request is submitted with a valid email and an incorrect password, THE Auth_Service SHALL return a 401 Unauthorised error.
3. WHEN a login request is submitted with an email address not found in the System, THE Auth_Service SHALL return a 401 Unauthorised error.
4. WHILE a User holds a valid JWT that passes full signature and claims verification, THE System SHALL accept the token as proof of identity on all protected endpoints.
5. WHEN a JWT is invalid for any reason (including expiry, failed signature verification, or invalid claims), THE System SHALL return a 401 Unauthorised error on any protected endpoint and THE Dashboard SHALL redirect the User to the login page.

---

### Requirement 3: Income Record Management

**User Story:** As a logged-in user, I want to create, view, update, and delete income records, so that I can maintain an accurate ledger of money I have received.

#### Acceptance Criteria

1. WHEN an authenticated User submits a create-income request with a positive amount in GHS, a category, a date, and an optional description, THE Transaction_Service SHALL persist the record and return the created income object with a unique identifier.
2. WHEN an authenticated User requests their income records, THE Transaction_Service SHALL return all income records belonging to that User, ordered by date descending.
3. WHEN an authenticated User submits an update-income request for an existing record they own, THE Transaction_Service SHALL persist the updated fields and return the updated income object.
4. WHEN an authenticated User submits a delete-income request for an existing record they own, THE Transaction_Service SHALL permanently remove the record and return a 204 No Content response.
5. IF an authenticated User submits a create-income or update-income request with an amount of zero or a negative value, THEN THE Transaction_Service SHALL return a 422 Unprocessable Entity error.
6. IF an authenticated User attempts to update or delete an income record belonging to another User, THEN THE Transaction_Service SHALL return a 403 Forbidden error.

---

### Requirement 4: Expense Record Management

**User Story:** As a logged-in user, I want to create, view, update, and delete expense records, so that I can track every item of spending.

#### Acceptance Criteria

1. WHEN an authenticated User submits a create-expense request with a positive amount in GHS, a category, a date, and an optional description, THE Transaction_Service SHALL persist the record and return the created expense object with a unique identifier.
2. WHEN an authenticated User requests their expense records, THE Transaction_Service SHALL return all expense records belonging to that User, ordered by date descending.
3. WHEN an authenticated User submits an update-expense request for an existing record they own, THE Transaction_Service SHALL persist the updated fields and return the updated expense object.
4. WHEN an authenticated User submits a delete-expense request for an existing record they own, THE Transaction_Service SHALL permanently remove the record and return a 204 No Content response.
5. IF an authenticated User submits a create-expense or update-expense request with an amount of zero or a negative value, THEN THE Transaction_Service SHALL return a 422 Unprocessable Entity error.
6. IF an authenticated User attempts to update or delete an expense record belonging to another User, THEN THE Transaction_Service SHALL return a 403 Forbidden error.

---

### Requirement 5: Budget Management and Threshold Alerts

**User Story:** As a logged-in user, I want to set a monthly budget and receive an alert when my expenses exceed it, so that I can stay within my spending limits.

#### Acceptance Criteria

1. WHEN an authenticated User submits a create-budget request with a positive budget amount in GHS and a calendar month/year, THE Budget_Service SHALL persist the budget record and return the created budget object.
2. WHEN an authenticated User requests their budget for a given month/year, THE Budget_Service SHALL return the budget record including the budget amount and the total expenses for that period.
3. WHILE the total expenses for a budget period are less than or equal to the budget amount, THE Dashboard SHALL display the remaining allowance as "GHS [amount] remaining".
4. WHEN the total expenses for a budget period exceed the budget amount, THE Dashboard SHALL display a budget alert message in the format "Exceeded budget by GHS [overage_amount]".
5. WHEN an authenticated User submits an update-budget request for an existing budget record they own, THE Budget_Service SHALL persist the updated amount and return the updated budget object.
6. IF an authenticated User submits a create-budget or update-budget request with a negative value, THEN THE Budget_Service SHALL return a 422 Unprocessable Entity error. A budget amount of zero is permitted and indicates that budget tracking is disabled for that period.

---

### Requirement 6: Real-Time Financial Dashboard

**User Story:** As a logged-in user, I want a central dashboard that shows my total income, total expenses, and savings at a glance, so that I can understand my financial position immediately.

#### Acceptance Criteria

1. WHEN an authenticated User loads the Dashboard, THE Dashboard SHALL display the Total Income as the sum of all income records for the current calendar month, formatted as "GHS [amount]".
2. WHEN an authenticated User loads the Dashboard, THE Dashboard SHALL display the Total Expenses as the sum of all expense records for the current calendar month, formatted as "GHS [amount]".
3. WHEN an authenticated User loads the Dashboard, THE Dashboard SHALL display Savings as Total Income minus Total Expenses, formatted as "GHS [amount]".
4. WHEN a new income or expense record is created, updated, or deleted while the Dashboard is active, THE Dashboard SHALL recalculate the summary values and update the visible display within 2 seconds without a full page reload.
5. WHEN Total Income is exactly zero and Total Expenses are exactly zero, THE Dashboard SHALL display GHS 0.00 for all three summary metrics, overriding the standard savings calculation.
6. WHEN Savings are negative (expenses exceed income), THE Dashboard SHALL display the Savings value in a visually distinct red colour.

---

### Requirement 7: Data Visualisation

**User Story:** As a logged-in user, I want interactive charts showing my expense breakdown, monthly comparisons, and spending trends, so that I can identify patterns in my finances.

#### Acceptance Criteria

1. WHEN an authenticated User views the Dashboard or Reports page, THE Chart_Component SHALL render a Pie Chart showing the percentage share of each expense category for the selected period.
2. WHEN an authenticated User views the Dashboard or Reports page, THE Chart_Component SHALL render a Bar Chart comparing total income and total expenses for each of the last 12 calendar months.
3. WHEN an authenticated User views the Dashboard or Reports page, THE Chart_Component SHALL render a Line Graph showing cumulative spending totals for each day of the selected month.
4. WHEN the underlying transaction data changes, THE Chart_Component SHALL update all three chart types within 2 seconds to reflect the latest data.
5. THE Chart_Component SHALL use Chart.js as the rendering library for all visualisations.
6. WHEN the selected period contains no expense records, THE Chart_Component SHALL display an empty state message for all three chart types and SHALL NOT render any chart.

---

### Requirement 8: Monthly Reports API

**User Story:** As a logged-in user, I want to retrieve monthly financial summaries via API, so that client pages and export functions can consume consistent aggregated data.

#### Acceptance Criteria

1. WHEN an authenticated User calls GET /api/reports/monthly with a valid year and month parameter, THE Report_Service SHALL return a JSON object containing total income, total expenses, savings, and a breakdown of expenses by category for that month.
2. WHEN GET /api/reports/monthly is called without both a year and a month parameter, THE Report_Service SHALL default to the current calendar month and year. WHEN only one of year or month is provided, THE Report_Service SHALL return a 422 Unprocessable Entity error requiring both parameters to be present.
3. IF GET /api/reports/monthly is called with an invalid year or month value (e.g. month 13), THEN THE Report_Service SHALL return a 422 Unprocessable Entity error with a descriptive message.

---

### Requirement 9: Savings Goals

**User Story:** As a logged-in user, I want to create savings goals with a target amount and deadline, so that I can track my progress towards specific financial objectives.

#### Acceptance Criteria

1. WHEN an authenticated User submits a create-savings-goal request with a name, a positive target amount in GHS, and a target date, THE System SHALL persist the goal and return the created Savings_Goal object with a unique identifier.
2. WHEN an authenticated User requests their savings goals, THE System SHALL return each Savings_Goal with a progress percentage calculated as (current_savings / target_amount) × 100, rounded to two decimal places.
3. WHILE a Savings_Goal's progress percentage is less than 100, THE Dashboard SHALL display the goal with a visual progress bar reflecting the calculated percentage.
4. WHEN a Savings_Goal's progress percentage reaches or exceeds 100, THE System SHALL immediately update the goal's status to "Achieved" and THE Dashboard SHALL display the goal as "Achieved" with the progress bar remaining visible at 100%.
5. IF an authenticated User submits a create-savings-goal request with a target amount of zero or a negative value, THEN THE System SHALL return a 422 Unprocessable Entity error.
6. IF an authenticated User submits a create-savings-goal request with a target date in the past, THEN THE System SHALL return a 422 Unprocessable Entity error.

---

### Requirement 10: Recurring Expenses Automation

**User Story:** As a logged-in user, I want to define recurring expenses that are automatically recorded on a schedule, so that I do not have to manually re-enter predictable costs such as rent or subscriptions.

#### Acceptance Criteria

1. WHEN an authenticated User submits a create-recurring-expense request with a positive amount in GHS, a category, a description, and a recurrence interval (daily, weekly, or monthly), THE System SHALL persist the Recurring_Expense configuration and return the created record.
2. WHEN a scheduled recurrence date is reached for an active Recurring_Expense, THE System SHALL automatically create a corresponding expense record with the configured amount, category, and description, and SHALL set the transaction date to the recurrence date.
3. WHEN an authenticated User requests their recurring expenses, THE System SHALL return all active Recurring_Expense configurations for that User including the next scheduled date.
4. WHEN an authenticated User submits a deactivate-recurring-expense request for an active Recurring_Expense they own, THE System SHALL atomically stop future expense generation and return the updated record with status "inactive"; if either operation fails, THE System SHALL roll back the entire operation and return an error.
5. IF the automatic creation of a recurring expense record fails, THEN THE System SHALL log the error and SHALL retry the creation within 5 minutes.

---

### Requirement 11: Receipt OCR Processing

**User Story:** As a logged-in user, I want to upload a receipt image and have the amount, date, and vendor extracted automatically, so that I can log expenses faster without manual data entry.

#### Acceptance Criteria

1. WHEN an authenticated User uploads an image file in JPEG, PNG, or PDF format to the receipt upload endpoint, THE OCR_Service SHALL process the image and return a JSON object containing the extracted amount in GHS, the extracted date, and the extracted vendor name.
2. WHEN the OCR_Service successfully extracts data from a receipt, THE System SHALL pre-populate the expense creation form with the extracted values, allowing the User to review and confirm before saving.
3. IF the OCR_Service cannot extract one or more required fields (amount, date, or vendor) from the uploaded image, THEN THE OCR_Service SHALL return a partial result indicating which fields were successfully extracted and which were not found, even if zero fields were extracted.
4. IF an uploaded file is not in JPEG, PNG, or PDF format, THEN THE OCR_Service SHALL return a 415 Unsupported Media Type error.
5. IF an uploaded file exceeds 10 MB in size, THEN THE OCR_Service SHALL return a 413 Content Too Large error.

---

### Requirement 12: PDF and Excel Export

**User Story:** As a logged-in user, I want to export my financial reports as PDF or Excel files, so that I can share or archive my financial data outside the application.

#### Acceptance Criteria

1. WHEN an authenticated User requests a PDF export for a given month/year, THE Export_Service SHALL generate a PDF document containing the monthly summary (total income, total expenses, savings) and an itemised list of all transactions for that period, and SHALL return the file as a downloadable attachment.
2. WHEN an authenticated User requests an Excel export for a given month/year, THE Export_Service SHALL generate an XLSX file with one sheet for the monthly summary and one sheet for the itemised transaction list, and SHALL return the file as a downloadable attachment.
3. IF an export is requested for a month/year with no transaction records, THEN THE Export_Service SHALL still generate and return a valid empty report file rather than returning an error.
4. THE Export_Service SHALL complete PDF generation within 10 seconds for a report containing up to 500 transactions.
5. THE Export_Service SHALL complete Excel generation within 10 seconds for a report containing up to 500 transactions.

---

### Requirement 13: API Endpoint Structure

**User Story:** As a developer integrating with the System, I want a consistent and documented set of REST API endpoints, so that client and server communicate through well-defined contracts.

#### Acceptance Criteria

1. THE System SHALL expose a POST /api/register endpoint handled by THE Auth_Service for user registration.
2. THE System SHALL expose a POST /api/login endpoint handled by THE Auth_Service for user authentication.
3. THE System SHALL expose GET, POST /api/expenses endpoints and PUT, DELETE /api/expenses/:id endpoints handled by THE Transaction_Service for expense management.
4. THE System SHALL expose GET, POST /api/income endpoints and PUT, DELETE /api/income/:id endpoints handled by THE Transaction_Service for income management.
5. THE System SHALL expose GET /api/reports/monthly handled by THE Report_Service for monthly summary data.
6. THE System SHALL expose GET, POST /api/budgets endpoints and PUT /api/budgets/:id handled by THE Budget_Service for budget management.
7. THE System SHALL expose GET, POST /api/savings-goals endpoints and PUT /api/savings-goals/:id handled by THE System for savings goal management.
8. THE System SHALL expose POST /api/receipts/ocr handled by THE OCR_Service for receipt image processing.
9. THE System SHALL expose GET /api/export/pdf and GET /api/export/excel endpoints handled by THE Export_Service for report downloads.
10. WHILE a request to any protected endpoint is made without a valid JWT, THE System SHALL return a 401 Unauthorised response.
