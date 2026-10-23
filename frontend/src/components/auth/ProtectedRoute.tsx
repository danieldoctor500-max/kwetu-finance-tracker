import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, error, refreshUser } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <main className="auth-status-page" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <p>Checking your secure session…</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="auth-status-page" role="alert">
        <h1>We couldn’t verify your session</h1>
        <p>{error}</p>
        <button className="button button-primary" onClick={() => void refreshUser()}>
          Try again
        </button>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
