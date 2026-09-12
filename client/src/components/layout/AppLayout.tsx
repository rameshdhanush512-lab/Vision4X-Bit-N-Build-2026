import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useAuth } from '../../hooks/useAuth';

export default function AppLayout() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-surface text-white">
      <Sidebar user={user} onLogout={logout} />
      <main className="flex-1 overflow-auto">
        <ErrorBoundary fallbackTitle="This page encountered an error">
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
