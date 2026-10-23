import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import {
  deleteTransaction,
  getTransactionQuality,
} from "../../services/transactions";
import type {
  ApiErrorResponse,
  DuplicateTransactionGroup,
  TransactionQualityResponse,
} from "../../types/api";
import "../../styles/auth.css";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data.error?.message;
    if (message) return message;
    if (!error.response) return "Unable to reach the API. Check your connection and try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

function formatMoney(value: string): string {
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

function duplicateTitle(group: DuplicateTransactionGroup): string {
  const first = group.transactions[0];
  return first.merchant || first.description || first.category.name;
}

export default function DataQualityPage() {
  const [quality, setQuality] = useState<TransactionQualityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [keptGroups, setKeptGroups] = useState<Set<string>>(() => new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      setQuality(await getTransactionQuality());
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getTransactionQuality()
      .then((result) => {
        if (active) setQuality(result);
      })
      .catch((error: unknown) => {
        if (active) setPageError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const duplicateGroups = useMemo(
    () => (quality?.duplicates ?? []).filter(({ key }) => !keptGroups.has(key)),
    [keptGroups, quality],
  );

  function keepBoth(key: string) {
    setKeptGroups((current) => new Set(current).add(key));
    setNotice("Marked as intentional. No transactions were changed.");
    setActionError(null);
  }

  async function removeDuplicate(group: DuplicateTransactionGroup, id: string) {
    const transaction = group.transactions.find((item) => item.id === id);
    if (!transaction) {
      setActionError("That transaction is no longer in this duplicate group. Refresh and try again.");
      return;
    }
    const title = transaction.merchant || transaction.description || transaction.category.name;
    if (!window.confirm(`Delete "${title}" for ${formatMoney(transaction.amount)} on ${formatDate(transaction.occurredAt)}? This cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    setActionError(null);
    setNotice(null);
    try {
      await deleteTransaction(id);
      setKeptGroups((current) => {
        const next = new Set(current);
        next.delete(group.key);
        return next;
      });
      await reload();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  const total = quality?.summary.totalTransactions ?? 0;
  const categorized = quality?.summary.categorizedTransactions ?? 0;
  const dated = quality?.summary.datedTransactions ?? 0;
  const categoryCoverage = total ? Math.round((categorized / total) * 100) : null;
  const dateCoverage = total ? Math.round((dated / total) * 100) : null;

  return (
    <section className="data-quality-page">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">CLEAR, TRUSTWORTHY RECORDS</span>
          <h1>Data quality</h1>
          <p>Review transaction completeness and check possible duplicates before relying on your summaries.</p>
        </div>
      </div>

      {pageError && (
        <section className="dashboard-message dashboard-error" role="alert">
          <AlertCircle size={20} />
          <div><strong>We couldn’t check your transaction data</strong><p>{pageError}</p></div>
          <button className="button button-secondary" type="button" onClick={() => void reload()}>
            <RefreshCw size={15} /> Try again
          </button>
        </section>
      )}

      {!pageError && (
        <>
          <section className="summary-grid quality-summary" aria-label="Transaction data quality summary">
            <article className="summary-card quality-stat-card">
              <span>Transactions checked</span>
              <strong>{loading ? "…" : total.toLocaleString("en-KE")}</strong>
              <small>Across your transaction history</small>
            </article>
            <article className="summary-card quality-stat-card">
              <span>Transactions categorized</span>
              <strong>{loading ? "…" : categoryCoverage === null ? "—" : `${categoryCoverage}%`}</strong>
              <small>{loading ? "Checking records…" : `${categorized} of ${total} have a category`}</small>
            </article>
            <article className="summary-card quality-stat-card">
              <span>Transactions with dates</span>
              <strong>{loading ? "…" : dateCoverage === null ? "—" : `${dateCoverage}%`}</strong>
              <small>{loading ? "Checking records…" : `${dated} of ${total} have a date`}</small>
            </article>
            <article className={`summary-card quality-stat-card ${duplicateGroups.length ? "quality-stat-warning" : ""}`}>
              <span>Possible duplicate groups</span>
              <strong>{loading ? "…" : duplicateGroups.length}</strong>
              <small>{loading ? "Checking records…" : "Review before removing any record"}</small>
            </article>
          </section>

          {actionError && <p className="auth-error" role="alert">{actionError}</p>}
          {notice && <p className="quality-notice" role="status"><CheckCircle2 size={16} />{notice}</p>}

          <section className="dashboard-card quality-review-card">
            <div className="dashboard-card-heading">
              <div>
                <span className="panel-label">REVIEW SUGGESTIONS</span>
                <h2>Possible duplicate transactions</h2>
              </div>
            </div>
            <p className="quality-explanation">
              A match uses the same date, type, amount, and category—the same cautious check used during statement import. It is only a suggestion; review the details before deleting anything. Keep both dismisses a warning for this visit without changing your records.
            </p>

            {loading ? (
              <p className="dashboard-empty">Checking your transactions…</p>
            ) : duplicateGroups.length ? (
              <div className="quality-duplicate-list">
                {duplicateGroups.map((group) => {
                  const first = group.transactions[0];
                  return (
                    <article className="quality-duplicate-group" key={group.key}>
                      <div className="quality-duplicate-heading">
                        <span className="quality-duplicate-icon"><AlertCircle size={18} /></span>
                        <div>
                          <strong>{duplicateTitle(group)}</strong>
                          <small>{formatDate(first.occurredAt)} · {first.category.name} · {group.transactions.length} matching records</small>
                        </div>
                      </div>
                      <div className="quality-duplicate-records">
                        {group.transactions.map((transaction) => (
                          <div className="quality-duplicate-record" key={transaction.id}>
                            <div>
                              <strong>{formatMoney(transaction.amount)}</strong>
                              <small>{transaction.merchant || transaction.description || transaction.type}</small>
                            </div>
                            <button
                              className="button button-secondary quality-delete-button"
                              type="button"
                              disabled={deletingId !== null}
                              onClick={() => void removeDuplicate(group, transaction.id)}
                            >
                              <Trash2 size={14} />
                              {deletingId === transaction.id ? "Removing…" : "Remove this record"}
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        className="button button-secondary quality-keep-button"
                        type="button"
                        disabled={deletingId !== null}
                        onClick={() => keepBoth(group.key)}
                      >
                        Keep both
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="quality-empty-state">
                <span><CheckCircle2 size={20} /></span>
                <div>
                  <strong>{total ? "No possible duplicates to review" : "Add transactions to start checking"}</strong>
                  <p>{total ? "No matching records were found in your transaction history." : "Once you have transactions, we’ll check them for possible duplicates."}</p>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
