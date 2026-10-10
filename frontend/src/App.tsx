import { Spinner } from "./components/ui/Spinner";
import { Dashboard } from "./features/Dashboard";
import { LoginPage } from "./features/LoginPage";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { user, loading, logout } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted"><Spinner className="h-8 w-8" /></div>;
  }
  return user ? <Dashboard user={user} onLogout={logout} /> : <LoginPage />;
}
