import { useState, type FormEvent } from "react";
import axios from "axios";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import BrandMark from "../../components/BrandMark";
import { useAuth } from "../../context/useAuth";
import type { ApiErrorResponse } from "../../types/api";
import "../../styles/auth.css";

type AuthMode = "login" | "register";

function getSubmissionError(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const responseError = error.response?.data.error;
    if (responseError?.details?.length) {
      return responseError.details
        .map((detail) => detail.message)
        .filter(Boolean)
        .join(" ");
    }
    if (responseError?.message) return responseError.message;
    if (!error.response) {
      return "Unable to reach Kwetu. Check your connection and try again.";
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { status, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";
  const destination = location.state?.from?.pathname ?? "/app";

  if (status === "authenticated") {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({ fullName: fullName.trim(), email: email.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmissionError(getSubmissionError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-heading">
        <Link className="auth-brand" to="/" aria-label="Kwetu home">
          <BrandMark />
        </Link>

        <Link className="auth-back-link" to="/">
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="auth-heading">
          <span className="auth-kicker">{isRegister ? "START WITH A CLEARER PICTURE" : "WELCOME BACK"}</span>
          <h1 id="auth-heading">{isRegister ? "Create your account" : "Log in to Kwetu"}</h1>
          <p>
            {isRegister
              ? "A simple, secure place to understand and plan your finances."
              : "Your financial picture is right where you left it."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {submissionError && (
            <div className="auth-error" role="alert">{submissionError}</div>
          )}

          {isRegister && (
            <label className="auth-field">
              <span>Full name</span>
              <input
                autoComplete="name"
                name="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email address</span>
            <input
              autoComplete="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isRegister ? 12 : undefined}
              maxLength={128}
              required
            />
            {isRegister && <small>Use at least 12 characters.</small>}
          </label>

          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Log in"}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to Kwetu?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>

        <p className="auth-security-note">
          <ShieldCheck size={16} />
          Your password is protected, and your session uses a secure HttpOnly cookie.
        </p>
      </section>
    </main>
  );
}
