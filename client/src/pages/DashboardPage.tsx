import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, FileText, Bell, CheckCircle,
  Zap, RefreshCw, Shield, ArrowRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { AgentStatusDot } from '../components/ui/AgentStatusDot';
import { PageLoader } from '../components/ui/PageLoader';
import { dashboardApi } from '../services/api';
import { DashboardData } from '../types';
import { formatDateTime, scoreToColor } from '../utils';
import { useAgentEvents } from '../hooks/useAgentEvents';

const AGENT_LABELS: Record<string, string> = {
  ORCHESTRATOR: 'Orchestrator', SCOUT: 'Scout',
  RISK: 'Risk', RIGHTS: 'Rights', GUARDIAN: 'Guardian',
};

const PIE_COLORS = ['#ff4444', '#ff8c00', '#ffd700', '#44cc88'];

export default function DashboardPage() {
  const [data, setData]             = useState<DashboardData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { events }                  = useAgentEvents();

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    dashboardApi.get()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh when any agent finishes
  useEffect(() => {
    const last = events[0];
    if (last?.status === 'COMPLETED' || last?.status === 'FAILED') {
      setTimeout(() => load(true), 800);
    }
  }, [events, load]);

  if (loading) return <PageLoader label="Loading dashboard…" />;

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button onClick={() => load()} className="text-xs text-brand-400 hover:underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const scoreColor     = scoreToColor(data.privacyScore);
  const activeExposures = data.exposureSummary.total - data.exposureSummary.resolved;

  const pieData = [
    { name: 'Critical', value: data.exposureSummary.critical },
    { name: 'High',     value: data.exposureSummary.high     },
    { name: 'Medium',   value: data.exposureSummary.medium   },
    { name: 'Low',      value: data.exposureSummary.low      },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* ── Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Privacy Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time overview of your privacy posture</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)} disabled={refreshing}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-surface-muted/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link to="/scan"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Zap className="w-4 h-4" /> Run Scan
          </Link>
        </div>
      </div>

      {/* ── KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PrivacyScoreCard score={data.privacyScore} color={scoreColor} />

        <KpiCard icon={AlertTriangle}  color="text-red-400"
          label="Active Exposures" value={activeExposures}
          sub={`${data.exposureSummary.critical} critical`} to="/exposures" />

        <KpiCard icon={FileText} color="text-orange-400"
          label="Active Requests" value={data.activeRequests}
          sub="pending response" to="/requests" />

        <KpiCard icon={CheckCircle} color="text-green-400"
          label="Resolved" value={data.resolvedExposures}
          sub="exposures cleared" to="/exposures" />
      </div>

      {/* ── Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pie chart */}
        <Card>
          <CardHeader><CardTitle>Exposure Breakdown</CardTitle></CardHeader>

          {pieData.length === 0 ? (
            <EmptyChart />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                    innerRadius={44} outerRadius={72}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, color: '#e6edf3', fontSize: 12 }}
                    formatter={(v: number, name: string) => [`${v} exposure${v !== 1 ? 's' : ''}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-2 space-y-1.5">
                {[
                  { label: 'Critical', val: data.exposureSummary.critical, dot: 'bg-red-400'    },
                  { label: 'High',     val: data.exposureSummary.high,     dot: 'bg-orange-400' },
                  { label: 'Medium',   val: data.exposureSummary.medium,   dot: 'bg-yellow-400' },
                  { label: 'Low',      val: data.exposureSummary.low,      dot: 'bg-green-400'  },
                ].map(({ label, val, dot }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      {label}
                    </span>
                    <span className="font-medium text-white">{val}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Live agent activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Agent Activity</CardTitle>
              <Link to="/agents" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>

          {events.length === 0 && data.recentAgentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-600">
              <Shield className="w-7 h-7 mb-2" />
              <p className="text-sm">No agent activity yet</p>
              <Link to="/scan" className="text-xs text-brand-400 hover:underline mt-1">Run a Privacy Scan →</Link>
            </div>
          ) : (
            <div className="space-y-0 max-h-60 overflow-y-auto">
              {/* Live socket events first */}
              {events.slice(0, 6).map((ev, i) => (
                <div key={`live-${i}`} className="flex items-start gap-3 py-2.5 border-b border-surface-border/40 last:border-0">
                  <AgentStatusDot status={ev.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-brand-300">
                      {AGENT_LABELS[ev.agentName] ?? ev.agentName}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.message}</p>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Historical DB runs */}
              {data.recentAgentActivity.map((run) => (
                <div key={run.id} className="flex items-start gap-3 py-2.5 border-b border-surface-border/40 last:border-0">
                  <AgentStatusDot status={run.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-300">
                      {AGENT_LABELS[run.agentName] ?? run.agentName}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{run.result ?? run.task}</p>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">{formatDateTime(run.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Follow-up nudge */}
      {data.pendingFollowUps > 0 && (
        <Link to="/followups"
          className="flex items-center justify-between px-5 py-3.5 bg-orange-500/10 border border-orange-500/20 rounded-xl hover:bg-orange-500/15 transition-colors animate-slide-up">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-orange-400" />
            <p className="text-sm text-orange-300">
              <strong>{data.pendingFollowUps}</strong> follow-up{data.pendingFollowUps !== 1 ? 's' : ''} due
              — check if organisations responded to your requests
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
        </Link>
      )}

      {/* ── Empty state (no data at all) */}
      {data.exposureSummary.total === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600 border border-dashed border-surface-muted rounded-xl">
          <Shield className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">No exposure data yet</p>
          <p className="text-xs text-gray-600 mb-4">Run a privacy scan to discover where your data appears online</p>
          <Link to="/scan"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
            <Zap className="w-3.5 h-3.5" /> Start Privacy Scan
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Sub-components

function PrivacyScoreCard({ score, color }: { score: number; color: string }) {
  const circumference = 2 * Math.PI * 32;
  const dash = (score / 100) * circumference;

  return (
    <Card className="flex flex-col items-center justify-center py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Privacy Score</p>
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#21262d" strokeWidth="7" />
          <circle
            cx="40" cy="40" r="32" fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-2xl font-bold text-white leading-none">{score}</span>
          <span className="text-xs text-gray-600 mt-0.5">/ 100</span>
        </div>
      </div>
      <p className="text-xs mt-2" style={{ color }}>
        {score >= 75 ? 'Good' : score >= 50 ? 'Fair' : score >= 25 ? 'Poor' : 'Critical'}
      </p>
    </Card>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, color, to,
}: {
  icon: React.ElementType; label: string; value: number;
  sub: string; color: string; to: string;
}) {
  return (
    <Link to={to}>
      <Card className="hover:border-surface-muted transition-colors cursor-pointer h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold mt-1.5 ${color}`}>{value}</p>
            <p className="text-xs text-gray-600 mt-1">{sub}</p>
          </div>
          <Icon className={`w-5 h-5 ${color} opacity-50 mt-0.5`} />
        </div>
      </Card>
    </Link>
  );
}

function EmptyChart() {
  return (
    <div className="h-44 flex flex-col items-center justify-center text-gray-600">
      <Shield className="w-6 h-6 mb-1" />
      <p className="text-xs">No exposures yet</p>
    </div>
  );
}
