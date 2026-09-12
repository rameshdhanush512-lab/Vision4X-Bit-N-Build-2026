import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield, Zap, CheckCircle, AlertTriangle, Clock, Cpu } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AgentStatusDot } from '../components/ui/AgentStatusDot';
import { privacyApi } from '../services/api';
import { onAgentEvent } from '../services/socket';
import { AgentEvent, AgentStatus } from '../types';

const AGENT_ORDER = ['ORCHESTRATOR', 'SCOUT', 'RISK', 'RIGHTS', 'GUARDIAN'] as const;

const AGENT_META: Record<string, { icon: string; desc: string }> = {
  ORCHESTRATOR: { icon: '🎯', desc: 'Plans the workflow and decides routing' },
  SCOUT:        { icon: '🔍', desc: 'Searches approved sources for exposed data' },
  RISK:         { icon: '⚠️',  desc: 'Scores and explains each exposure' },
  RIGHTS:       { icon: '📄', desc: 'Generates professional removal requests' },
  GUARDIAN:     { icon: '🛡️', desc: 'Sets up follow-up tracking and verification' },
};

interface AgentState {
  status: AgentStatus;
  message: string;
  completedAt?: string;
}

export default function ScanPage() {
  const [scanId, setScanId]     = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const offRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to socket events once a scanId exists
  useEffect(() => {
    if (!scanId) return;

    // Clean up any previous listener
    offRef.current?.();

    const off = onAgentEvent((ev: AgentEvent) => {
      if (ev.scanId !== scanId) return;

      setAgentStates((prev) => ({
        ...prev,
        [ev.agentName]: {
          status: ev.status,
          message: ev.message,
          completedAt: ev.status === 'COMPLETED' ? ev.timestamp : prev[ev.agentName]?.completedAt,
        },
      }));

      // Workflow is done when Guardian completes or fails
      if (ev.agentName === 'GUARDIAN' && (ev.status === 'COMPLETED' || ev.status === 'FAILED')) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setScanning(false);
        setDone(true);
      }
    });

    offRef.current = off;
    return () => off();
  }, [scanId]);

  // Safety timeout — mark done after 90s regardless
  useEffect(() => {
    if (!scanning) return;
    timeoutRef.current = setTimeout(() => {
      setScanning(false);
      setDone(true);
    }, 90_000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [scanning]);

  async function startScan() {
    setError('');
    setDone(false);
    setAgentStates({});
    setScanning(true);

    try {
      const { scanId: sid } = await privacyApi.startScan();
      setScanId(sid);
    } catch (err: any) {
      setError(err.message || 'Failed to start scan');
      setScanning(false);
    }
  }

  function getAgentStatus(name: string): AgentStatus {
    return agentStates[name]?.status ?? 'WAITING';
  }

  function getAgentMessage(name: string): string {
    return agentStates[name]?.message ?? '';
  }

  const completedCount = AGENT_ORDER.filter(
    (a) => agentStates[a]?.status === 'COMPLETED'
  ).length;

  const progress = scanning ? Math.round((completedCount / AGENT_ORDER.length) * 100) : done ? 100 : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Privacy Scan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Run the full 5-agent workflow to discover and analyse your digital exposure.
        </p>
      </div>

      {/* Demo notice */}
      <div className="flex items-start gap-3 bg-brand-900/40 border border-brand-700/30 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-brand-300">
          <strong>Demo Environment</strong> — Uses realistic fictional data for Alex Kumar.
          No real personal information is accessed or stored.
        </p>
      </div>

      {/* Trigger card */}
      <Card>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-white">Start Multi-Agent Privacy Scan</p>
            <p className="text-xs text-gray-500 mt-0.5">
              5 agents run sequentially with live status updates
            </p>
          </div>
          <button
            onClick={startScan}
            disabled={scanning}
            className="flex-shrink-0 flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {scanning
              ? <><Clock className="w-4 h-4 animate-spin" /> Scanning…</>
              : done
              ? <><Search className="w-4 h-4" /> Re-Scan</>
              : <><Zap className="w-4 h-4" /> Run Privacy Scan</>}
          </button>
        </div>

        {/* Progress bar */}
        {(scanning || done) && (
          <div className="mb-1">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{scanning ? 'Running…' : 'Complete'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
      </Card>

      {/* Agent pipeline */}
      <Card>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Agent Pipeline
        </h2>
        <div className="space-y-1">
          {AGENT_ORDER.map((agent, idx) => {
            const status  = getAgentStatus(agent);
            const message = getAgentMessage(agent);
            const meta    = AGENT_META[agent];

            return (
              <div key={agent}>
                <div className="flex items-start gap-4 py-2">
                  {/* Step indicator */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-colors ${
                      status === 'COMPLETED' ? 'bg-green-500/20 border-green-500/40 text-green-400' :
                      status === 'RUNNING'   ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 animate-pulse' :
                      status === 'FAILED'    ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                      'bg-surface-muted/20 border-surface-border text-gray-600'
                    }`}>
                      {status === 'COMPLETED'
                        ? <CheckCircle className="w-4 h-4" />
                        : status === 'RUNNING'
                        ? <Cpu className="w-4 h-4 animate-spin" />
                        : <span>{meta.icon}</span>}
                    </div>
                    {idx < AGENT_ORDER.length - 1 && (
                      <div className={`w-px h-6 mt-1 transition-colors ${
                        status === 'COMPLETED' ? 'bg-green-500/30' : 'bg-surface-border'
                      }`} />
                    )}
                  </div>

                  {/* Agent info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">{agent}</span>
                      <AgentStatusDot status={status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                    {message && status !== 'WAITING' && (
                      <p className={`text-xs mt-1 italic ${
                        status === 'FAILED' ? 'text-red-400' : 'text-brand-400'
                      }`}>
                        {message.length > 100 ? message.substring(0, 100) + '…' : message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Completion banner */}
      {done && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 animate-slide-up">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-300">Privacy scan complete</p>
            <p className="text-xs text-green-600 mt-0.5">
              View your{' '}
              <Link to="/exposures" className="underline hover:text-green-400">exposures</Link>,{' '}
              <Link to="/requests"  className="underline hover:text-green-400">removal requests</Link>, or check the{' '}
              <Link to="/dashboard" className="underline hover:text-green-400">dashboard</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
