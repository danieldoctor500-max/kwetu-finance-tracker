import axios from "axios";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleAlert,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { createCategory, listCategories } from "../../services/categories";
import { getDashboardSummary } from "../../services/dashboard";
import { listAccounts } from "../../services/accounts";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "../../services/transactions";
import type {
  ApiErrorResponse,
  Category,
  DashboardSummary,
  Transaction,
  TransactionType,
  FinancialAccount,
} from "../../types/api";
import "../../styles/auth.css";
const OverviewCharts = lazy(() => import("./OverviewCharts"));

interface DashboardData {
  summary: DashboardSummary;
  transactions: Transaction[];
  monthlyTransactions: Transaction[];
  categories: Category[];
  accounts: FinancialAccount[];
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthPeriod() {
  const now = new Date();
  return {
    from: localDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: localDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data.error?.message;
    if (message) return message;
    if (!error.response) {
      return "Unable to reach Kwetu. Check that the API is running and try again.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

function formatMoney(value: string | number): string {
  return `KSh ${Number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function monthTitle(): string {
  return new Intl.DateTimeFormat("en-KE", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

async function fetchDashboardData(): Promise<DashboardData> {
  const period = currentMonthPeriod();
  const from = new Date(`${period.from}T00:00:00.000Z`).toISOString();
  const to = new Date(`${period.to}T23:59:59.999Z`).toISOString();
  const [summary, transactionResponse, categories, accountResponse] = await Promise.all([
    getDashboardSummary(period),
    listTransactions({ page: 1, limit: 6, sortOrder: "desc" }),
    listCategories(),
    listAccounts(),
  ]);
  const monthlyResponse = await listTransactions({
    from,
    to,
    page: 1,
    limit: 100,
    sortOrder: "asc",
  });
  if (monthlyResponse.pagination.totalPages > 20) {
    throw new Error("There are too many transactions to chart this month. Open Reports to view the data in smaller date ranges.");
  }
  const monthlyTransactions = [...monthlyResponse.data];
  for (let page = 2; page <= monthlyResponse.pagination.totalPages; page += 1) {
    const nextPage = await listTransactions({
      from,
      to,
      page,
      limit: 100,
      sortOrder: "asc",
    });
    monthlyTransactions.push(...nextPage.data);
  }
  return {
    summary,
    transactions: transactionResponse.data,
    monthlyTransactions,
    categories,
    accounts: accountResponse.data,
  };
}

export default function AccountPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => localDateString(new Date()));
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setDashboardError(null);
    try {
      setData(await fetchDashboardData());
    } catch (error) {
      setDashboardError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchDashboardData()
      .then((dashboardData) => {
        if (active) setData(dashboardData);
      })
      .catch((error: unknown) => {
        if (active) setDashboardError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const matchingCategories = useMemo(
    () => data?.categories.filter((category) => category.type === transactionType) ?? [],
    [data?.categories, transactionType],
  );
  const selectedCategoryId = matchingCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : matchingCategories[0]?.id ?? "";
  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!selectedCategoryId) {
      setFormError("Choose or create a category before saving this transaction.");
      return;
    }

    setSaving(true);
    try {
      await createTransaction({
        type: transactionType,
        categoryId: selectedCategoryId,
        accountId: accountId || null,
        amount,
        description: description.trim() || undefined,
        merchant: merchant.trim() || undefined,
        occurredAt: new Date(`${occurredOn}T12:00:00`).toISOString(),
      });
      setAmount("");
      setDescription("");
      setMerchant("");
      await loadDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory() {
    setCategoryError(null);
    if (newCategoryName.trim().length < 2) {
      setCategoryError("Category name must contain at least 2 characters.");
      return;
    }
    setCreatingCategory(true);
    try {
      const category = await createCategory({
        name: newCategoryName.trim(),
        type: transactionType,
      });
      setData((current) =>
        current
          ? { ...current, categories: [...current.categories, category] }
          : current,
      );
      setCategoryId(category.id);
      setNewCategoryName("");
    } catch (error) {
      setCategoryError(getErrorMessage(error));
    } finally {
      setCreatingCategory(false);
    }
  }

  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <span className="auth-kicker">YOUR FINANCES, AT A GLANCE</span>
          <h1>Dashboard</h1>
          <p>Your monthly overview for {monthTitle()}.</p>
        </div>
        <span className="dashboard-period"><CalendarDays size={16} /> {monthTitle()}</span>
      </section>

      {dashboardError ? (
        <section className="dashboard-message dashboard-error" role="alert">
          <CircleAlert size={20} />
          <div><strong>We couldn’t load your finances</strong><p>{dashboardError}</p></div>
          <button className="button button-secondary" onClick={() => void loadDashboard()}>
            <RefreshCw size={15} /> Try again
          </button>
        </section>
      ) : (
        <>
          <section className="summary-grid" aria-label="Monthly summary">
            <SummaryCard
              label="Balance this month"
              value={data ? formatMoney(data.summary.summary.balance) : "—"}
              tone="balance"
              loading={loading}
            />
            <SummaryCard
              label="Income"
              value={data ? formatMoney(data.summary.summary.totalIncome) : "—"}
              tone="income"
              loading={loading}
            />
            <SummaryCard
              label="Expenses"
              value={data ? formatMoney(data.summary.summary.totalExpenses) : "—"}
              tone="expenses"
              loading={loading}
            />
            <SummaryCard
              label="Transactions"
              value={data ? String(data.summary.transactionCount) : "—"}
              tone="count"
              loading={loading}
            />
          </section>

          <section className="overview-charts" aria-label="Monthly financial charts">
            <Suspense fallback={<div className="dashboard-card overview-chart-empty" role="status">Loading monthly charts…</div>}>
              <OverviewCharts
                transactions={data?.monthlyTransactions ?? []}
                loading={loading}
                monthLabel={monthTitle()}
              />
            </Suspense>
          </section>

          <section className="dashboard-content-grid">
            <div className="dashboard-card transaction-list-card">
              <div className="dashboard-card-heading">
                <div><span className="panel-label">YOUR ACTIVITY</span><h2>Recent transactions</h2></div>
                <button className="icon-button" aria-label="Refresh dashboard" onClick={() => void loadDashboard()} disabled={loading}>
                  <RefreshCw size={16} />
                </button>
              </div>
              {loading ? (
                <p className="dashboard-empty">Loading your transactions…</p>
              ) : data?.transactions.length ? (
                <div className="live-transaction-list">
                  {data.transactions.map((transaction) => (
                    <TransactionRow
                      transaction={transaction}
                      categories={data.categories}
                      accounts={data.accounts}
                      onChanged={loadDashboard}
                      key={transaction.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <Wallet size={25} />
                  <strong>No transactions yet</strong>
                  <span>Add your first income or expense using the form.</span>
                </div>
              )}
            </div>

            <div className="dashboard-card add-transaction-card">
              <div className="dashboard-card-heading">
                <div><span className="panel-label">KEEP IT UP TO DATE</span><h2>Add a transaction</h2></div>
                <span className="account-next-icon"><Plus size={20} /></span>
              </div>

              {formError && <p className="auth-error" role="alert">{formError}</p>}

              <form className="transaction-form" onSubmit={(event) => void handleCreateTransaction(event)}>
                <div className="transaction-type-toggle" aria-label="Transaction type">
                  {(["EXPENSE", "INCOME"] as const).map((type) => (
                    <button
                      className={transactionType === type ? "type-option selected" : "type-option"}
                      type="button"
                      key={type}
                      aria-pressed={transactionType === type}
                      onClick={() => {
                        setTransactionType(type);
                        setCategoryError(null);
                      }}
                    >
                      {type === "INCOME" ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                      {type === "INCOME" ? "Income" : "Expense"}
                    </button>
                  ))}
                </div>

                <label className="dashboard-field">
                  <span>Amount (KSh)</span>
                  <input
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    required
                  />
                </label>

                <label className="dashboard-field">
                  <span>Category</span>
                  <select
                    value={selectedCategoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    disabled={!matchingCategories.length}
                    required
                  >
                    <option value="">
                      {matchingCategories.length ? "Choose a category" : "Create a category first"}
                    </option>
                    {matchingCategories.map((category) => (
                      <option value={category.id} key={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>

                <label className="dashboard-field">
                  <span>Account <small>(optional)</small></span>
                  <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                    <option value="">Leave unassigned</option>
                    {data?.accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  <small>Assign this transaction to update an account balance.</small>
                </label>

                {!matchingCategories.length && (
                  <div className="create-category-box">
                    <label className="dashboard-field">
                      <span>New {transactionType.toLowerCase()} category</span>
                      <input
                        value={newCategoryName}
                        onChange={(event) => setNewCategoryName(event.target.value)}
                        minLength={2}
                        maxLength={80}
                        placeholder={transactionType === "EXPENSE" ? "e.g. Groceries" : "e.g. Salary"}
                        required
                      />
                    </label>
                    {categoryError && <p className="auth-error" role="alert">{categoryError}</p>}
                    <button className="button button-secondary category-create-button" type="button" onClick={() => void handleCreateCategory()} disabled={creatingCategory}>
                      {creatingCategory ? "Adding…" : "Add category"}
                    </button>
                  </div>
                )}

                <label className="dashboard-field">
                  <span>Description <small>(optional)</small></span>
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={500}
                    placeholder="What was this for?"
                  />
                </label>

                <label className="dashboard-field">
                  <span>Merchant <small>(optional)</small></span>
                  <input
                    value={merchant}
                    onChange={(event) => setMerchant(event.target.value)}
                    maxLength={120}
                    placeholder="e.g. Local shop"
                  />
                </label>

                <label className="dashboard-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={occurredOn}
                    onChange={(event) => setOccurredOn(event.target.value)}
                    required
                  />
                </label>

                <button className="button button-primary auth-submit" type="submit" disabled={saving || loading || !data}>
                  {saving ? "Saving…" : "Save transaction"} <Plus size={16} />
                </button>
              </form>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: string;
  tone: "balance" | "income" | "expenses" | "count";
  loading: boolean;
}) {
  return (
    <article className={`summary-card summary-${tone}`}>
      <span>{label}</span>
      <strong>{loading ? "Loading…" : value}</strong>
      {!loading && tone === "income" && <ArrowDownRight size={17} aria-hidden="true" />}
      {!loading && tone === "expenses" && <ArrowUpRight size={17} aria-hidden="true" />}
    </article>
  );
}

function TransactionRow({
  transaction,
  categories,
  accounts,
  onChanged,
}: {
  transaction: Transaction;
  categories: Category[];
  accounts: FinancialAccount[];
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => ({
    type: transaction.type,
    categoryId: transaction.categoryId,
    accountId: transaction.accountId ?? "",
    amount: transaction.amount,
    description: transaction.description ?? "",
    merchant: transaction.merchant ?? "",
    occurredOn: localDateString(new Date(transaction.occurredAt)),
  }));
  const editCategories = categories.filter((category) => category.type === draft.type);
  const isIncome = transaction.type === "INCOME";
  const title = transaction.merchant || transaction.description || transaction.category.name;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateTransaction(transaction.id, {
        type: draft.type,
        categoryId: draft.categoryId,
        accountId: draft.accountId || null,
        amount: draft.amount,
        description: draft.description,
        merchant: draft.merchant,
        occurredAt: new Date(`${draft.occurredOn}T12:00:00`).toISOString(),
      });
      setEditing(false);
      await onChanged();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await deleteTransaction(transaction.id);
      setConfirmDelete(false);
      await onChanged();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="live-transaction-entry">
      <div className="live-transaction-row">
        <span className={`live-transaction-icon ${isIncome ? "live-income-icon" : ""}`}>
          {isIncome ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}
        </span>
        <span className="live-transaction-copy">
          <strong>{title}</strong>
          <small>{transaction.category.name} · {formatDate(transaction.occurredAt)}</small>
        </span>
        <strong className={isIncome ? "live-income-value" : "live-expense-value"}>
          {isIncome ? "+" : "−"}{formatMoney(transaction.amount)}
        </strong>
        <div className="transaction-actions">
          <button
            className="icon-button"
            type="button"
            aria-label={`Edit ${title}`}
            title="Edit transaction"
            onClick={() => {
              setError(null);
              setConfirmDelete(false);
              setEditing((current) => !current);
            }}
          >
            {editing ? <X size={15} /> : <Pencil size={15} />}
          </button>
          <button
            className="icon-button delete-transaction-button"
            type="button"
            aria-label={`Delete ${title}`}
            title="Delete transaction"
            onClick={() => {
              setError(null);
              setEditing(false);
              setConfirmDelete(true);
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {error && <p className="transaction-action-error" role="alert">{error}</p>}

      {editing && (
        <form className="transaction-edit-form" onSubmit={(event) => void handleSave(event)}>
          <div className="edit-form-grid">
            <label className="dashboard-field">
              <span>Type</span>
              <select
                value={draft.type}
                onChange={(event) => {
                  const type = event.target.value === "INCOME" ? "INCOME" : "EXPENSE";
                  const nextCategory = categories.find((category) => category.type === type);
                  setDraft((current) => ({
                    ...current,
                    type,
                    categoryId: nextCategory?.id ?? "",
                  }));
                }}
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </label>
            <label className="dashboard-field">
              <span>Category</span>
              <select
                value={draft.categoryId}
                onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}
                required
              >
                <option value="">Choose a category</option>
                {editCategories.map((category) => (
                  <option value={category.id} key={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="dashboard-field">
              <span>Account <small>(optional)</small></span>
              <select
                value={draft.accountId}
                onChange={(event) => setDraft((current) => ({ ...current, accountId: event.target.value }))}
              >
                <option value="">Leave unassigned</option>
                {accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
              </select>
            </label>
            <label className="dashboard-field">
              <span>Amount (KSh)</span>
              <input
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={draft.amount}
                onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                required
              />
            </label>
            <label className="dashboard-field">
              <span>Date</span>
              <input
                type="date"
                value={draft.occurredOn}
                onChange={(event) => setDraft((current) => ({ ...current, occurredOn: event.target.value }))}
                required
              />
            </label>
            <label className="dashboard-field">
              <span>Description</span>
              <input
                value={draft.description}
                maxLength={500}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label className="dashboard-field">
              <span>Merchant</span>
              <input
                value={draft.merchant}
                maxLength={120}
                onChange={(event) => setDraft((current) => ({ ...current, merchant: event.target.value }))}
              />
            </label>
          </div>
          <p className="edit-clear-note">Leave description or merchant blank to clear it.</p>
          <div className="edit-form-actions">
            <button className="button button-primary" type="submit" disabled={saving || !draft.categoryId}>
              <Check size={15} /> {saving ? "Saving…" : "Save changes"}
            </button>
            <button className="button button-secondary" type="button" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {confirmDelete && (
        <div className="delete-confirmation" role="group" aria-label={`Confirm deleting ${title}`}>
          <span>Delete this transaction? This cannot be undone.</span>
          <button className="button delete-confirm-button" type="button" onClick={() => void handleDelete()} disabled={deleting}>
            <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete"}
          </button>
          <button className="button button-secondary" type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </button>
        </div>
      )}
    </article>
  );
}
