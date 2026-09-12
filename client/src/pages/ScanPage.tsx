import { useState } from 'react';
import { Search, Shield, Zap, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AgentStatusDot } from '../components/ui/AgentStatusDot';
import { privacyApi } from '../services/api';
import { useAgentEvents } from '../hooks/useAgentEvents';
import { AgentStatus } from '../types';

const AGENT_ORDER = ['ORCHESTRATOR', 'SCOUT', 'RISK', 'RIGHTS', 'GUARDIAN'];
const AGENT_DESC: Record<string, string> = {
  ORCHESTRATOR: 'Plans the workflow and coordinates agents',
  SCOUT:        'Searches approved sources for exposed personal data',
  RISK:         'Analyses and scores each exposure',
  RIGHTS:       'Generates professional removal requests',
  GUARDIAN:     'Sets up follow-up tracking and verification',
};

export default function ScanPage() {
  const [scanId, setScanId]       = useState<string>('');
  const [scanning, setScanning]   = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');
  const { events, clear }         = useAgentEvents(scanId || undefined);

  // Derive per-agent status from live events
  const agentStatus = (name: string): AgentStatus => {
    const relevant = events.filter((e) => e.agentName === name);
    if (relevant.length === 0) return 'WAITING';
    const last = relevant[0];
    return last.status;
  };

  async function startScan() {
    setError('');
    setDone(false);
    clear();
    setScanning(true);
    try {
      const { scanId: sid } = await privacyApi.startScan();
      setScanId(sid);
      // Poll for completion via events
      const timer = setInterval(() => {
        const guardianDone = events.some(
          (e) => e.agentName === 'GUARDIAN' && e.status === 'COMPLETED'
        );
        if (guardianDone) {
          clearInterval(timer);
          setScanning(false);
          setDone(true);
        }
      }, 500);
      // Safety timeout after 60s
      setTimeout(() => {
        clearInterval(timer);
        setScanning(false);
        setDone(true);
      }, 60000);
    } catch (err: any) {
      setError(err.message);
      setScanning(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-white">Privacy Scan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Run the full 5-agent workflow to discover and analyse your digital exposure.
        </p>
      </div>

      {/* Demo notice */}
      <div className="flex items-start gap-3 bg-brand-900/40 border border-brand-700/30 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-brand-300">
          <strong>Demo Environment</strong> — This scan uses fictional data for Alex Kumar.
          No real personal information is accessed or stored.
        </div>
      </div>

      {/* Trigger */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Start Multi-Agent Privacy Scan</p>
            <p className="text-xs text-gray-500 mt-1">
              5 agents will run sequentially — takes ~5 seconds in demo mode
            </p>
          </div>
          <button
            onClick={startScan}
            disabled={scanning}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {scanning
              ? <><Clock className="w-4 h-4 animate-spin" /> Running…</>
              : <><Zap className="w-4 h-4" /> Run Privacy Scan</>}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
      </Card>

      {/* Agent pipeline */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">Agent Pipeline</h2>
        <div className="space-y-3">
          {AGENT_ORDER.map((agent, idx) => {
            const status = agentStatus(agent);
            const lastEvent = events.find((e) => e.agentName === agent);
            return (
              <div key={agent} className="flex items-start gap-4">
                {/* Step number */}
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                    status === 'COMPLETED' ? 'bg-green-500/20 border-green-500/40 text-green-400' :
                    status === 'RUNNING'   ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' :
                    status === 'FAILED'    ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                    'bg-surface-muted/30 border-surface-border text-gray-600'
                  }`}>
                    {status === 'COMPLETED' ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  {idx < AGENT_ORDER.length - 1 && (
                    <div className="w-px h-6 bg-surface-border mt-1" />
                  )}
                </div>

                {/* Agent info */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{agent}</span>
                    <AgentStatusDot status={status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{AGENT_DESC[agent]}</p>
                  {lastEvent && (
                    <p className="text-xs text-brand-400 mt-1 italic">{lastEvent.message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {done && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 animate-slide-up">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-300">Scan complete</p>
            <p className="text-xs text-green-600 mt-0.5">
              Head to <a href="/exposures" className="underline">Exposures</a> to review findings and take action.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
