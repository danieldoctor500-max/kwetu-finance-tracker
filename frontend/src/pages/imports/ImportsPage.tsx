import axios from "axios";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AlertCircle, Check, FileUp, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { listCategories } from "../../services/categories";
import { listAccounts } from "../../services/accounts";
import { createTransaction, listTransactions } from "../../services/transactions";
import type {
  ApiErrorResponse,
  Category,
  FinancialAccount,
  Transaction,
  TransactionType,
} from "../../types/api";
import { parseCsv } from "../../utils/statementCsv";
import { recognizePdf, type OcrProgress } from "../../services/pdfOcr";
import "../../styles/auth.css";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_BATCH_ROWS = 25;
const MAX_DUPLICATE_CHECK_PAGES = 20;

interface ColumnMapping {
  date: string;
  amount: string;
  paidIn: string;
  withdrawn: string;
  type: string;
  description: string;
  merchant: string;
  category: string;
}

interface PreviewRow {
  rowNumber: number;
  date: string | null;
  amount: string | null;
  type: TransactionType | null;
  description: string;
  merchant: string;
  categoryId: string;
  error: string | null;
  duplicate: boolean;
}

interface DuplicateCheck {
  key: string;
  transactions: Transaction[];
  error: string | null;
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

function defaultColumn(headers: string[], aliases: string[]): string {
  const index = headers.findIndex((header) =>
    aliases.includes(
      header.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(?:ksh|kes)$/, ""),
    ),
  );
  return index < 0 ? "" : String(index);
}

function parseDate(value: string): string | null {
  const normalized = value.trim();
  const isoDateTime = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  const localDateTime = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(normalized);
  let year: number;
  let month: number;
  let day: number;
  let hour = 12;
  let minute = 0;
  let second = 0;

  if (isoDateTime) {
    year = Number(isoDateTime[1]);
    month = Number(isoDateTime[2]);
    day = Number(isoDateTime[3]);
    hour = Number(isoDateTime[4]);
    minute = Number(isoDateTime[5]);
    second = Number(isoDateTime[6] ?? 0);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (localDateTime) {
    day = Number(localDateTime[1]);
    month = Number(localDateTime[2]);
    year = Number(localDateTime[3]);
    hour = Number(localDateTime[4]);
    minute = Number(localDateTime[5]);
    second = Number(localDateTime[6] ?? 0);
  } else if (local) {
    day = Number(local[1]);
    month = Number(local[2]);
    year = Number(local[3]);
  } else {
    return null;
  }

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  const hasTime = Boolean(isoDateTime || localDateTime);
  const date = hasTime
    ? new Date(year, month - 1, day, hour, minute, second)
    : new Date(Date.UTC(year, month - 1, day, 12));
  const validDate = hasTime
    ? date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day &&
      date.getHours() === hour &&
      date.getMinutes() === minute &&
      date.getSeconds() === second
    : date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  if (!validDate) {
    return null;
  }
  return date.toISOString();
}

function parseAmount(value: string, allowZero = false): { value: string; negative: boolean } | null {
  const normalized = value
    .trim()
    .replace(/^(?:KSh|KES)\s*/i, "")
    .replace(/\s/g, "");
  if (!/^-?(?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const negative = normalized.startsWith("-");
  const amount = normalized.replace(/^-/, "").replace(/,/g, "");
  if (
    !Number.isFinite(Number(amount)) ||
    (allowZero ? Number(amount) < 0 : Number(amount) <= 0)
  ) return null;
  return { value: amount, negative };
}

function parseType(value: string): TransactionType | null {
  const normalized = value.trim().toLowerCase();
  if (["income", "credit", "deposit", "cr"].includes(normalized)) return "INCOME";
  if (["expense", "debit", "withdrawal", "dr"].includes(normalized)) return "EXPENSE";
  return null;
}

function transactionKey(
  date: string,
  type: TransactionType,
  amount: string,
  categoryId: string,
): string {
  return `${date.slice(0, 10)}|${type}|${Number(amount).toFixed(2)}|${categoryId}`;
}

function formatMoney(value: string): string {
  return `KSh ${Number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isMpesaAccount(account: FinancialAccount): boolean {
  const identity = `${account.name} ${account.provider ?? ""}`.toLowerCase();
  return account.type === "MOBILE_MONEY" &&
    (identity.includes("m-pesa") || identity.includes("mpesa") || identity.includes("safaricom"));
}

async function loadExistingTransactions(from: string, to: string): Promise<Transaction[]> {
  const fromTime = new Date(`${from}T00:00:00.000Z`).toISOString();
  const toTime = new Date(`${to}T23:59:59.999Z`).toISOString();
  const firstPage = await listTransactions({
    from: fromTime,
    to: toTime,
    page: 1,
    limit: 100,
    sortOrder: "asc",
  });
  if (firstPage.pagination.totalPages > MAX_DUPLICATE_CHECK_PAGES) {
    throw new Error("This date range has too many records to check safely. Import a shorter statement period.");
  }

  const transactions = [...firstPage.data];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const nextPage = await listTransactions({
      from: fromTime,
      to: toTime,
      page,
      limit: 100,
      sortOrder: "asc",
    });
    transactions.push(...nextPage.data);
  }
  return transactions;
}

export default function ImportsPage() {
  const [searchParams] = useSearchParams();
  const requestedProvider = searchParams.get("provider");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    amount: "",
    paidIn: "",
    withdrawn: "",
    type: "",
    description: "",
    merchant: "",
    category: "",
  });
  const [positiveAmountType, setPositiveAmountType] = useState<"" | TransactionType>("");
  const [accountId, setAccountId] = useState("");
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [selectionOverrides, setSelectionOverrides] = useState<Record<number, boolean>>({});
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck | null>(null);
  const [importedRows, setImportedRows] = useState<number[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    listCategories()
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch((error: unknown) => {
        if (active) setCategoriesError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingCategories(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listAccounts()
      .then((result) => {
        if (!active) return;
        setAccounts(result.data);
        if (requestedProvider === "mpesa") {
          const mpesaAccount = result.data.find(isMpesaAccount);
          if (mpesaAccount) setAccountId(mpesaAccount.id);
        }
      })
      .catch((error: unknown) => {
        if (active) setAccountsError(errorMessage(error));
      })
      .finally(() => {
        if (active) setAccountsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [requestedProvider]);

  function columnValue(row: string[], column: string): string {
    return column ? row[Number(column)] ?? "" : "";
  }

  function loadCsvText(text: string, sourceFileName: string) {
    const parsed = parseCsv(text);
    if (parsed.rows.length > MAX_BATCH_ROWS) {
      throw new Error(`Import up to ${MAX_BATCH_ROWS} rows per batch. Split the statement and try again.`);
    }
    setFileName(sourceFileName);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping({
      date: defaultColumn(parsed.headers, ["date", "transactiondate", "completiontime", "dateandtime", "occurredat", "valuedate", "posteddate"]),
      amount: defaultColumn(parsed.headers, ["amount", "transactionamount", "value"]),
      paidIn: defaultColumn(parsed.headers, ["paidin", "amountin", "credit"]),
      withdrawn: defaultColumn(parsed.headers, ["withdrawn", "amountout", "debit"]),
      type: defaultColumn(parsed.headers, ["type", "transactiontype", "drcr", "debitcredit"]),
      description: defaultColumn(parsed.headers, ["description", "details", "transactiondetails", "narration", "reference", "memo"]),
      merchant: defaultColumn(parsed.headers, ["merchant", "payee", "counterparty", "recipient"]),
      category: defaultColumn(parsed.headers, ["category", "transactioncategory"]),
    });
  }

  const preview = useMemo<PreviewRow[]>(() => rows.map((row, index) => {
    const rowDate = parseDate(columnValue(row, mapping.date));
    const usingSplitAmounts = Boolean(mapping.paidIn || mapping.withdrawn);
    const rawPaidIn = columnValue(row, mapping.paidIn);
    const rawWithdrawn = columnValue(row, mapping.withdrawn);
    const paidIn = rawPaidIn.trim() ? parseAmount(rawPaidIn, true) : null;
    const withdrawn = rawWithdrawn.trim() ? parseAmount(rawWithdrawn, true) : null;
    let parsedAmount = usingSplitAmounts
      ? null
      : parseAmount(columnValue(row, mapping.amount));
    let type = !usingSplitAmounts && mapping.type
      ? parseType(columnValue(row, mapping.type))
      : null;
    let error: string | null = null;

    if (!mapping.date || !rowDate) error = "Choose a valid date column.";
    else if (usingSplitAmounts) {
      if (!mapping.paidIn || !mapping.withdrawn) {
        error = "Map both the Paid In and Withdrawn columns.";
      } else if (
        (rawPaidIn.trim() && !paidIn) ||
        (rawWithdrawn.trim() && !withdrawn) ||
        paidIn?.negative ||
        withdrawn?.negative
      ) {
        error = "Paid In and Withdrawn values must be zero or positive amounts.";
      } else {
        const incomeValue = Number(paidIn?.value ?? 0);
        const expenseValue = Number(withdrawn?.value ?? 0);
        if (incomeValue > 0 && expenseValue > 0) {
          error = "A row cannot have both Paid In and Withdrawn amounts.";
        } else if (incomeValue > 0) {
          parsedAmount = paidIn;
          type = "INCOME";
        } else if (expenseValue > 0) {
          parsedAmount = withdrawn;
          type = "EXPENSE";
        } else {
          error = "This row has no non-zero Paid In or Withdrawn amount.";
        }
      }
    } else if (!mapping.amount || !parsedAmount) {
      error = "Choose a valid amount column.";
    } else if (mapping.type && !type) {
      error = "Transaction type must be income/credit or expense/debit.";
    } else if (mapping.type && parsedAmount.negative && type === "INCOME") {
      error = "The amount sign conflicts with the income type.";
    } else if (!mapping.type && parsedAmount.negative) {
      type = "EXPENSE";
    } else if (!mapping.type && !positiveAmountType) {
      error = "Choose how to interpret positive amounts.";
    } else if (!mapping.type) {
      type = positiveAmountType || null;
    }

    const categoryText = columnValue(row, mapping.category).trim().toLowerCase();
    const matchingCategory = categories.find(
      (category) =>
        category.type === type &&
        category.name.toLowerCase() === categoryText,
    );
    const categoryId =
      categoryOverrides[index] ??
      matchingCategory?.id ??
      "";

    return {
      rowNumber: index + 2,
      date: rowDate,
      amount: parsedAmount?.value ?? null,
      type,
      description: columnValue(row, mapping.description),
      merchant: columnValue(row, mapping.merchant),
      categoryId,
      error: error ?? (!categoryId ? "Choose an existing category for this row." : null),
      duplicate: false,
    };
  }), [rows, mapping, categories, categoryOverrides, positiveAmountType]);

  const dateRange = useMemo(() => {
    const dates = preview.flatMap((row) => row.date ? [row.date.slice(0, 10)] : []);
    if (!dates.length) return null;
    dates.sort();
    return { from: dates[0], to: dates[dates.length - 1] };
  }, [preview]);
  const dateRangeKey = dateRange ? `${dateRange.from}|${dateRange.to}` : "";
  const duplicateLoading = Boolean(dateRangeKey) && duplicateCheck?.key !== dateRangeKey;
  const duplicateError =
    duplicateCheck?.key === dateRangeKey ? duplicateCheck.error : null;

  useEffect(() => {
    let active = true;
    if (!dateRangeKey) return () => { active = false; };
    const [from, to] = dateRangeKey.split("|");

    void loadExistingTransactions(from, to)
      .then((transactions) => {
        if (active) {
          setDuplicateCheck({
            key: dateRangeKey,
            transactions,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setDuplicateCheck({
            key: dateRangeKey,
            transactions: [],
            error: errorMessage(error),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [dateRangeKey]);

  const rowsWithDuplicateFlags = useMemo(() => {
    if (!dateRangeKey || duplicateCheck?.key !== dateRangeKey || duplicateCheck.error) {
      return preview;
    }

    const existingKeys = new Set(
      duplicateCheck.transactions.map((transaction) =>
        transactionKey(
          transaction.occurredAt,
          transaction.type,
          transaction.amount,
          transaction.categoryId,
        ),
      ),
    );
    const seen = new Set<string>();
    return preview.map((row) => {
      if (!row.date || !row.type || !row.amount || !row.categoryId) return row;
      const key = transactionKey(row.date, row.type, row.amount, row.categoryId);
      const duplicate = existingKeys.has(key) || seen.has(key);
      seen.add(key);
      return { ...row, duplicate };
    });
  }, [preview, duplicateCheck, dateRangeKey]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileError(null);
    setImportError(null);
    setImportResult(null);
    setImportedRows([]);
    setOcrText("");
    setOcrProgress(null);
    setSelectionOverrides({});
    setCategoryOverrides({});
    setDuplicateCheck(null);

    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    if (!isPdf && !isCsv) {
      setFileError("Choose a CSV or PDF statement file.");
      return;
    }
    if (isPdf && file.size > MAX_PDF_BYTES) {
      setFileError("Choose a PDF smaller than 5 MB.");
      return;
    }
    if (isCsv && file.size > MAX_FILE_BYTES) {
      setFileError("Choose a CSV file smaller than 1 MB.");
      return;
    }

    try {
      if (isPdf) {
        setOcrRunning(true);
        const recognized = await recognizePdf(file, setOcrProgress);
        setFileName(file.name);
        setOcrText(recognized);
        setHeaders([]);
        setRows([]);
        return;
      }
      loadCsvText(await file.text(), file.name);
    } catch (error) {
      setFileError(errorMessage(error));
    } finally {
      setOcrRunning(false);
      setOcrProgress(null);
    }
  }

  function handlePrepareReviewedCsv() {
    setFileError(null);
    setImportError(null);
    setImportResult(null);
    setImportedRows([]);
    setSelectionOverrides({});
    setCategoryOverrides({});
    setDuplicateCheck(null);
    try {
      loadCsvText(ocrText, `${fileName} (reviewed OCR)`);
    } catch (error) {
      setFileError(errorMessage(error));
    }
  }

  function isSelected(row: PreviewRow, index: number): boolean {
    if (selectionOverrides[index] !== undefined) return selectionOverrides[index];
    return !row.error && !row.duplicate && !importedRows.includes(index);
  }

  function toggleSelection(index: number, currentValue: boolean) {
    setSelectionOverrides((current) => ({
      ...current,
      [index]: !currentValue,
    }));
  }

  async function handleImport() {
    const selected = rowsWithDuplicateFlags
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => isSelected(row, index) && !row.error);

    if (!selected.length) {
      setImportError("Select at least one valid transaction to import.");
      return;
    }
    if (duplicateLoading || duplicateError) {
      setImportError("Wait for the duplicate check to finish before importing.");
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportResult(null);
    const created: Transaction[] = [];
    const importedIndexes: number[] = [];
    const failures: string[] = [];

    for (const { row, index } of selected) {
      try {
        created.push(await createTransaction({
          type: row.type!,
          categoryId: row.categoryId,
          accountId: accountId || null,
          amount: row.amount!,
          description: row.description || undefined,
          merchant: row.merchant || undefined,
          occurredAt: row.date!,
        }));
        importedIndexes.push(index);
      } catch (error) {
        failures.push(`Row ${row.rowNumber}: ${errorMessage(error)}`);
      }
    }

    if (created.length) {
      setImportedRows((current) => [...current, ...importedIndexes]);
      setDuplicateCheck((current) =>
        current?.key === dateRangeKey
          ? { ...current, transactions: [...current.transactions, ...created] }
          : current,
      );
    }

    setImportResult(
      `${created.length} transaction${created.length === 1 ? "" : "s"} imported.` +
      (failures.length ? ` ${failures.length} row${failures.length === 1 ? "" : "s"} failed.` : ""),
    );
    if (failures.length) setImportError(failures.join(" "));
    setImporting(false);
  }

  const selectedCount = rowsWithDuplicateFlags.filter((row, index) =>
    isSelected(row, index) && !row.error,
  ).length;
  const hasMpesaAccount = accounts.some(isMpesaAccount);
  const splitAmountsSelected = Boolean(mapping.paidIn || mapping.withdrawn);

  return (
    <section className="imports-page">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">BRING IN YOUR RECORDS</span>
          <h1>Import transactions</h1>
          <p>Review a small CSV statement batch before saving anything to your account.</p>
        </div>
      </div>

      <section className="dashboard-card import-security-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Private preview, no automatic import</strong>
          <p>CSV and PDF files stay in this browser. Only selected transaction records are sent to Kwetu when you choose Import selected.</p>
        </div>
      </section>

      <div className="import-page-grid">
        <section className="dashboard-card import-upload-card">
          <span className="eyebrow">STEP 1</span>
          <h2>Choose a statement file</h2>
          <p>CSV: up to 1 MB. Scanned PDF: up to 5 MB and 5 pages; OCR runs locally in your browser. Import up to 25 rows at a time.</p>
          <label className="button button-secondary import-file-picker">
            <FileUp size={16} /> Select CSV or PDF
            <input type="file" accept=".csv,.pdf,text/csv,application/pdf" disabled={ocrRunning} onChange={(event) => void handleFileChange(event)} />
          </label>
          {fileName && <p className="import-file-name">{fileName}</p>}
          {fileError && <p className="auth-error" role="alert">{fileError}</p>}
          {ocrRunning && (
            <div className="import-ocr-progress" role="status" aria-live="polite">
              <strong>Reading the PDF locally…</strong>
              <span>{ocrProgress?.message ?? "Starting OCR"}</span>
              {ocrProgress?.progress !== null && ocrProgress?.progress !== undefined && (
                <progress max={1} value={ocrProgress.progress} />
              )}
              <small>The PDF is not uploaded. OCR may take a few minutes on a phone or slower device.</small>
            </div>
          )}
          {categoriesError && <p className="auth-error" role="alert">{categoriesError}</p>}
          {accountsError && <p className="auth-error" role="alert">{accountsError}</p>}
          {!accountsError && (
            <label className="auth-field import-account-select">
              Import into account <small>(optional)</small>
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                <option value="">Leave transactions unassigned</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
              <small>All selected rows in this batch will be assigned to this account.</small>
            </label>
          )}
          {requestedProvider === "mpesa" && accountsLoaded && !accountsError && (
            hasMpesaAccount ? (
              <p className="import-provider-note" role="status">
                Your M-Pesa wallet is selected. Confirm each row before importing it.
              </p>
            ) : (
              <p className="import-provider-note import-provider-warning" role="alert">
                No M-Pesa wallet was found. <Link to="/app/accounts">Create a mobile money account</Link> first, then return to import your statement.
              </p>
            )
          )}
          {loadingCategories && <p className="settings-note" role="status">Loading your categories…</p>}
          {!loadingCategories && !categoriesError && categories.length === 0 && (
            <p className="auth-error" role="alert">Create a category before importing transactions.</p>
          )}
        </section>

        {ocrText && headers.length === 0 && (
          <section className="dashboard-card import-ocr-review">
            <span className="eyebrow">OCR REVIEW REQUIRED</span>
            <h2>Correct the recognized statement text</h2>
            <p>
              Scanned statements vary, so OCR text is not converted into transactions automatically.
              Check every digit against the PDF and prepare comma-separated rows with this header:
              {" "}<code>Date,Type,Amount,Category,Description</code>
            </p>
            <textarea
              className="import-ocr-textarea"
              aria-label="Recognized and reviewed statement text"
              rows={12}
              value={ocrText}
              onChange={(event) => setOcrText(event.target.value)}
              spellCheck={false}
            />
            <button className="button button-secondary" type="button" onClick={() => setOcrText("Date,Type,Amount,Category,Description\n")}>
              Insert CSV header
            </button>
            <p className="settings-note">
              Use dates like 2026-10-15, type Income or Expense, positive amounts without a currency symbol,
              and a category name already in Kwetu. Quote text values containing commas.
            </p>
            <button className="button button-primary" type="button" onClick={handlePrepareReviewedCsv}>
              Prepare rows for review
            </button>
          </section>
        )}

        {headers.length > 0 && (
          <section className="dashboard-card import-mapping-card">
            <span className="eyebrow">STEP 2</span>
            <h2>Match your CSV columns</h2>
            <p>Check each field mapping against your statement’s headers. For M-Pesa exports, map both Paid In and Withdrawn to infer income or expense from the statement.</p>
            <div className="import-mapping-grid">
              {([
                ["date", "Date", true],
                ["amount", "Amount", !splitAmountsSelected],
                ["paidIn", "Paid In", splitAmountsSelected],
                ["withdrawn", "Withdrawn", splitAmountsSelected],
                ["type", "Type", false],
                ["description", "Description", false],
                ["merchant", "Merchant", false],
                ["category", "Category", false],
              ] as const).map(([field, label, required]) => (
                <label className="auth-field" key={field}>
                  {label}{required ? " *" : " (optional)"}
                  <select
                    value={mapping[field]}
                    onChange={(event) => {
                      const value = event.target.value;
                      setMapping((current) => {
                        if (field === "amount" && value) {
                          return { ...current, amount: value, paidIn: "", withdrawn: "" };
                        }
                        if ((field === "paidIn" || field === "withdrawn") && value) {
                          return { ...current, [field]: value, amount: "" };
                        }
                        return { ...current, [field]: value };
                      });
                    }}
                  >
                    <option value="">Not mapped</option>
                    {headers.map((header, index) => (
                      <option value={String(index)} key={`${index}:${header}`}>
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {!mapping.type && !splitAmountsSelected && (
              <label className="auth-field import-positive-type">
                If the amount has no minus sign, treat it as
                <select
                  value={positiveAmountType}
                  onChange={(event) =>
                    setPositiveAmountType(event.target.value as "" | TransactionType)
                  }
                >
                  <option value="">Choose income or expense</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </label>
            )}
          </section>
        )}
      </div>

      {headers.length > 0 && (
        <section className="dashboard-card import-preview-card">
          <div className="import-preview-heading">
            <div>
              <span className="eyebrow">STEP 3</span>
              <h2>Review and select rows</h2>
              <p>{selectedCount} valid row{selectedCount === 1 ? "" : "s"} selected for import.</p>
            </div>
            {duplicateLoading && <span className="settings-note" role="status">Checking for possible duplicates…</span>}
          </div>
          {duplicateError && <p className="auth-error" role="alert">Duplicate check failed: {duplicateError} Import is blocked until the check succeeds.</p>}
          <div className="import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th scope="col">Import</th>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Category</th>
                  <th scope="col">Description</th>
                  <th scope="col">Review</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithDuplicateFlags.map((row, index) => (
                  <tr key={row.rowNumber}>
                    <td>
                      <input
                        aria-label={`Import CSV row ${row.rowNumber}`}
                        type="checkbox"
                        checked={isSelected(row, index)}
                        disabled={Boolean(row.error) || importedRows.includes(index)}
                        onChange={() => toggleSelection(index, isSelected(row, index))}
                      />
                    </td>
                    <td>{row.date?.slice(0, 10) ?? "—"}</td>
                    <td>{row.type ?? "—"}</td>
                    <td>{row.amount ? formatMoney(row.amount) : "—"}</td>
                    <td>
                      <select
                        aria-label={`Category for CSV row ${row.rowNumber}`}
                        value={row.categoryId}
                        disabled={!row.type || importedRows.includes(index)}
                        onChange={(event) =>
                          setCategoryOverrides((current) => ({
                            ...current,
                            [index]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Choose category</option>
                        {categories
                          .filter((category) => category.type === row.type)
                          .map((category) => (
                            <option value={category.id} key={category.id}>{category.name}</option>
                          ))}
                      </select>
                    </td>
                    <td className="import-description-cell">{row.description || "—"}</td>
                    <td className="import-review-cell">
                      {row.error ? (
                        <span className="import-invalid"><AlertCircle size={14} /> {row.error}</span>
                      ) : row.duplicate ? (
                        <span className="import-duplicate"><AlertCircle size={14} /> Possible duplicate; select to import anyway.</span>
                      ) : importedRows.includes(index) ? (
                        <span className="import-success"><Check size={14} /> Imported</span>
                      ) : (
                        <span className="import-ready">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importError && <p className="auth-error" role="alert">{importError}</p>}
          {importResult && <p className="settings-success" role="status"><Check size={15} /> {importResult}</p>}
          <button
            className="button button-primary import-submit"
            type="button"
            disabled={
              importing ||
              selectedCount === 0 ||
              duplicateLoading ||
              Boolean(duplicateError) ||
              loadingCategories
            }
            onClick={() => void handleImport()}
          >
            {importing ? "Importing selected rows…" : `Import selected (${selectedCount})`}
          </button>
        </section>
      )}
    </section>
  );
}
