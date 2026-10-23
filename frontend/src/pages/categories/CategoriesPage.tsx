import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  createCategory,
  deleteCategory,
  listCategorySuggestions,
  listCategories,
  updateCategoryName,
} from "../../services/categories";
import type { CategorySuggestion } from "../../services/categories";
import type {
  ApiErrorResponse,
  Category,
  TransactionType,
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

function usageSummary(category: Category): string {
  const transactions = category._count?.transactions ?? 0;
  const budgets = category._count?.budgets ?? 0;
  const parts = [
    `${transactions} ${transactions === 1 ? "transaction" : "transactions"}`,
    `${budgets} ${budgets === 1 ? "budget" : "budgets"}`,
  ];
  return parts.join(" · ");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busySuggestion, setBusySuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const [categoryList, categorySuggestions] = await Promise.all([
        listCategories(),
        listCategorySuggestions(),
      ]);
      setCategories(categoryList);
      setSuggestions(categorySuggestions);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([listCategories(), listCategorySuggestions()])
      .then(([categoryList, categorySuggestions]) => {
        if (!active) return;
        setCategories(categoryList);
        setSuggestions(categorySuggestions);
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
      const created = await createCategory({ name: name.trim(), type });
      setCategories((current) =>
        [...current, created].sort((a, b) =>
          a.type === b.type ? a.name.localeCompare(b.name) : a.type.localeCompare(b.type),
        ),
      );
      setSuggestions((current) => current.filter(
        (suggestion) =>
          suggestion.type !== created.type ||
          suggestion.name.toLocaleLowerCase() !== created.name.toLocaleLowerCase(),
      ));
      setName("");
    } catch (createError) {
      setFormError(errorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSuggestion(suggestion: CategorySuggestion) {
    const key = `${suggestion.type}:${suggestion.name}`;
    setBusySuggestion(key);
    setFormError(null);
    try {
      const created = await createCategory(suggestion);
      setCategories((current) =>
        [...current, created].sort((a, b) =>
          a.type === b.type ? a.name.localeCompare(b.name) : a.type.localeCompare(b.type),
        ),
      );
      setSuggestions((current) =>
        current.filter((item) => item.type !== suggestion.type || item.name !== suggestion.name),
      );
    } catch (createError) {
      setFormError(errorMessage(createError));
    } finally {
      setBusySuggestion(null);
    }
  }

  async function handleRename(categoryId: string) {
    setBusyId(categoryId);
    setFormError(null);
    try {
      const updated = await updateCategoryName(categoryId, editName.trim());
      setCategories((current) =>
        current.map((category) => category.id === categoryId ? updated : category),
      );
      setEditingId(null);
    } catch (updateError) {
      setFormError(errorMessage(updateError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(categoryId: string) {
    setBusyId(categoryId);
    setFormError(null);
    try {
      await deleteCategory(categoryId);
      setCategories((current) => current.filter((category) => category.id !== categoryId));
      setConfirmDeleteId(null);
    } catch (deleteError) {
      setFormError(errorMessage(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  const expenseCategories = categories.filter((category) => category.type === "EXPENSE");
  const incomeCategories = categories.filter((category) => category.type === "INCOME");

  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <span className="auth-kicker">ORGANIZE YOUR FINANCES</span>
          <h1>Categories</h1>
          <p>Manage the labels you use to organize income, spending, and budgets.</p>
        </div>
      </section>

      {error ? (
        <section className="dashboard-message dashboard-error" role="alert">
          <AlertCircle size={20} />
          <div><strong>We couldn’t load categories</strong><p>{error}</p></div>
          <button className="button button-secondary" onClick={() => void loadCategories()}>
            <RefreshCw size={15} /> Try again
          </button>
        </section>
      ) : (
        <section className="category-page-grid">
          <div className="dashboard-card">
            <div className="dashboard-card-heading">
              <div><span className="panel-label">YOUR LABELS</span><h2>Income and expenses</h2></div>
              <span className="budget-count">{loading ? "…" : categories.length}</span>
            </div>
            {formError && <p className="auth-error" role="alert">{formError}</p>}
            {loading ? (
              <p className="dashboard-empty">Loading categories…</p>
            ) : categories.length === 0 ? (
              <div className="dashboard-empty">
                <span>Create your first income or expense category to get started.</span>
              </div>
            ) : (
              <div className="category-groups">
                <CategoryGroup
                  title="Expenses"
                  categories={expenseCategories}
                  editingId={editingId}
                  editName={editName}
                  busyId={busyId}
                  confirmDeleteId={confirmDeleteId}
                  onStartEdit={(category) => {
                    setEditingId(category.id);
                    setEditName(category.name);
                    setConfirmDeleteId(null);
                    setFormError(null);
                  }}
                  onEditNameChange={setEditName}
                  onSave={(id) => void handleRename(id)}
                  onCancelEdit={() => setEditingId(null)}
                  onConfirmDelete={(id) => void handleDelete(id)}
                  onStartDelete={(id) => {
                    setConfirmDeleteId(id);
                    setEditingId(null);
                    setFormError(null);
                  }}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                />
                <CategoryGroup
                  title="Income"
                  categories={incomeCategories}
                  editingId={editingId}
                  editName={editName}
                  busyId={busyId}
                  confirmDeleteId={confirmDeleteId}
                  onStartEdit={(category) => {
                    setEditingId(category.id);
                    setEditName(category.name);
                    setConfirmDeleteId(null);
                    setFormError(null);
                  }}
                  onEditNameChange={setEditName}
                  onSave={(id) => void handleRename(id)}
                  onCancelEdit={() => setEditingId(null)}
                  onConfirmDelete={(id) => void handleDelete(id)}
                  onStartDelete={(id) => {
                    setConfirmDeleteId(id);
                    setEditingId(null);
                    setFormError(null);
                  }}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                />
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-heading">
              <div><span className="panel-label">ADD A LABEL</span><h2>Create a category</h2></div>
              <span className="account-next-icon"><Plus size={20} /></span>
            </div>
            <form className="transaction-form" onSubmit={(event) => void handleCreate(event)}>
              <label className="dashboard-field">
                <span>Category name</span>
                <input
                  type="text"
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Groceries"
                  required
                />
              </label>
              <label className="dashboard-field">
                <span>Category type</span>
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value === "INCOME" ? "INCOME" : "EXPENSE")
                  }
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </label>
              <button className="button button-primary auth-submit" type="submit" disabled={saving || loading}>
                {saving ? "Creating…" : "Create category"} <Plus size={16} />
              </button>
            </form>
            <section className="category-suggestions" aria-labelledby="category-suggestions-title">
              <div>
                <h3 id="category-suggestions-title">Suggested categories</h3>
                <p>Add any suggestions you want. You can still create custom categories above.</p>
              </div>
              {loading ? (
                <p className="category-group-empty">Loading suggestions…</p>
              ) : suggestions.length === 0 ? (
                <p className="category-group-empty">You have all current suggestions. Add any custom category above.</p>
              ) : (
                <ul>
                  {suggestions.map((suggestion) => {
                    const key = `${suggestion.type}:${suggestion.name}`;
                    return (
                      <li key={key}>
                        <span><strong>{suggestion.name}</strong><small>{suggestion.type.toLowerCase()}</small></span>
                        <button
                          className="button button-secondary"
                          type="button"
                          aria-label={`Add ${suggestion.name} ${suggestion.type.toLowerCase()} category`}
                          disabled={busySuggestion !== null}
                          onClick={() => void handleAddSuggestion(suggestion)}
                        >
                          <Plus size={14} />
                          {busySuggestion === key ? "Adding…" : "Add"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <p className="category-help">
              Categories with transactions or budgets can’t be deleted. Rename them to keep your financial history intact.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

interface CategoryGroupProps {
  title: string;
  categories: Category[];
  editingId: string | null;
  editName: string;
  busyId: string | null;
  confirmDeleteId: string | null;
  onStartEdit: (category: Category) => void;
  onEditNameChange: (value: string) => void;
  onSave: (id: string) => void;
  onCancelEdit: () => void;
  onConfirmDelete: (id: string) => void;
  onStartDelete: (id: string) => void;
  onCancelDelete: () => void;
}

function CategoryGroup({
  title,
  categories,
  editingId,
  editName,
  busyId,
  confirmDeleteId,
  onStartEdit,
  onEditNameChange,
  onSave,
  onCancelEdit,
  onConfirmDelete,
  onStartDelete,
  onCancelDelete,
}: CategoryGroupProps) {
  const isExpense = title === "Expenses";

  return (
    <section className="category-group" aria-label={`${title} categories`}>
      <h3>{title}</h3>
      {categories.length === 0 ? (
        <p className="category-group-empty">No {title.toLowerCase()} categories yet.</p>
      ) : (
        categories.map((category) => {
          const isInUse = (category._count?.transactions ?? 0) > 0 ||
            (category._count?.budgets ?? 0) > 0;
          const isBusy = busyId === category.id;
          return (
            <article className="category-item" key={category.id}>
              <div className="category-item-heading">
                <span className={`category-type-icon ${isExpense ? "expense" : "income"}`}>
                  {isExpense ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                </span>
                <div>
                  <strong>{category.name}</strong>
                  <small>{usageSummary(category)}</small>
                </div>
                <div className="budget-item-actions">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Rename ${category.name}`}
                    onClick={() => onStartEdit(category)}
                    disabled={isBusy}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button delete-transaction-button"
                    type="button"
                    aria-label={`Delete ${category.name}`}
                    title={isInUse ? "Categories in use cannot be deleted" : "Delete category"}
                    onClick={() => onStartDelete(category.id)}
                    disabled={isBusy || isInUse}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {editingId === category.id && (
                <div className="category-inline-form">
                  <label className="dashboard-field">
                    <span>Category name</span>
                    <input
                      type="text"
                      minLength={2}
                      maxLength={80}
                      value={editName}
                      onChange={(event) => onEditNameChange(event.target.value)}
                      autoFocus
                    />
                  </label>
                  <button className="button button-primary" type="button" disabled={isBusy} onClick={() => onSave(category.id)}>
                    {isBusy ? "Saving…" : "Save"}
                  </button>
                  <button className="button button-secondary" type="button" onClick={onCancelEdit}>Cancel</button>
                </div>
              )}

              {confirmDeleteId === category.id && (
                <div className="delete-confirmation" role="group" aria-label={`Confirm deleting ${category.name}`}>
                  <span>Delete this category?</span>
                  <button className="button delete-confirm-button" type="button" disabled={isBusy} onClick={() => onConfirmDelete(category.id)}>
                    <Trash2 size={14} /> {isBusy ? "Deleting…" : "Delete"}
                  </button>
                  <button className="button button-secondary" type="button" onClick={onCancelDelete}>Cancel</button>
                </div>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
