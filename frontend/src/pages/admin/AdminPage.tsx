import axios from "axios";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  ClipboardList,
  Database,
  ShieldCheck,
  Settings,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import type {
  AdminAuditEvent,
  AdminOverview,
  AdminUser,
  AdminUsersResponse,
  ApiErrorResponse,
  IssueReport,
  PlatformCategoryTemplate,
  PlatformSettings,
  TransactionType,
} from "../../types/api";
import {
  createCategoryTemplate,
  getAdminAuditEvents,
  getAdminOverview,
  getAdminUsers,
  getCategoryTemplates,
  getIssueReports,
  getPlatformSettings,
  updateAdminUserStatus,
  updateCategoryTemplate,
  updateIssueReport,
  updatePlatformSettings,
} from "../../services/admin";
import "../../styles/auth.css";
import "../../styles/admin.css";

type Section = "overview" | "users" | "categories" | "settings" | "audit" | "issues";

const sections: Array<{ id: Section; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "categories", label: "Category templates", icon: ClipboardList },
  { id: "settings", label: "System settings", icon: Settings },
  { id: "audit", label: "Audit events", icon: Activity },
  { id: "issues", label: "Issue reports", icon: AlertTriangle },
];

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data.error?.message;
    if (message) return message;
    if (!error.response) return "Unable to reach the platform API. Check your connection.";
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUsersResponse | null>(null);
  const [templates, setTemplates] = useState<PlatformCategoryTemplate[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [search, setSearch] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<TransactionType>("EXPENSE");
  const [saving, setSaving] = useState(false);

  const loadSection = useCallback(async (target: Section, query = "", page = 1) => {
    setLoading(true);
    setError(null);
    try {
      switch (target) {
        case "overview":
          setOverview(await getAdminOverview());
          break;
        case "users":
          setUsers(await getAdminUsers(query, page));
          break;
        case "categories":
          setTemplates(await getCategoryTemplates());
          break;
        case "settings":
          setSettings(await getPlatformSettings());
          break;
        case "audit":
          setEvents(await getAdminAuditEvents());
          break;
        case "issues":
          setIssues(await getIssueReports());
          break;
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSection(section), 0);
    return () => window.clearTimeout(timer);
  }, [loadSection, section]);

  async function handleUserStatus(user: AdminUser) {
    try {
      const updated = await updateAdminUserStatus(user.id, !user.isActive);
      setUsers((current) => current
        ? { ...current, data: current.data.map((item) => item.id === updated.id ? updated : item) }
        : current);
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createCategoryTemplate({ name: templateName, type: templateType });
      setTemplates((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setTemplateName("");
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleTemplateToggle(template: PlatformCategoryTemplate) {
    try {
      const updated = await updateCategoryTemplate(template.id, { isActive: !template.isActive });
      setTemplates((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function handleSettingsSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      setSettings(await updatePlatformSettings(settings));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleIssueSave(issue: IssueReport) {
    try {
      const updated = await updateIssueReport(issue.id, {
        status: issue.status,
        adminNote: issue.adminNote,
      });
      setIssues((current) => current.map((item) => item.id === updated.id
        ? { ...item, status: updated.status, adminNote: updated.adminNote, updatedAt: updated.updatedAt }
        : item));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  function renderOverview() {
    if (!overview) return null;
    const tiles = [
      { label: "Registered users", value: overview.statistics.totalUsers, icon: Users, tone: "users" },
      { label: "Active users", value: overview.statistics.activeUsers, icon: UserCheck, tone: "active" },
      { label: "Suspended users", value: overview.statistics.suspendedUsers, icon: UserX, tone: "suspended" },
      { label: "New this month", value: overview.statistics.newUsersThisMonth, icon: UserPlus, tone: "new" },
      { label: "Transaction records", value: overview.statistics.transactionRecords, icon: ClipboardList, tone: "records" },
      { label: "Tracked accounts", value: overview.statistics.trackedAccounts, icon: BarChart3, tone: "accounts" },
      { label: "Open support reports", value: overview.statistics.openIssues, icon: AlertTriangle, tone: "issues" },
    ];
    return (
      <>
        <div className="admin-stat-grid">
          {tiles.map(({ label, value, icon: Icon, tone }) => (
            <article className={`admin-stat-card admin-stat-${tone}`} key={label}>
              <span className="admin-stat-icon"><Icon size={18} aria-hidden="true" /></span>
              <span className="admin-stat-label">{label}</span>
              <strong>{value.toLocaleString()}</strong>
            </article>
          ))}
        </div>
        <article className="settings-card admin-health-card">
          <div className="admin-health-heading">
            <span className="admin-health-icon"><Activity size={19} /></span>
            <div>
              <h2>Service health</h2>
              <p>Operational status only. Private financial records are not included.</p>
            </div>
          </div>
          <div className="admin-health-statuses" aria-label="Current service status">
            <span><Check size={15} /> API operational</span>
            <span><Database size={15} /> Database connected</span>
          </div>
          <div className="admin-health-meta">
            <span>Uptime <strong>{Math.floor(overview.health.uptimeSeconds / 3600)} hours</strong></span>
            <span>Last checked <strong>{new Date(overview.health.checkedAt).toLocaleString()}</strong></span>
          </div>
        </article>
      </>
    );
  }

  function renderUsers() {
    return (
      <section className="settings-card">
        <div className="settings-card-heading"><span className="admin-card-icon"><Users size={19} /></span><div><h2>Account management</h2><p>Manage access using basic identity and account status only.</p></div></div>
        <form className="admin-search" onSubmit={(event) => { event.preventDefault(); void loadSection("users", search, 1); }}>
          <label className="auth-field"><span>Find an account</span><input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={120} placeholder="Search by name or email" /></label>
          <button className="button button-primary" type="submit"><Users size={15} /> Search users</button>
        </form>
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
          <tbody>{users?.data.length ? users.data.map((user) => <tr key={user.id}>
            <td><strong className="admin-table-name">{user.fullName}</strong></td>
            <td className="admin-table-email">{user.email}</td>
            <td><span className={`admin-role-badge ${user.role === "ADMIN" ? "is-admin" : ""}`}>{user.role === "ADMIN" && <ShieldCheck size={12} />}{user.role === "ADMIN" ? "Admin" : "User"}</span></td>
            <td><span className={`admin-status-badge ${user.isActive ? "is-active" : "is-suspended"}`}><i />{user.isActive ? "Active" : "Suspended"}</span></td>
            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
            <td><button className="button button-secondary admin-table-action" type="button" onClick={() => void handleUserStatus(user)}>{user.isActive ? "Suspend" : "Reactivate"}</button></td>
          </tr>) : (
            <tr><td className="admin-table-empty" colSpan={6}>{loading ? "Loading accounts…" : "No accounts match this search."}</td></tr>
          )}</tbody>
        </table></div>
        {users && <div className="admin-pagination">
          <p className="settings-note">Showing {users.data.length} of {users.pagination.total} accounts (page {users.pagination.page} of {users.pagination.totalPages}).</p>
          <button className="button button-secondary" type="button" disabled={users.pagination.page <= 1} onClick={() => void loadSection("users", search, users.pagination.page - 1)}>Previous</button>
          <button className="button button-secondary" type="button" disabled={users.pagination.page >= users.pagination.totalPages} onClick={() => void loadSection("users", search, users.pagination.page + 1)}>Next</button>
        </div>}
      </section>
    );
  }

  function renderCategories() {
    return (
      <section className="settings-card">
        <div className="settings-card-heading"><span className="admin-card-icon"><ClipboardList size={19} /></span><div><h2>Shared category templates</h2><p>Changes affect new accounts only. Personal categories remain private.</p></div></div>
        <form className="admin-search" onSubmit={(event) => void handleCreateTemplate(event)}>
          <label className="auth-field"><span>Template name</span><input value={templateName} onChange={(event) => setTemplateName(event.target.value)} minLength={2} maxLength={80} placeholder="e.g. Household" required /></label>
          <label className="auth-field"><span>Type</span><select value={templateType} onChange={(event) => setTemplateType(event.target.value as TransactionType)}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label>
          <button className="button button-primary" disabled={saving}>{saving ? "Adding…" : <><ClipboardList size={15} /> Add template</>}</button>
        </form>
        <ul className="admin-template-list">{templates.length ? templates.map((template) => <li key={template.id}>
          <span className="admin-template-kind"><ClipboardList size={16} /></span>
          <span className="admin-template-copy"><strong>{template.name}</strong><small>{template.type.toLowerCase()} category</small></span>
          <span className={`admin-status-badge ${template.isActive ? "is-active" : "is-suspended"}`}><i />{template.isActive ? "Active" : "Inactive"}</span>
          <button className="button button-secondary" type="button" onClick={() => void handleTemplateToggle(template)}>{template.isActive ? "Deactivate" : "Activate"}</button>
        </li>) : <li className="admin-list-empty">{loading ? "Loading templates…" : "No shared templates yet. Add one above."}</li>}</ul>
      </section>
    );
  }

  function renderSettings() {
    if (!settings) return null;
    return (
      <section className="settings-card">
        <div className="settings-card-heading"><span className="admin-card-icon"><Settings size={19} /></span><div><h2>System settings</h2><p>Maintenance mode temporarily blocks finance endpoints for regular users.</p></div></div>
        <form className="settings-form" onSubmit={(event) => void handleSettingsSave(event)}>
          <label className={`admin-maintenance-toggle ${settings.maintenanceMode ? "is-enabled" : ""}`}><span className="admin-maintenance-copy"><strong>Maintenance mode</strong><small>Pause regular finance API access while platform work is in progress.</small></span><input type="checkbox" checked={settings.maintenanceMode} onChange={(event) => setSettings({ ...settings, maintenanceMode: event.target.checked })} /><span className="admin-toggle-track" aria-hidden="true" /></label>
          <label className="auth-field"><span>Maintenance message</span><textarea value={settings.maintenanceMessage} onChange={(event) => setSettings({ ...settings, maintenanceMessage: event.target.value })} minLength={5} maxLength={240} required rows={3} /></label>
          <button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save system settings"}</button>
        </form>
      </section>
    );
  }

  function renderAuditEvents() {
    return (
      <section className="settings-card">
        <div className="settings-card-heading"><span className="admin-card-icon"><Activity size={19} /></span><div><h2>Administrative audit</h2><p>Records platform operations, not users' financial activity.</p></div></div>
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>When</th><th>Administrator</th><th>Action</th><th>Target</th><th>Operational metadata</th></tr></thead>
          <tbody>{events.length ? events.map((event) => <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString()}</td><td>{event.actor?.email ?? "System"}</td><td><span className="admin-audit-action">{event.action}</span></td><td>{event.target?.email ?? "—"}</td><td><code>{JSON.stringify(event.metadata)}</code></td></tr>) : <tr><td className="admin-table-empty" colSpan={5}>{loading ? "Loading audit events…" : "No administrative events have been recorded."}</td></tr>}</tbody>
        </table></div>
      </section>
    );
  }

  function renderIssues() {
    return (
      <section className="settings-card">
        <div className="settings-card-heading"><span className="admin-card-icon"><AlertTriangle size={19} /></span><div><h2>Issue triage</h2><p>Support reports only. Do not request or access private financial records.</p></div></div>
        <div className="admin-issue-list">{issues.length ? issues.map((issue) => <article className="admin-issue" key={issue.id}>
          <div className="admin-issue-content"><span className={`admin-issue-status status-${issue.status.toLowerCase()}`}>{issue.status.replace("_", " ")}</span><h3>{issue.subject}</h3><p>{issue.description}</p><small>From {issue.user.fullName} · {issue.user.email} · {new Date(issue.createdAt).toLocaleString()}</small></div>
          <label className="auth-field"><span>Status</span><select value={issue.status} onChange={(event) => setIssues((current) => current.map((item) => item.id === issue.id ? { ...item, status: event.target.value as IssueReport["status"] } : item))}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select></label>
          <label className="auth-field"><span>Internal note</span><textarea value={issue.adminNote ?? ""} onChange={(event) => setIssues((current) => current.map((item) => item.id === issue.id ? { ...item, adminNote: event.target.value } : item))} maxLength={1000} rows={2} /></label>
          <button className="button button-primary" type="button" onClick={() => void handleIssueSave(issue)}>Save triage update</button>
        </article>) : <div className="admin-list-empty">{loading ? "Loading reports…" : "No issue reports need attention."}</div>}</div>
      </section>
    );
  }

  const activeSection = sections.find((item) => item.id === section);
  return (
    <section className="settings-page admin-page">
      <header className="admin-page-heading">
        <div className="admin-page-heading-copy"><p className="eyebrow">PLATFORM OPERATIONS</p><h1>Platform operations</h1><p>Keep the service healthy and support users while their financial records remain private.</p></div>
        <span className="admin-privacy-badge"><ShieldCheck size={16} /> Privacy protected</span>
      </header>
      <nav className="admin-section-nav" aria-label="Administrator sections" role="tablist">
        {sections.map(({ id, label, icon: Icon }) => <button id={`admin-tab-${id}`} type="button" role="tab" aria-controls="admin-tabpanel" aria-selected={section === id} tabIndex={section === id ? 0 : -1} key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><Icon size={16} />{label}</button>)}
      </nav>
      <div className="admin-section-heading"><div><span className="eyebrow">WORKSPACE</span><h2>{activeSection?.label}</h2></div>{loading && <span className="admin-loading-status" role="status"><i /> Updating workspace…</span>}</div>
      <div className="admin-section-content" id="admin-tabpanel" role="tabpanel" aria-labelledby={`admin-tab-${section}`} tabIndex={0}>
        {error && <p className="auth-error account-error" role="alert">{error}</p>}
        {section === "overview" && renderOverview()}
        {section === "users" && renderUsers()}
        {section === "categories" && renderCategories()}
        {section === "settings" && renderSettings()}
        {section === "audit" && renderAuditEvents()}
        {section === "issues" && renderIssues()}
      </div>
    </section>
  );
}
