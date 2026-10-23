# API contract

The frontend calls the authenticated API with the HttpOnly access cookie. In
local development, Vite proxies `/api` to the backend at `http://localhost:3000`.
Amounts are decimal strings in KES; do not convert them to floating-point
values when sending writes.

## Authentication

`GET /api/v1/auth/me` requires the access cookie and returns the authenticated
user as `{ user: { id, fullName, email, phone, currency, financialPreferences, notificationPreferences, role, profilePhoto, themePreference, createdAt } }`.
The user profile is loaded from the database so this response includes the same
fields returned by login and registration.

`PATCH /api/v1/auth/profile` requires authentication and accepts any non-empty
combination of `fullName`, `profilePhoto`, and `themePreference`. Set
`profilePhoto` to `null` to remove it; image values must be base64 data URLs for
PNG, JPEG, or WebP and are limited to 80,000 characters. Theme preference is
`LIGHT` or `DARK`.

## User profile

`GET /api/v1/users/me` requires authentication and returns the current user's
profile. `PATCH /api/v1/users/me` accepts a non-empty combination of
`fullName`, `email`, `phone`, `currency`, `financialPreferences`, and
`notificationPreferences`. Email addresses are normalized to lowercase and
must be unique. Set `phone` to `null` to remove it. Currency is a three-letter
ISO currency code and defaults to `KES`. Preference values are JSON objects
limited to 10 KB each; a supplied preferences object replaces that preference
set. Updates affect only the authenticated user's profile and do not convert
existing KES-denominated financial records.

The Settings page stores `monthlySavingsTarget` as a decimal string and
`budgetAlertThreshold` as a number in financial preferences. Its notification
preferences are boolean flags for `budgetAlerts`, `transactionAlerts`,
`goalUpdates`, and `monthlySummary`; saving these preferences does not enable
notification delivery. Currency can be set as a preference, but transaction
totals remain denominated in KES until multi-currency display and conversion
are implemented.

`PATCH /api/v1/auth/password` requires authentication and accepts
`{ currentPassword, newPassword }`. The current password is verified before
replacing its Argon2id hash; the new password must contain 12 to 128 characters.

## Platform administration and support

Administrator endpoints require an authenticated account with the `ADMIN`
role. The server refreshes role and active-account status from the database on
each authenticated request; public registration and profile APIs cannot grant
administrator privileges.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/overview` | — | Aggregate account/record counts and API/database health |
| `GET` | `/api/v1/admin/users` | Optional `search`, `page`, `limit` | Paginated user identity, role, status, and signup date |
| `PATCH` | `/api/v1/admin/users/:id/status` | `{ isActive }` | Updated account metadata |
| `GET` | `/api/v1/admin/categories` | — | Shared default category templates |
| `POST` | `/api/v1/admin/categories` | `{ name, type }` | `{ data: PlatformCategoryTemplate }` |
| `PATCH` | `/api/v1/admin/categories/:id` | `{ name?, type?, isActive? }` | `{ data: PlatformCategoryTemplate }` |
| `GET` | `/api/v1/admin/settings` | — | Maintenance settings |
| `PATCH` | `/api/v1/admin/settings` | `{ maintenanceMode?, maintenanceMessage? }` | Updated maintenance settings |
| `GET` | `/api/v1/admin/audit-events` | Optional `limit` | Administrative operations only |
| `GET` | `/api/v1/admin/issues` | — | Issue reports and reporter identity/status |
| `PATCH` | `/api/v1/admin/issues/:id` | `{ status?, adminNote? }` | Updated issue triage state |
| `POST` | `/api/v1/issues` | `{ subject, description }` | `{ data: { id, subject, status, createdAt } }` |

The administrator console does not expose individual users' accounts,
transactions, balances, budgets, savings goals, or other private finance
records. Shared category templates are copied only during registration and
never overwrite existing personal categories. Issue descriptions are
user-submitted text and should not include sensitive financial information.
Maintenance mode returns HTTP 503 for ordinary API routes but leaves
authentication, health checks, and administrator routes available.

## Transactions

All transaction routes are under `/api/v1/transactions` and require
authentication.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/` | Optional type, category, date-range, page, limit, and sort filters | Paginated transaction list |
| `GET` | `/quality` | — | `{ summary: { totalTransactions, categorizedTransactions, datedTransactions }, duplicates: DuplicateTransactionGroup[] }` |
| `POST` | `/` | `{ type, categoryId, accountId?, amount, description?, merchant?, occurredAt? }` | `{ message, data: Transaction }` |
| `GET` | `/:id` | — | `{ data: Transaction }` |
| `PATCH` | `/:id` | Any supported transaction fields, including `accountId` (nullable to unassign) | `{ message, data: Transaction }` |
| `DELETE` | `/:id` | — | `{ message }` |

The authenticated importer parses CSV locally in the browser and creates
transactions only after the user selects rows and confirms import. It accepts
up to 25 rows from a 1 MB CSV file per batch, maps rows to existing categories,
and checks for possible duplicates by date, type, amount, and category. A
duplicate match is a warning rather than proof; duplicate rows are excluded by
default and require explicit selection to import.
Each batch may optionally assign all selected rows to one account; by default,
imported transactions remain unassigned.

The authenticated `/quality` endpoint checks the current user's transaction
history. Possible duplicates are grouped by date, type, amount, and category,
matching the import warning criteria. A match is a suggestion, not proof; users
can dismiss a group as intentional for the current page visit or explicitly
delete an individual transaction after confirmation. Categories and occurrence
dates are required when transactions are created, so the coverage metrics
reflect these required fields.

## Accounts and transfers

All account and transfer routes require authentication and are scoped to the
current user.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/accounts` | — | `{ data: FinancialAccount[], total, totalBalance, currency: "KES" }` |
| `POST` | `/api/v1/accounts` | `{ name, type, provider?, openingBalance? }` | `{ message, data: FinancialAccount }` |
| `GET` | `/api/v1/accounts/:id` | — | `{ data: FinancialAccount }` |
| `PATCH` | `/api/v1/accounts/:id` | Any supported account fields | `{ message, data: FinancialAccount }` |
| `DELETE` | `/api/v1/accounts/:id` | — | `{ message }` |
| `GET` | `/api/v1/transfers` | — | `{ data: Transfer[], total }` (latest 100) |
| `POST` | `/api/v1/transfers` | `{ fromAccountId, toAccountId, amount, description?, occurredAt? }` | `{ message, data: Transfer }` |
| `DELETE` | `/api/v1/transfers/:id` | — | `{ message }` |

Account types are `CASH`, `BANK`, `MOBILE_MONEY`, or `OTHER`. Account balances
are derived from the KES opening balance, assigned income and expense
transactions, and incoming/outgoing transfers. Transfers are stored separately
from transactions, so they do not count as income, expenses, or budget
spending. Both accounts in a transfer must belong to the authenticated user
and must be different. Accounts with linked transactions or transfers cannot
be deleted. Existing transactions are not automatically assigned to any new
account; account assignment is optional when creating or editing transactions.
This MVP uses KES for every account and does not perform currency conversion.

Scanned PDF statements up to 5 MB and 5 pages can be processed locally in the
browser using PDF.js and Tesseract.js. The OCR output must be manually checked
and corrected into CSV form (`Date,Type,Amount,Category,Description`) before
row mapping. The PDF itself and OCR text are not sent to the API; only
user-selected normalized transaction records are sent after confirmation.
OCR is not authoritative, so users must verify every amount and date against
the original statement.

Personal M-Pesa statements use this same user-reviewed CSV/PDF import flow.
CSV files with `Completion Time`, `Details`, `Paid In`, and `Withdrawn`
columns are recognized automatically. Paid In and Withdrawn determine the
transaction type; timestamps are retained for review. Users still assign
categories and confirm each selected row before saving.
Kwetu does not directly connect to a personal M-Pesa wallet or collect an
M-Pesa PIN, password, or provider secret. Opening the import flow from Settings
preselects the user's matching Safaricom/mobile-money account when available.

## Budgets

All budget routes are under `/api/v1/budgets` and require authentication.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/` | Optional `?month=YYYY-MM` | `{ data: Budget[], total: number }` |
| `POST` | `/` | `{ categoryId, periodMonth, amount }` | `{ message, data: Budget }` |
| `GET` | `/:id` | — | `{ data: Budget }` |
| `PATCH` | `/:id` | `{ amount }` | `{ message, data: Budget }` |
| `DELETE` | `/:id` | — | `{ message }` |

Budgets are limited to expense categories and are unique per category and
month. `amount` must be a positive decimal string with at most two decimal
places. The returned budget includes `spent`, `remaining`, `usagePercentage`,
`isOverBudget`, and the category details. Spending is calculated from expense
transactions in the budget's calendar month.

## Categories

All category routes are under `/api/v1/categories` and require authentication.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/` | Optional `?type=INCOME\|EXPENSE` | `{ data: Category[], total: number }` |
| `GET` | `/suggestions` | — | Active shared category templates not already in the user's categories |
| `POST` | `/` | `{ name, type }` | `{ message, data: Category }` |
| `GET` | `/:id` | — | `{ data: Category }` |
| `PATCH` | `/:id` | `{ name?, type? }` | `{ message, data: Category }` |
| `DELETE` | `/:id` | — | `{ message }` |

Category names are unique per account and type. A category with linked
transactions or budgets cannot be deleted; its type cannot be changed while
those records use it. The list response includes transaction and budget counts.
Shared templates are suggestions only; users add them to their personal
categories explicitly. Existing personal categories are never overwritten.

## Savings goals

All savings-goal routes are under `/api/v1/savings-goals` and require
authentication.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/` | Optional `?status=ACTIVE\|COMPLETED\|CANCELLED` | `{ data: SavingsGoal[], total: number }` |
| `POST` | `/` | `{ name, targetAmount, currentAmount?, deadline? }` | `{ message, data: SavingsGoal }` |
| `GET` | `/:id` | — | `{ data: SavingsGoal }` |
| `PATCH` | `/:id` | Any supported goal fields | `{ message, data: SavingsGoal }` |
| `DELETE` | `/:id` | — | `{ message }` |

Amounts are positive decimal strings except `currentAmount`, which may be zero.
`currentAmount` cannot exceed `targetAmount`. `deadline` is an ISO 8601 datetime
with timezone or `null`. A goal is completed automatically when its current
amount reaches its target. Completed and cancelled goals cannot transition to
another status.