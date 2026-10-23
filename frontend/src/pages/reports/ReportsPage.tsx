import axios from "axios";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, RefreshCw, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardSummary } from "../../services/dashboard";
import { listTransactions } from "../../services/transactions";
import type {
  ApiErrorResponse,
  DashboardSummary,
  Transaction,
} from "../../types/api";
import "../../styles/auth.css";

interface ReportData {
  summary: DashboardSummary;
  transactions: Transaction[];
}

interface CategoryReport {
  name: string;
  income: number;
  expenses: number;
}

const chartColors = ["#2e7657", "#75a88a", "#d49a47", "#bd6359", "#60879a", "#8b78a8", "#a57c65", "#73806f"];
const chartTick = { fill: "var(--muted)", fontSize: 11 };
const chartTooltip = {
  contentStyle: {
    backgroundColor: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--ink)",
  },
  labelStyle: { color: "var(--ink)" },
  itemStyle: { color: "var(--text-subtle)" },
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatMoney(value: string | number): string {
  return `KSh ${Number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-KE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data.error?.message;
    if (message) return message;
    if (!error.response) return "Unable to reach the API. Check your connection and try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

async function fetchReport(month: string): Promise<ReportData> {
  const { from, to } = monthBounds(month);
  const transactionFrom = `${from}T00:00:00.000Z`;
  const transactionTo = `${to}T23:59:59.999Z`;
  const [summary, firstPage] = await Promise.all([
    getDashboardSummary({ from, to }),
    listTransactions({
      from: transactionFrom,
      to: transactionTo,
      page: 1,
      limit: 100,
      sortOrder: "asc",
    }),
  ]);

  const transactions = [...firstPage.data];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const nextPage = await listTransactions({
      from: transactionFrom,
      to: transactionTo,
      page,
      limit: 100,
      sortOrder: "asc",
    });
    transactions.push(...nextPage.data);
  }

  return { summary, transactions };
}

function categoryBreakdown(transactions: Transaction[]): CategoryReport[] {
  const categories = new Map<string, CategoryReport>();
  for (const transaction of transactions) {
    const key = `${transaction.type}:${transaction.category.name}`;
    const row = categories.get(key) ?? {
      name: transaction.category.name,
      income: 0,
      expenses: 0,
    };
    const amount = Number(transaction.amount);
    if (transaction.type === "INCOME") row.income += amount;
    else row.expenses += amount;
    categories.set(key, row);
  }
  return [...categories.values()].sort(
    (left, right) => right.income + right.expenses - (left.income + left.expenses),
  );
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${month}:${reloadKey}`;

  useEffect(() => {
    let active = true;

    fetchReport(month)
      .then((result) => {
        if (active) {
          setReport(result);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoadedKey(`${month}:${reloadKey}`);
      });

    return () => {
      active = false;
    };
  }, [month, reloadKey]);

  const loading = loadedKey !== requestKey;
  const categories = report ? categoryBreakdown(report.transactions) : [];
  const expenseCategories = categories
    .filter((category) => category.expenses > 0)
    .map((category) => ({ name: category.name, value: category.expenses }));

  return (
    <section className="reports-page">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">UNDERSTAND YOUR MONEY</span>
          <h1>Reports</h1>
          <p>Explore your income and spending by category for the selected month.</p>
        </div>
        <label className="dashboard-period reports-period">
          <CalendarDays size={16} aria-hidden="true" />
          <span>Report month</span>
          <input
            aria-label="Report month"
            type="month"
            value={month}
            onChange={(event) => {
              if (event.target.value) setMonth(event.target.value);
            }}
          />
        </label>
      </div>

      {!loading && error && (
        <div className="dashboard-error" role="alert">
          <p>{error}</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            <RefreshCw size={15} /> Retry report
          </button>
        </div>
      )}

      <div className="reports-month-label">{formatMonth(month)}</div>
      <section className="summary-grid reports-summary" aria-label="Monthly report summary">
        <article className="summary-card summary-income">
          <span>Total income</span>
          <strong>{loading ? "Loading…" : formatMoney(report?.summary.summary.totalIncome ?? 0)}</strong>
          <ArrowUpRight size={18} aria-hidden="true" />
        </article>
        <article className="summary-card summary-expenses">
          <span>Total expenses</span>
          <strong>{loading ? "Loading…" : formatMoney(report?.summary.summary.totalExpenses ?? 0)}</strong>
          <ArrowDownRight size={18} aria-hidden="true" />
        </article>
        <article className="summary-card summary-balance">
          <span>Net balance</span>
          <strong>{loading ? "Loading…" : formatMoney(report?.summary.summary.balance ?? 0)}</strong>
          <Wallet size={18} aria-hidden="true" />
        </article>
        <article className="summary-card summary-count">
          <span>Transactions</span>
          <strong>{loading ? "Loading…" : report?.summary.transactionCount ?? 0}</strong>
          <BarChart3 size={18} aria-hidden="true" />
        </article>
      </section>

      {loading ? (
        <div className="dashboard-card reports-empty" role="status">Loading your monthly report…</div>
      ) : error ? null : !report?.transactions.length ? (
        <div className="dashboard-card reports-empty">
          <strong>No transactions for {formatMonth(month)}</strong>
          <p>Once you record income or spending for this month, your charts will appear here.</p>
        </div>
      ) : (
        <div className="reports-chart-grid">
          <section className="dashboard-card reports-chart-card">
            <div className="reports-card-heading">
              <div>
                <span className="eyebrow">CATEGORY TOTALS</span>
                <h2>Income and expenses</h2>
              </div>
            </div>
            <div className="reports-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} margin={{ top: 12, right: 12, left: 8, bottom: 6 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={chartTick}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={chartTick}
                    tickFormatter={(value: number) => `KSh ${Number(value).toLocaleString("en-KE")}`}
                    width={90}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value ?? 0))}
                    contentStyle={chartTooltip.contentStyle}
                    labelStyle={chartTooltip.labelStyle}
                    itemStyle={chartTooltip.itemStyle}
                  />
                  <Legend wrapperStyle={{ color: "var(--text-subtle)" }} />
                  <Bar dataKey="income" name="Income" fill="#2e7657" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#d49a47" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dashboard-card reports-chart-card">
            <div className="reports-card-heading">
              <div>
                <span className="eyebrow">SPENDING MIX</span>
                <h2>Expenses by category</h2>
              </div>
            </div>
            {expenseCategories.length ? (
              <div className="reports-chart reports-pie-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="52%"
                      outerRadius="78%"
                      paddingAngle={2}
                    >
                      {expenseCategories.map((category, index) => (
                        <Cell key={category.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value ?? 0))}
                      contentStyle={chartTooltip.contentStyle}
                      labelStyle={chartTooltip.labelStyle}
                      itemStyle={chartTooltip.itemStyle}
                    />
                    <Legend wrapperStyle={{ color: "var(--text-subtle)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="reports-no-expenses">No expenses to chart for this month.</p>
            )}
          </section>

          <section className="dashboard-card reports-transactions-card">
            <div className="reports-card-heading">
              <div>
                <span className="eyebrow">MONTHLY ACTIVITY</span>
                <h2>Transactions</h2>
              </div>
              <span>{report.transactions.length} records</span>
            </div>
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Category</th>
                    <th scope="col">Type</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        {new Intl.DateTimeFormat("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(transaction.occurredAt))}
                      </td>
                      <td>{transaction.category.name}</td>
                      <td>{transaction.type === "INCOME" ? "Income" : "Expense"}</td>
                      <td className={transaction.type === "INCOME" ? "reports-income-amount" : "reports-expense-amount"}>
                        {transaction.type === "INCOME" ? "+" : "−"}{formatMoney(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
