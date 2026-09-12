import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileText, Bell, CheckCircle, TrendingUp, Zap } from 'lucide-react';
import { RadialBarChart, RadialBar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AgentStatusDot } from '../components/ui/AgentStatusDot';
import { dashboardApi } from '../services/api';
import { DashboardData, AgentRun } from '../types';
import { getRiskBadgeClass, getStatusBadgeClass, formatDateTime, scoreToColor } from '../utils';
import { useAgentEvents } from '../hooks/useAgentEvents';

const AGENT_LABELS: Record<string, string> = {
  ORCHESTRATOR: 'Orchestrator', SCOUT: 'Scout',
  RISK: 'Risk', RIGHTS: 'Rights', GUARDIAN: 'Guardian',
};

export default function DashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const { events }            = useAgentEvents();

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Refresh dashboard when an agent completes
  useEffect(() => {
    const lastEvent = events[0];
    if (lastEvent?.status === 'COMPLETED') {
      dashboardApi.get().then(setData).catch(() => {});
    }
  }, [events]);

  if (loading) return <PageSkeleton />;
  if (error)   return <ErrorState message={error} />;
  if (!data)   return null;

  const scoreColor = scoreToColor(data.privacyScore);
  const pieData = [
    { name: 'Critical', value: data.exposureSummary.critical, color: '#ff4444' },
    { name: 'High',     value: data.exposureSummary.high,     color: '#ff8c00' },
    { name: 'Medium',   value: data.exposureSummary.medium,   color: '#ffd700' },
    { name: 'Low',      value: data.exposureSummary.low,      color: '#44cc88' },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Privacy Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your real-time privacy protection overview</p>
        </div>
        <Link to="/scan"
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Zap className="w-4 h-4" /> Run Privacy Scan
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard score={data.privacyScore} color={scoreColor} />
        <KpiCard icon={AlertTriangle} label="Active Exposures"
          value={data.exposureSummary.total - data.exposureSummary.resolved}
          sub={`${data.exposureSummary.critical} critical`} color="text-red-400" />
        <KpiCard icon={FileText} label="Active Requests"
          value={data.activeRequests} sub="pending response" color="text-orange-400" />
        <KpiCard icon={CheckCircle} label="Resolved"
          value={data.resolvedExposures} sub="exposures cleared" color="text-green-400" />
      </div>

      {/* Exposure breakdown + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie chart */}
        <Card>
          <CardHeader><CardTitle>Exposure Breakdown</CardTitle></CardHeader>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  formatter={(val: number, name: string) => [`${val} exposures`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-sm">No exposures yet</div>
          )}
          <div className="mt-3 space-y-1.5">
            {[
              { label: 'Critical', val: data.exposureSummary.critical, cls: 'bg-red-400' },
              { label: 'High',     val: data.exposureSummary.high,     cls: 'bg-orange-400' },
              { label: 'Medium',   val: data.exposureSummary.medium,   cls: 'bg-yellow-400' },
              { label: 'Low',      val: data.exposureSummary.low,      cls: 'bg-green-400' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${cls}`} />{label}
                </span>
                <span className="text-white font-medium">{val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Live agent activity */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Live Agent Activity</CardTitle></CardHeader>
          {events.length === 0 && data.recentAgentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-600">
              <TrendingUp className="w-8 h-8 mb-2" />
              <p className="text-sm">No agent activity yet — run a Privacy Scan</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Live socket events first */}
              {events.slice(0, 5).map((ev, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-surface-border/50 last:border-0">
                  <AgentStatusDot status={ev.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-brand-300">{AGENT_LABELS[ev.agentName] ?? ev.agentName}</span>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{ev.message}</p>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
              {/* Historical runs */}
              {data.recentAgentActivity.map((run) => (
                <div key={run.id} className="flex items-start gap-3 py-2 border-b border-surface-border/50 last:border-0">
                  <AgentStatusDot status={run.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-300">{AGENT_LABELS[run.agentName] ?? run.agentName}</span>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{run.result ?? run.task}</p>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">{formatDateTime(run.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ScoreCard({ score, color }: { score: number; color: string }) {
  return (
    <Card className="flex flex-col items-center justify-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Privacy Score</p>
      <div className="relative">
        <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#21262d" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 201} 201`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center rotate-90">
          <span className="text-xl font-bold text-white">{score}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">out of 100</p>
    </Card>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: number; sub: string; color: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          <p className="text-xs text-gray-600 mt-1">{sub}</p>
        </div>
        <Icon className={`w-5 h-5 ${color} opacity-60`} />
      </div>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-surface-muted rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-surface-card rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <div className="text-center text-red-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
