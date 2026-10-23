import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? children : <Navigate to="/app" replace />;
}
