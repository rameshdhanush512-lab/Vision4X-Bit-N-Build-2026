import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage          from './pages/LoginPage';
import DashboardPage      from './pages/DashboardPage';
import ScanPage           from './pages/ScanPage';
import ExposuresPage      from './pages/ExposuresPage';
import ExposureDetailPage from './pages/ExposureDetailPage';
import RiskAnalysisPage   from './pages/RiskAnalysisPage';
import AgentActivityPage  from './pages/AgentActivityPage';
import PrivacyRequestsPage from './pages/PrivacyRequestsPage';
import FollowUpsPage      from './pages/FollowUpsPage';
import AttackGraphPage    from './pages/AttackGraphPage';
import SettingsPage       from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all wrapped in AppLayout which checks auth */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard"       element={<DashboardPage />} />
          <Route path="/scan"            element={<ScanPage />} />
          <Route path="/exposures"       element={<ExposuresPage />} />
          <Route path="/exposures/:id"   element={<ExposureDetailPage />} />
          <Route path="/analysis"        element={<RiskAnalysisPage />} />
          <Route path="/agents"          element={<AgentActivityPage />} />
          <Route path="/requests"        element={<PrivacyRequestsPage />} />
          <Route path="/followups"       element={<FollowUpsPage />} />
          <Route path="/graph"           element={<AttackGraphPage />} />
          <Route path="/settings"        element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
