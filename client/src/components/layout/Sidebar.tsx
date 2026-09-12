import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, AlertTriangle, FileText,
  Bell, Network, Settings, Shield, Activity, LogOut,
} from 'lucide-react';
import { User } from '../../types';

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/scan',       label: 'Privacy Scan',     icon: Search },
  { to: '/exposures',  label: 'Exposures',        icon: AlertTriangle },
  { to: '/analysis',   label: 'Risk Analysis',    icon: Activity },
  { to: '/agents',     label: 'Agent Activity',   icon: Shield },
  { to: '/requests',   label: 'Privacy Requests', icon: FileText },
  { to: '/followups',  label: 'Follow-ups',       icon: Bell },
  { to: '/graph',      label: 'Attack Graph',     icon: Network },
  { to: '/settings',   label: 'Settings',         icon: Settings },
];

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: Props) {
  return (
    <aside className="w-60 min-h-screen bg-surface-card border-r border-surface-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-brand-400" />
          <span className="text-lg font-bold text-white tracking-tight">PRIVEX</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Privacy Guardian</p>
      </div>

      {/* Demo badge */}
      <div className="mx-4 mt-3 px-3 py-1.5 rounded bg-brand-900/60 border border-brand-700/40 text-xs text-brand-300 text-center font-mono">
        DEMO ENVIRONMENT
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-brand-500/20 text-brand-300 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-muted/50'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-surface-border">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
