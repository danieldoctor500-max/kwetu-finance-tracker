import axios from "axios";
import { useState, type FormEvent } from "react";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import type { ApiErrorResponse } from "../../types/api";
import { createIssueReport } from "../../services/admin";
import "../../styles/auth.css";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data.error?.message;
    if (message) return message;
    if (!error.response) return "Unable to reach the API. Check your connection and try again.";
  }
  return error instanceof Error ? error.message : "Unable to submit your report.";
}

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSubmitted(false);
    try {
      await createIssueReport({ subject, description });
      setSubject("");
      setDescription("");
      setSubmitted(true);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-page">
      <article className="settings-card">
        <div className="settings-card-heading"><LifeBuoy size={20} /><div><h1>Report an issue</h1><p>Send the platform team a message about a problem or question.</p></div></div>
        <p className="settings-note">For your privacy, do not include account numbers, transaction details, balances, passwords, PINs, or other sensitive financial information.</p>
        <form className="settings-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="auth-field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={4} maxLength={160} required /></label>
          <label className="auth-field"><span>Describe the issue</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={2000} rows={6} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {submitted && <p className="settings-success" role="status"><CheckCircle2 size={16} /> Your report was submitted to the platform support team.</p>}
          <button className="button button-primary" disabled={saving}>{saving ? "Submitting…" : "Submit report"}</button>
        </form>
      </article>
    </section>
  );
}
