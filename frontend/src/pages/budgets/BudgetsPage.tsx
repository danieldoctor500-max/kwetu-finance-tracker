import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CalendarDays, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { listCategories } from "../../services/categories";
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
} from "../../services/budgets";
import type { ApiErrorResponse, Budget, Category } from "../../types/api";
import "../../styles/auth.css";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
  }).format(new Date(year, month - 1, 1));
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

async function fetchBudgetData(month: string) {
  const [budgets, categories] = await Promise.all([
    listBudgets(month),
    listCategories("EXPENSE"),
  ]);
  return { budgets, categories };
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function loadData(selectedMonth: string) {
    setLoading(true);
    setError(null);
    try {
      const { budgets: budgetList, categories: allCategories } = await fetchBudgetData(selectedMonth);
      setBudgets(budgetList);
      setCategories(allCategories);
      setCategoryId((current) =>
        allCategories.some((category) => category.id === current)
          ? current
          : allCategories[0]?.id ?? "",
      );
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchBudgetData(month)
      .then(({ budgets: budgetList, categories: allCategories }) => {
        if (!active) return;
        setBudgets(budgetList);
        setCategories(allCategories);
        setCategoryId((current) =>
          allCategories.some((category) => category.id === current)
            ? current
            : allCategories[0]?.id ?? "",
        );
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createBudget({ categoryId, periodMonth: month, amount });
      setAmount("");
      await loadData(month);
    } catch (createError) {
      setFormError(errorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(budgetId: string) {
    setBusyId(budgetId);
    setFormError(null);
    try {
      await updateBudget(budgetId, editAmount);
      setEditingId(null);
      await loadData(month);
    } catch (updateError) {
      setFormError(errorMessage(updateError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(budgetId: string) {
    setBusyId(budgetId);
    setFormError(null);
    try {
      await deleteBudget(budgetId);
      setConfirmDeleteId(null);
      await loadData(month);
    } catch (deleteError) {
      setFormError(errorMessage(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <span className="auth-kicker">PLAN YOUR SPENDING</span>
          <h1>Budgets</h1>
          <p>Set monthly limits for your expense categories and track what you’ve used.</p>
        </div>
        <label className="dashboard-period budget-month-select">
          <CalendarDays size={16} />
          <span className="visually-hidden">Budget month</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
      </section>

      {error ? (
        <section className="dashboard-message dashboard-error" role="alert">
          <AlertCircle size={20} />
          <div><strong>We couldn’t load budgets</strong><p>{error}</p></div>
          <button className="button button-secondary" onClick={() => void loadData(month)}>
            <RefreshCw size={15} /> Try again
          </button>
        </section>
      ) : (
        <section className="budget-page-grid">
          <div className="dashboard-card">
            <div className="dashboard-card-heading">
              <div><span className="panel-label">{formatMonth(month).toUpperCase()}</span><h2>Category budgets</h2></div>
              <span className="budget-count">{loading ? "…" : budgets.length}</span>
            </div>

            {formError && <p className="auth-error" role="alert">{formError}</p>}

            {loading ? (
              <p className="dashboard-empty">Loading budgets…</p>
            ) : budgets.length === 0 ? (
              <div className="dashboard-empty">
                <CalendarDays size={25} />
                <strong>No budgets for {formatMonth(month)}</strong>
                <span>Create a budget to keep an eye on category spending.</span>
              </div>
            ) : (
              <div className="budget-list">
                {budgets.map((budget) => (
                  <article className="budget-item" key={budget.id}>
                    <div className="budget-item-heading">
                      <div><strong>{budget.category.name}</strong><small>{formatMonth(budget.periodMonth)}</small></div>
                      <div className="budget-item-actions">
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Edit ${budget.category.name} budget`}
                          onClick={() => {
                            setEditingId(editingId === budget.id ? null : budget.id);
                            setEditAmount(budget.amount);
                            setConfirmDeleteId(null);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button delete-transaction-button"
                          type="button"
                          aria-label={`Delete ${budget.category.name} budget`}
                          onClick={() => {
                            setConfirmDeleteId(budget.id);
                            setEditingId(null);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="budget-amount-line">
                      <strong>{formatMoney(budget.spent)}</strong>
                      <span>of {formatMoney(budget.amount)}</span>
                    </div>
                    <div
                      className="budget-progress-track"
                      role="progressbar"
                      aria-label={`${budget.category.name} budget usage`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(100, budget.usagePercentage)}
                    >
                      <span
                        className={budget.isOverBudget ? "budget-progress-fill over-budget" : "budget-progress-fill"}
                        style={{ width: `${Math.min(100, budget.usagePercentage)}%` }}
                      />
                    </div>
                    <div className="budget-meta-line">
                      <span className={budget.isOverBudget ? "over-budget-text" : ""}>
                        {budget.isOverBudget
                          ? `${formatMoney(Math.abs(Number(budget.remaining)))} over budget`
                          : `${formatMoney(budget.remaining)} remaining`}
                      </span>
                      <span>{budget.usagePercentage.toFixed(0)}%</span>
                    </div>
                    {editingId === budget.id && (
                      <div className="budget-inline-form">
                        <label className="dashboard-field">
                          <span>New monthly limit (KSh)</span>
                          <input
                            type="number"
                            min="0.01"
                            max="9999999999.99"
                            step="0.01"
                            value={editAmount}
                            onChange={(event) => setEditAmount(event.target.value)}
                          />
                        </label>
                        <button className="button button-primary" type="button" disabled={busyId === budget.id} onClick={() => void handleUpdate(budget.id)}>
                          {busyId === budget.id ? "Saving…" : "Save limit"}
                        </button>
                      </div>
                    )}
                    {confirmDeleteId === budget.id && (
                      <div className="delete-confirmation" role="group" aria-label="Confirm budget deletion">
                        <span>Delete this monthly budget?</span>
                        <button className="button delete-confirm-button" type="button" disabled={busyId === budget.id} onClick={() => void handleDelete(budget.id)}>
                          <Trash2 size={14} /> {busyId === budget.id ? "Deleting…" : "Delete"}
                        </button>
                        <button className="button button-secondary" type="button" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-heading">
              <div><span className="panel-label">MAKE A PLAN</span><h2>Create a budget</h2></div>
              <span className="account-next-icon"><Plus size={20} /></span>
            </div>
            {categories.length === 0 && !loading ? (
              <div className="dashboard-empty budget-no-category">
                <strong>No expense categories yet</strong>
                <span><Link to="/app/categories">Create an expense category</Link> before setting a budget.</span>
              </div>
            ) : (
              <form className="transaction-form" onSubmit={(event) => void handleCreate(event)}>
                <label className="dashboard-field">
                  <span>Expense category</span>
                  <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <label className="dashboard-field">
                  <span>Monthly limit (KSh)</span>
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
                {formError && <p className="auth-error" role="alert">{formError}</p>}
                <button className="button button-primary auth-submit" type="submit" disabled={saving || loading || !categories.length}>
                  {saving ? "Creating…" : "Create budget"} <Plus size={16} />
                </button>
              </form>
            )}
          </div>
        </section>
      )}
    </>
  );
}
