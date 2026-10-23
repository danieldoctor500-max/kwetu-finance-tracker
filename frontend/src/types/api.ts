export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface ApiErrorResponse {
  error?: ApiError;
}

export type TransactionType = "INCOME" | "EXPENSE";
export type FinancialAccountType = "CASH" | "BANK" | "MOBILE_MONEY" | "OTHER";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  currency: string;
  financialPreferences: Record<string, JsonValue>;
  notificationPreferences: Record<string, JsonValue>;
  role: "USER" | "ADMIN";
  profilePhoto: string | null;
  themePreference: "LIGHT" | "DARK";
  createdAt: string;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AuthResponse {
  message: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
    budgets: number;
  };
}

export interface Transaction {
  id: string;
  type: TransactionType;
  categoryId: string;
  accountId: string | null;
  amount: string;
  description: string | null;
  merchant: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  category: Pick<Category, "id" | "name" | "type">;
  account: Pick<FinancialAccount, "id" | "name" | "type"> | null;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: FinancialAccountType;
  provider: string | null;
  openingBalance: string;
  balance?: string;
  currency: "KES";
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
    outgoingTransfers: number;
    incomingTransfers: number;
  };
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  fromAccount: Pick<FinancialAccount, "id" | "name" | "type">;
  toAccount: Pick<FinancialAccount, "id" | "name" | "type">;
}

export interface TransactionListResponse {
  data: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface TransactionQualityRecord {
  id: string;
  type: TransactionType;
  categoryId: string;
  amount: string;
  occurredAt: string;
  description: string | null;
  merchant: string | null;
  category: Pick<Category, "id" | "name" | "type">;
}

export interface DuplicateTransactionGroup {
  key: string;
  transactions: TransactionQualityRecord[];
}

export interface TransactionQualityResponse {
  summary: {
    totalTransactions: number;
    categorizedTransactions: number;
    datedTransactions: number;
  };
  duplicates: DuplicateTransactionGroup[];
}

export interface AdminOverview {
  statistics: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    newUsersThisMonth: number;
    transactionRecords: number;
    trackedAccounts: number;
    openIssues: number;
  };
  health: {
    api: "operational";
    database: "connected";
    uptimeSeconds: number;
    checkedAt: string;
  };
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  data: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PlatformCategoryTemplate {
  id: string;
  name: string;
  type: TransactionType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  metadata: Record<string, JsonValue>;
  createdAt: string;
  actor: Pick<AdminUser, "id" | "fullName" | "email"> | null;
  target: Pick<AdminUser, "id" | "fullName" | "email"> | null;
}

export interface IssueReport {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: Pick<AdminUser, "id" | "fullName" | "email" | "isActive">;
}

export interface DashboardSummary {
  currency: "KES";
  period: {
    from: string | null;
    to: string | null;
  };
  summary: {
    totalIncome: string;
    totalExpenses: string;
    balance: string;
  };
  transactionCount: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

export interface CreateTransactionInput {
  type: TransactionType;
  categoryId: string;
  accountId?: string | null;
  amount: string;
  description?: string;
  merchant?: string;
  occurredAt?: string;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string | null;
  amount?: string;
  description?: string;
  merchant?: string;
  occurredAt?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  periodMonth: string;
  amount: string;
  spent: string;
  remaining: string;
  usagePercentage: number;
  isOverBudget: boolean;
  category: Pick<Category, "id" | "name" | "type">;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetInput {
  categoryId: string;
  periodMonth: string;
  amount: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  remainingAmount: string;
  progressPercentage: number;
  deadline: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavingsGoalInput {
  name: string;
  targetAmount: string;
  currentAmount?: string;
  deadline?: string | null;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  targetAmount?: string;
  currentAmount?: string;
  deadline?: string | null;
  status?: SavingsGoal["status"];
}