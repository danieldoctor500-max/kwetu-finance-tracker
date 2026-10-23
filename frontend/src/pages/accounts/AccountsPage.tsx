import axios from "axios";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeftRight, CircleAlert, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";
import {
  createAccount,
  createTransfer,
  deleteAccount,
  deleteTransfer,
  listAccounts,
  listTransfers,
} from "../../services/accounts";
import type {
  ApiErrorResponse,
  FinancialAccount,
  FinancialAccountType,
  Transfer,
} from "../../types/api";
import "../../styles/auth.css";

interface AccountData {
  accounts: FinancialAccount[];
  totalBalance: string;
  transfers: Transfer[];
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function formatMoney(value: string): string {
  return `KSh ${Number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function accountTypeLabel(type: FinancialAccountType): string {
  return {
    CASH: "Cash",
    BANK: "Bank",
    MOBILE_MONEY: "Mobile money",
    OTHER: "Other",
  }[type];
}

async function fetchAccountData(): Promise<AccountData> {
  const [accountResponse, transfers] = await Promise.all([
    listAccounts(),
    listTransfers(),
  ]);
  return {
    accounts: accountResponse.data,
    totalBalance: accountResponse.totalBalance,
    transfers,
  };
}

export default function AccountsPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<FinancialAccountType>("MOBILE_MONEY");
  const [provider, setProvider] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const [transferDate, setTransferDate] = useState(() => localDateString(new Date()));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const accountData = await fetchAccountData();
      setData(accountData);
      setFromAccountId((current) =>
        accountData.accounts.some((account) => account.id === current)
          ? current
          : accountData.accounts[0]?.id ?? "",
      );
      setToAccountId((current) =>
        accountData.accounts.some((account) => account.id === current)
          ? current
          : accountData.accounts[1]?.id ?? "",
      );
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAccountData()
      .then((accountData) => {
        if (!active) return;
        setData(accountData);
        setFromAccountId(accountData.accounts[0]?.id ?? "");
        setToAccountId(accountData.accounts[1]?.id ?? "");
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

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await createAccount({
        name: name.trim(),
        type,
        provider: provider.trim() || undefined,
        openingBalance,
      });
      setName("");
      setProvider("");
      setOpeningBalance("0");
      await reload();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (fromAccountId === toAccountId) {
      setFormError("Choose two different accounts for a transfer.");
      return;
    }
    setSaving(true);
    try {
      await createTransfer({
        fromAccountId,
        toAccountId,
        amount: transferAmount,
        description: transferDescription.trim() || undefined,
        occurredAt: new Date(`${transferDate}T12:00:00`).toISOString(),
      });
      setTransferAmount("");
      setTransferDescription("");
      await reload();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount(account: FinancialAccount) {
    const balance = account.balance ?? account.openingBalance;
    if (!window.confirm(`Delete "${account.name}" with a current balance of ${formatMoney(balance)}? This cannot be undone.`)) return;
    setFormError(null);
    try {
      await deleteAccount(account.id);
      await reload();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function handleDeleteTransfer(transfer: Transfer) {
    if (!window.confirm(`Remove this KSh ${transfer.amount} transfer? Account balances will be recalculated.`)) return;
    setFormError(null);
    try {
      await deleteTransfer(transfer.id);
      await reload();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  return (
    <section className="accounts-page">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">YOUR MONEY, IN EVERY PLACE</span>
          <h1>Accounts &amp; transfers</h1>
          <p>Track cash, banks, and mobile wallets. Moving money between your accounts is not income or spending.</p>
        </div>
      </div>

      {pageError && (
        <section className="dashboard-message dashboard-error" role="alert">
          <CircleAlert size={20} />
          <div><strong>We couldn’t load your accounts</strong><p>{pageError}</p></div>
          <button className="button button-secondary" type="button" onClick={() => void reload()}>
            <RefreshCw size={15} /> Try again
          </button>
        </section>
      )}
      {formError && <p className="auth-error" role="alert">{formError}</p>}

      {!pageError && (
        <>
          <section className="summary-grid accounts-summary" aria-label="Account balance summary">
            <article className="summary-card summary-balance">
              <span>Total across tracked accounts</span>
              <strong>{loading ? "Loading…" : formatMoney(data?.totalBalance ?? "0")}</strong>
              <Wallet size={17} aria-hidden="true" />
            </article>
            <article className="summary-card">
              <span>Accounts</span>
              <strong>{loading ? "Loading…" : String(data?.accounts.length ?? 0)}</strong>
            </article>
          </section>

          <section className="account-management-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-heading">
                <div><span className="panel-label">YOUR WALLETS</span><h2>My accounts</h2></div>
              </div>
              <p className="accounts-helper">
                Balances include starting amounts, linked transactions, and transfers. Older transactions stay unassigned until you link them.
              </p>
              {loading ? <p className="dashboard-empty">Loading accounts…</p> : data?.accounts.length ? (
                <div className="account-balance-list">
                  {data.accounts.map((account) => (
                    <article className="account-balance-row" key={account.id}>
                      <span className="settings-icon"><Wallet size={17} /></span>
                      <span className="account-balance-copy">
                        <strong>{account.name}</strong>
                        <small>{account.provider || accountTypeLabel(account.type)} · {accountTypeLabel(account.type)}</small>
                      </span>
                      <strong className="account-balance-value">{formatMoney(account.balance ?? account.openingBalance)}</strong>
                      <button
                        className="icon-button delete-transaction-button"
                        type="button"
                        aria-label={`Delete ${account.name} account`}
                        title="Delete account"
                        onClick={() => void handleDeleteAccount(account)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <Wallet size={25} />
                  <strong>No accounts yet</strong>
                  <span>Add an account and opening balance to start tracking wallets.</span>
                </div>
              )}
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-heading">
                <div><span className="panel-label">ADD A WALLET</span><h2>Create account</h2></div>
                <span className="account-next-icon"><Plus size={20} /></span>
              </div>
              <form className="transaction-form" onSubmit={(event) => void handleCreateAccount(event)}>
                <label className="dashboard-field">
                  <span>Account name</span>
                  <input value={name} minLength={2} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="e.g. M-Pesa" required />
                </label>
                <label className="dashboard-field">
                  <span>Account type</span>
                  <select value={type} onChange={(event) => setType(event.target.value as FinancialAccountType)}>
                    <option value="MOBILE_MONEY">Mobile money</option>
                    <option value="BANK">Bank</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="dashboard-field">
                  <span>Provider <small>(optional)</small></span>
                  <input value={provider} maxLength={80} onChange={(event) => setProvider(event.target.value)} placeholder="e.g. Safaricom" />
                </label>
                <label className="dashboard-field">
                  <span>Starting balance (KSh)</span>
                  <input type="number" min="0" max="9999999999.99" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} required />
                </label>
                <button className="button button-primary auth-submit" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Add account"} <Plus size={16} />
                </button>
              </form>
            </div>
          </section>

          <section className="account-management-grid account-transfer-section">
            <div className="dashboard-card">
              <div className="dashboard-card-heading">
                <div><span className="panel-label">MOVE MONEY, NOT INCOME</span><h2>Record a transfer</h2></div>
                <span className="account-next-icon"><ArrowLeftRight size={19} /></span>
              </div>
              {data && data.accounts.length < 2 ? (
                <p className="dashboard-empty">Create at least two accounts to record a transfer.</p>
              ) : (
                <form className="transaction-form" onSubmit={(event) => void handleCreateTransfer(event)}>
                  <label className="dashboard-field">
                    <span>From</span>
                    <select value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} required>
                      {(data?.accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </label>
                  <label className="dashboard-field">
                    <span>To</span>
                    <select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} required>
                      {(data?.accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </label>
                  <label className="dashboard-field">
                    <span>Amount (KSh)</span>
                    <input type="number" min="0.01" max="9999999999.99" step="0.01" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} required />
                  </label>
                  <label className="dashboard-field">
                    <span>Date</span>
                    <input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} required />
                  </label>
                  <label className="dashboard-field">
                    <span>Note <small>(optional)</small></span>
                    <input value={transferDescription} maxLength={240} onChange={(event) => setTransferDescription(event.target.value)} placeholder="e.g. Move funds to mobile wallet" />
                  </label>
                  <p className="accounts-helper">This records one outgoing and one incoming account entry. It does not affect income, expenses, or budgets.</p>
                  <button className="button button-primary auth-submit" type="submit" disabled={saving || !fromAccountId || !toAccountId || fromAccountId === toAccountId}>
                    {saving ? "Recording…" : "Record transfer"} <ArrowLeftRight size={16} />
                  </button>
                </form>
              )}
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-heading">
                <div><span className="panel-label">ACCOUNT MOVEMENTS</span><h2>Recent transfers</h2></div>
              </div>
              {loading ? <p className="dashboard-empty">Loading transfers…</p> : data?.transfers.length ? (
                <div className="account-balance-list">
                  {data.transfers.map((transfer) => (
                    <article className="account-transfer-row" key={transfer.id}>
                      <span className="settings-icon"><ArrowLeftRight size={17} /></span>
                      <span className="account-balance-copy">
                        <strong>{transfer.fromAccount.name} → {transfer.toAccount.name}</strong>
                        <small>{new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(transfer.occurredAt))}{transfer.description ? ` · ${transfer.description}` : ""}</small>
                      </span>
                      <strong>{formatMoney(transfer.amount)}</strong>
                      <button className="icon-button delete-transaction-button" type="button" aria-label="Delete transfer" title="Delete transfer" onClick={() => void handleDeleteTransfer(transfer)}>
                        <Trash2 size={15} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : <p className="dashboard-empty">No transfers have been recorded yet.</p>}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
