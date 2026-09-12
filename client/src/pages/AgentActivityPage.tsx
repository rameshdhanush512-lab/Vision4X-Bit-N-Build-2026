import { useEffect, useState } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AgentStatusDot } from '../components/ui/AgentStatusDot';
import { agentApi } from '../services/api';
import { useAgentEvents } from '../hooks/useAgentEvents';
import { AgentRun } from '../types';
import { formatDateTime } from '../utils';

const AGENT_ICONS: Record<string, string> = {
  ORCHESTRATOR: '🎯', SCOUT: '🔍', RISK: '⚠️', RIGHTS: '📄', GUARDIAN: '🛡️',
};

export default function AgentActivityPage() {
  const [runs, setRuns]       = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const { events }            = useAgentEvents();

  function load() {
    setLoading(true);
    agentApi.getRuns()
      .then(({ runs }) => setRuns(runs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // Refresh after agent activity
  useEffect(() => {
    if (events.length > 0) load();
  }, [events.length]);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Agent Activity</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time and historical agent execution log</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Live events */}
      {events.length > 0 && (
        <Card>
          <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Live Feed</h2>
          <div className="space-y-2">
            {events.slice(0, 20).map((ev, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-surface-border/40 last:border-0">
                <span className="text-base">{AGENT_ICONS[ev.agentName] ?? '🤖'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{ev.agentName}</span>
                    <AgentStatusDot status={ev.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{ev.message}</p>
                </div>
                <span className="text-xs text-gray-600">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Historical */}
      <Card>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Execution History</h2>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-600">
            <Shield className="w-8 h-8 mb-2" />
            <p className="text-sm">No agent runs yet — start a Privacy Scan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div key={run.id} className="flex items-start gap-3 py-3 border-b border-surface-border/40 last:border-0">
                <span className="text-base">{AGENT_ICONS[run.agentName] ?? '🤖'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-white">{run.agentName}</span>
                    <AgentStatusDot status={run.status} />
                  </div>
                  <p className="text-xs text-gray-500">{run.task}</p>
                  {run.result && <p className="text-xs text-brand-400 mt-1">{run.result}</p>}
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>{formatDateTime(run.createdAt)}</p>
                  {run.completedAt && run.startedAt && (
                    <p className="mt-0.5">
                      {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 100) / 10}s
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
