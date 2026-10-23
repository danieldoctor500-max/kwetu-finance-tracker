import { ArrowRight, BarChart3 } from "lucide-react";
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
import { Link } from "react-router-dom";
import type { Transaction } from "../../types/api";

interface OverviewChartsProps {
  transactions: Transaction[];
  loading: boolean;
  monthLabel: string;
}

interface CategoryTotals {
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

function categoryBreakdown(transactions: Transaction[]): CategoryTotals[] {
  const categories = new Map<string, CategoryTotals>();
  for (const transaction of transactions) {
    const key = `${transaction.type}:${transaction.category.name}`;
    const row = categories.get(key) ?? {
      name: transaction.category.name,
      income: 0,
      expenses: 0,
    };
    if (transaction.type === "INCOME") row.income += Number(transaction.amount);
    else row.expenses += Number(transaction.amount);
    categories.set(key, row);
  }
  return [...categories.values()].sort(
    (left, right) => right.income + right.expenses - (left.income + left.expenses),
  );
}

function formatMoney(value: number): string {
  return `KSh ${Number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatAxisMoney(value: number): string {
  return `KSh ${Number(value).toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  })}`;
}

export default function OverviewCharts({
  transactions,
  loading,
  monthLabel,
}: OverviewChartsProps) {
  if (loading) {
    return (
      <div className="dashboard-card overview-chart-empty" role="status">
        Loading your monthly charts…
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="dashboard-card overview-chart-empty">
        <BarChart3 size={22} />
        <div>
          <strong>Your charts will appear here</strong>
          <span>Add or import transactions for {monthLabel} to see income and spending by category.</span>
        </div>
        <Link className="overview-report-link" to="/app/reports">
          Open reports <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const categories = categoryBreakdown(transactions);
  const expenseCategories = categories
    .filter((category) => category.expenses > 0)
    .map((category) => ({ name: category.name, value: category.expenses }));

  return (
    <>
      <section className="dashboard-card reports-chart-card">
        <div className="reports-card-heading">
          <div>
            <span className="eyebrow">CATEGORY TOTALS</span>
            <h2>Income and expenses</h2>
          </div>
          <Link className="overview-report-link" to="/app/reports">
            Reports <ArrowRight size={14} />
          </Link>
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
                tickFormatter={(value: number) => formatAxisMoney(Number(value))}
                width={78}
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
          <div className="overview-chart-empty">No expenses to chart this month yet.</div>
        )}
      </section>
    </>
  );
}
