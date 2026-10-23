import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CalendarDays, Check, Plus, RefreshCw, Target, Trash2 } from "lucide-react";
import { createSavingsGoal, deleteSavingsGoal, listSavingsGoals, updateSavingsGoal } from "../../services/savingsGoals";
import type { ApiErrorResponse, SavingsGoal } from "../../types/api";
import "../../styles/auth.css";

function formatMoney(value: string | number): string {
  return `KSh ${Number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDeadline(value: string | null): string {
  if (!value) return "No target date";
  return `Target ${new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))}`;
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

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [progressDrafts, setProgressDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function loadGoals() {
    setLoading(true);
    setError(null);
    try {
      setGoals(await listSavingsGoals());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    listSavingsGoals()
      .then((result) => {
        if (active) setGoals(result);
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
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createSavingsGoal({
        name: name.trim(),
        targetAmount,
        currentAmount,
        deadline: deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null,
      });
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setDeadline("");
      await loadGoals();
    } catch (createError) {
      setFormError(errorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleProgress(goal: SavingsGoal) {
    const amount = progressDrafts[goal.id] ?? goal.currentAmount;
    setBusyId(goal.id);
    setFormError(null);
    try {
      await updateSavingsGoal(goal.id, { currentAmount: amount });
      setProgressDrafts((current) => {
        const next = { ...current };
        delete next[goal.id];
        return next;
      });
      await loadGoals();
    } catch (updateError) {
      setFormError(errorMessage(updateError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(goalId: string) {
    setBusyId(goalId);
    setFormError(null);
    try {
      await updateSavingsGoal(goalId, { status: "CANCELLED" });
      await loadGoals();
    } catch (updateError) {
      setFormError(errorMessage(updateError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(goalId: string) {
    setBusyId(goalId);
    setFormError(null);
    try {
      await deleteSavingsGoal(goalId);
      setConfirmDeleteId(null);
      await loadGoals();
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
          <span className="auth-kicker">SAVE WITH PURPOSE</span>
          <h1>Savings goals</h1>
          <p>Give your savings a target and track your progress one step at a time.</p>
        </div>
        <span className="dashboard-period"><Target size={16} /> {goals.filter((goal) => goal.status === "ACTIVE").length} active goals</span>
      </section>

      {error ? (
        <section className="dashboard-message dashboard-error" role="alert">
          <AlertCircle size={20} />
          <div><strong>We couldn’t load savings goals</strong><p>{error}</p></div>
          <button className="button button-secondary" onClick={() => void loadGoals()}>
            <RefreshCw size={15} /> Try again
          </button>
        </section>
      ) : (
        <section className="savings-page-grid">
          <div className="dashboard-card">
            <div className="dashboard-card-heading">
              <div><span className="panel-label">YOUR PLANS</span><h2>All savings goals</h2></div>
              <span className="budget-count">{loading ? "…" : goals.length}</span>
            </div>
            {formError && <p className="auth-error" role="alert">{formError}</p>}
            {loading ? (
              <p className="dashboard-empty">Loading savings goals…</p>
            ) : goals.length === 0 ? (
              <div className="dashboard-empty">
                <Target size={25} />
                <strong>No savings goals yet</strong>
                <span>Create a goal to start tracking progress.</span>
              </div>
            ) : (
              <div className="savings-goal-list">
                {goals.map((goal) => {
                  const active = goal.status === "ACTIVE";
                  return (
                    <article className="savings-goal-item" key={goal.id}>
                      <div className="savings-goal-heading">
                        <div>
                          <span className={`goal-status goal-status-${goal.status.toLowerCase()}`}>{goal.status.toLowerCase()}</span>
                          <h3>{goal.name}</h3>
                          <small><CalendarDays size={13} /> {formatDeadline(goal.deadline)}</small>
                        </div>
                        <button
                          className="icon-button delete-transaction-button"
                          type="button"
                          aria-label={`Delete ${goal.name}`}
                          onClick={() => setConfirmDeleteId(goal.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="goal-amount-line">
                        <strong>{formatMoney(goal.currentAmount)}</strong>
                        <span>of {formatMoney(goal.targetAmount)}</span>
                      </div>
                      <div
                        className="budget-progress-track"
                        role="progressbar"
                        aria-label={`${goal.name} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(100, goal.progressPercentage)}
                      >
                        <span className="budget-progress-fill" style={{ width: `${Math.min(100, goal.progressPercentage)}%` }} />
                      </div>
                      <div className="budget-meta-line">
                        <span>{formatMoney(goal.remainingAmount)} to go</span>
                        <span>{goal.progressPercentage.toFixed(0)}%</span>
                      </div>
                      {active && (
                        <div className="goal-actions">
                          <label className="dashboard-field">
                            <span>Update saved amount (KSh)</span>
                            <input
                              type="number"
                              min="0"
                              max={goal.targetAmount}
                              step="0.01"
                              value={progressDrafts[goal.id] ?? goal.currentAmount}
                              onChange={(event) => setProgressDrafts((current) => ({ ...current, [goal.id]: event.target.value }))}
                            />
                          </label>
                          <div className="goal-buttons">
                            <button className="button button-primary" type="button" disabled={busyId === goal.id} onClick={() => void handleProgress(goal)}>
                              <Check size={15} /> {busyId === goal.id ? "Saving…" : "Update progress"}
                            </button>
                            <button className="button button-secondary" type="button" disabled={busyId === goal.id} onClick={() => void handleCancel(goal.id)}>
                              Cancel goal
                            </button>
                          </div>
                        </div>
                      )}
                      {confirmDeleteId === goal.id && (
                        <div className="delete-confirmation" role="group" aria-label={`Confirm deleting ${goal.name}`}>
                          <span>Delete this goal and its progress?</span>
                          <button className="button delete-confirm-button" type="button" disabled={busyId === goal.id} onClick={() => void handleDelete(goal.id)}>
                            <Trash2 size={14} /> {busyId === goal.id ? "Deleting…" : "Delete"}
                          </button>
                          <button className="button button-secondary" type="button" onClick={() => setConfirmDeleteId(null)}>Keep goal</button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-heading">
              <div><span className="panel-label">YOUR NEXT MILESTONE</span><h2>Create a savings goal</h2></div>
              <span className="account-next-icon"><Plus size={20} /></span>
            </div>
            <form className="transaction-form" onSubmit={(event) => void handleCreate(event)}>
              <label className="dashboard-field">
                <span>Goal name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} placeholder="e.g. Emergency fund" required />
              </label>
              <label className="dashboard-field">
                <span>Target amount (KSh)</span>
                <input type="number" min="0.01" max="9999999999.99" step="0.01" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="0.00" required />
              </label>
              <label className="dashboard-field">
                <span>Already saved (KSh)</span>
                <input type="number" min="0" max={targetAmount || undefined} step="0.01" value={currentAmount} onChange={(event) => setCurrentAmount(event.target.value)} required />
              </label>
              <label className="dashboard-field">
                <span>Target date <small>(optional)</small></span>
                <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
              </label>
              {formError && <p className="auth-error" role="alert">{formError}</p>}
              <button className="button button-primary auth-submit" type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create goal"} <Plus size={16} />
              </button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
