import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage            from './pages/LoginPage';
import DashboardPage        from './pages/DashboardPage';
import ScanPage             from './pages/ScanPage';
import ExposuresPage        from './pages/ExposuresPage';
import ExposureDetailPage   from './pages/ExposureDetailPage';
import RiskAnalysisPage     from './pages/RiskAnalysisPage';
import AgentActivityPage    from './pages/AgentActivityPage';
import PrivacyRequestsPage  from './pages/PrivacyRequestsPage';
import FollowUpsPage        from './pages/FollowUpsPage';
import AttackGraphPage      from './pages/AttackGraphPage';
import SettingsPage         from './pages/SettingsPage';

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="PRIVEX encountered an unexpected error">
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — AppLayout checks auth and renders Sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard"     element={<DashboardPage />} />
            <Route path="/scan"          element={<ScanPage />} />
            <Route path="/exposures"     element={<ExposuresPage />} />
            <Route path="/exposures/:id" element={<ExposureDetailPage />} />
            <Route path="/analysis"      element={<RiskAnalysisPage />} />
            <Route path="/agents"        element={<AgentActivityPage />} />
            <Route path="/requests"      element={<PrivacyRequestsPage />} />
            <Route path="/followups"     element={<FollowUpsPage />} />
            <Route path="/graph"         element={<AttackGraphPage />} />
            <Route path="/settings"      element={<SettingsPage />} />
          </Route>

          {/* Catch-all → dashboard (auth guard will redirect to /login if needed) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
