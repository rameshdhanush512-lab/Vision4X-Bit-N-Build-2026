import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Copy, Send, CheckCircle, AlertTriangle, Clock,
  ExternalLink, RefreshCw, ChevronDown, ChevronUp,
  Mail, Shield, Loader2, XCircle, Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { privacyApi } from '../services/api';
import { PrivacyRequest, ActivityEntry } from '../types';
import { formatDate, formatDateTime } from '../utils';
import { getSocket } from '../services/socket';

// ── Status display config
const STATUS_CONFIG: Record<string, { cls: string; label: string; icon: React.ElementType }> = {
  DRAFT:        { cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30',      label: 'Draft',        icon: Clock       },
  READY:        { cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       label: 'Ready',        icon: Shield      },
  SENT:         { cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Sent',         icon: Mail        },
  ACKNOWLEDGED: { cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Acknowledged', icon: CheckCircle },
  PROCESSING:   { cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Processing',   icon: Loader2     },
  VERIFIED:     { cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',       label: 'Verified',     icon: Shield      },
  COMPLETED:    { cls: 'bg-green-500/20 text-green-400 border-green-500/30',    label: 'Completed',    icon: CheckCircle },
  REJECTED:     { cls: 'bg-red-500/20 text-red-400 border-red-500/30',          label: 'Rejected',     icon: XCircle     },
  EXPIRED:      { cls: 'bg-gray-500/20 text-gray-500 border-gray-500/30',       label: 'Expired',      icon: Clock       },
  FAILED:       { cls: 'bg-red-500/20 text-red-400 border-red-500/30',          label: 'Failed',       icon: XCircle     },
};

// Ordered workflow stages for the progress bar
const WORKFLOW_STAGES = [
  { key: 'READY',        label: 'Request Ready'    },
  { key: 'SENT',         label: 'Email Sent'        },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged'      },
  { key: 'PROCESSING',   label: 'Processing'        },
  { key: 'VERIFIED',     label: 'Verified'          },
  { key: 'COMPLETED',    label: 'Completed'         },
];
const STAGE_ORDER = WORKFLOW_STAGES.map((s) => s.key);

function stageIndex(status: string): number {
  const idx = STAGE_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

// ── Sub-component: Workflow progress bar
function WorkflowProgress({ status }: { status: string }) {
  const current = stageIndex(status);
  const isFailed = status === 'FAILED' || status === 'REJECTED' || status === 'EXPIRED';

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Request Progress</p>
      <div className="flex items-center gap-0">
        {WORKFLOW_STAGES.map((stage, i) => {
          const done    = i < current;
          const active  = i === current && !isFailed;
          const pending = i > current;

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${done    ? 'bg-green-500 text-white'
                  : active  ? 'bg-brand-500 text-white ring-2 ring-brand-400/40'
                  : isFailed && i === current ? 'bg-red-500 text-white'
                  : 'bg-surface-muted border border-surface-border text-gray-600'}`}>
                  {done ? '✓' : active ? (
                    status === 'PROCESSING' || status === 'VERIFIED'
                      ? <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse block" />
                      : i + 1
                  ) : isFailed && i > current ? '–' : i + 1}
                </div>
                <span className={`text-[9px] text-center leading-tight w-12
                  ${done ? 'text-green-400' : active ? 'text-brand-300' : 'text-gray-600'}`}>
                  {stage.label}
                </span>
              </div>
              {i < WORKFLOW_STAGES.length - 1 && (
                <div className={`h-0.5 flex-1 mb-4 transition-all ${done ? 'bg-green-500' : 'bg-surface-border'}`} />
              )}
            </div>
          );
        })}
      </div>
      {isFailed && (
        <p className="text-xs text-red-400 mt-2">
          {status === 'FAILED' ? '✗ Processing failed' : status === 'REJECTED' ? '✗ Request rejected by organisation' : '✗ Request expired'}
        </p>
      )}
    </div>
  );
}

// ── Sub-component: Activity timeline
function ActivityTimeline({ log }: { log: ActivityEntry[] }) {
  if (!log || log.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Activity Log</p>
      <div className="space-y-2 border-l-2 border-surface-border ml-2 pl-4">
        {log.map((entry, i) => {
          const isLast = i === log.length - 1;
          const isDemo = entry.message.startsWith('[DEMO]');
          return (
            <div key={i} className="relative">
              <div className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border-2
                ${isLast ? 'bg-brand-500 border-brand-400' : 'bg-surface border-green-500'}`} />
              <div className="flex items-start justify-between gap-2">
                <p className={`text-xs leading-relaxed ${isLast ? 'text-white' : 'text-gray-400'}`}>
                  {isDemo
                    ? <><span className="text-yellow-500/70 text-[10px]">[DEMO] </span>{entry.message.replace('[DEMO] ', '')}</>
                    : entry.message}
                </p>
                <span className="text-[10px] text-gray-600 flex-shrink-0 font-mono">
                  {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page
export default function PrivacyRequestsPage() {
  const [requests, setRequests]     = useState<PrivacyRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [sending, setSending]       = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<Record<string, { previewUrl?: string; error?: string }>>({});
  const pollingRef                  = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ── Load all requests
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    privacyApi.getRequests()
      .then(({ requests: r }) => setRequests(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Poll a specific request for live status updates
  const startPolling = useCallback((id: string) => {
    if (pollingRef.current[id]) return; // already polling
    pollingRef.current[id] = setInterval(async () => {
      try {
        const { request } = await privacyApi.getRequestById(id);
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...request } : r)));
        // Stop polling when terminal state reached
        if (['COMPLETED', 'FAILED', 'REJECTED', 'EXPIRED'].includes(request.status)) {
          clearInterval(pollingRef.current[id]);
          delete pollingRef.current[id];
        }
      } catch {}
    }, 3000);
  }, []);

  // ── Listen to socket request:update events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (data: { requestId: string; stage: string; message: string; status?: string; ts: string }) => {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== data.requestId) return r;
          const newEntry: ActivityEntry = { ts: data.ts, stage: data.stage, message: data.message };
          const existingLog = Array.isArray(r.activityLog) ? r.activityLog : [];
          return {
            ...r,
            status: (data.status as any) ?? r.status,
            activityLog: [...existingLog, newEntry],
          };
        })
      );
    };

    socket.on('request:update', handler);
    return () => { socket.off('request:update', handler); };
  }, []);

  // ── Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval);
    };
  }, []);

  // ── Send request
  async function handleSend(id: string) {
    setSending(id);
    setSendResult((prev) => ({ ...prev, [id]: {} }));
    try {
      const result = await privacyApi.sendRequest(id);
      setSendResult((prev) => ({
        ...prev,
        [id]: { previewUrl: result.emailPreviewUrl },
      }));
      // Optimistically update status
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'SENT' } : r))
      );
      // Start polling for this request
      startPolling(id);
    } catch (e: any) {
      setSendResult((prev) => ({ ...prev, [id]: { error: e.message } }));
    } finally {
      setSending(null);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const inProgressStatuses = ['SENT', 'ACKNOWLEDGED', 'PROCESSING', 'VERIFIED'];

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* ── Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Privacy Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and send data-removal requests to organisations holding your data.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-surface-muted/40 transition-colors"
          title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-600">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p className="text-sm">No requests yet — run a Privacy Scan to generate them automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const cfg         = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.DRAFT;
            const StatusIcon  = cfg.icon;
            const isExpanded  = expanded === req.id;
            const isSending   = sending === req.id;
            const result      = sendResult[req.id];
            const isActive    = inProgressStatuses.includes(req.status);
            const isCompleted = req.status === 'COMPLETED';
            const isFailed    = req.status === 'FAILED';
            const canSend     = req.status === 'READY' || req.status === 'DRAFT';
            const activityLog = Array.isArray(req.activityLog) ? req.activityLog : [];

            return (
              <Card key={req.id} className={isActive ? 'border-brand-500/30' : isCompleted ? 'border-green-500/20' : ''}>

                {/* ── Card header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-white">{req.targetOrg}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
                        <StatusIcon className={`w-3 h-3 ${isActive ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </span>
                      <Badge className="bg-surface-muted/40 text-gray-400 border border-surface-border text-xs">
                        {req.requestType.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{req.reason}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-600">Created: {formatDate(req.createdAt)}</p>
                      {req.sentAt && (
                        <p className="text-xs text-gray-600">Sent: {formatDateTime(req.sentAt)}</p>
                      )}
                      {req.exposure?.riskAssessment && (
                        <span className={`text-xs font-medium
                          ${req.exposure.riskAssessment.riskLevel === 'CRITICAL' ? 'text-red-400'
                          : req.exposure.riskAssessment.riskLevel === 'HIGH'     ? 'text-orange-400'
                          : req.exposure.riskAssessment.riskLevel === 'MEDIUM'   ? 'text-yellow-400'
                          : 'text-green-400'}`}>
                          {req.exposure.riskAssessment.riskLevel} risk
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Live progress mini-bar (when active) */}
                  {isActive && (
                    <div className="flex items-center gap-1.5 text-xs text-brand-400 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                      Processing…
                    </div>
                  )}

                  <button
                    onClick={() => setExpanded(isExpanded ? null : req.id)}
                    className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 flex-shrink-0">
                    <Eye className="w-3.5 h-3.5" />
                    {isExpanded ? 'Hide' : 'View'}
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* ── Expanded detail panel */}
                {isExpanded && (
                  <div className="mt-4 space-y-4 animate-slide-up">

                    {/* Request metadata */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border border-surface-border rounded-lg p-3 bg-surface">
                      <div>
                        <span className="text-gray-600">Request ID</span>
                        <p className="text-gray-300 font-mono text-[10px] mt-0.5">{req.id}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Target Organisation</span>
                        <p className="text-white mt-0.5">{req.targetOrg}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Request Type</span>
                        <p className="text-white mt-0.5">{req.requestType.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Status</span>
                        <p className={`mt-0.5 font-medium ${cfg.cls.split(' ')[1]}`}>{cfg.label}</p>
                      </div>
                      {req.exposure?.dataTypes && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Exposed Data Types</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {req.exposure.dataTypes.map((dt) => (
                              <span key={dt} className="text-[10px] bg-surface-muted/40 border border-surface-border text-gray-400 px-1.5 py-0.5 rounded">
                                {dt.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Workflow progress bar */}
                    {req.status !== 'DRAFT' && <WorkflowProgress status={req.status} />}

                    {/* Activity log */}
                    {activityLog.length > 0 && <ActivityTimeline log={activityLog} />}

                    {/* Email log */}
                    {req.emailLog?.messageId && (
                      <div className="text-xs border border-surface-border rounded-lg p-3 bg-surface space-y-1">
                        <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-1">Email Details</p>
                        <p className="text-gray-400">To: <span className="text-gray-300">{req.emailLog.to}</span></p>
                        <p className="text-gray-400">Subject: <span className="text-gray-300">{req.emailLog.subject}</span></p>
                        <p className="text-gray-400">Message ID: <span className="text-gray-600 font-mono text-[10px]">{req.emailLog.messageId}</span></p>
                        {req.emailLog.previewUrl && (
                          <a href={req.emailLog.previewUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-brand-400 hover:text-brand-300 mt-1">
                            <ExternalLink className="w-3 h-3" /> View email in Ethereal (demo preview)
                          </a>
                        )}
                      </div>
                    )}

                    {/* Generated request letter */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Generated Request Letter</p>
                      <pre className="bg-surface rounded-lg p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-auto max-h-52 border border-surface-border">
                        {req.generatedRequest}
                      </pre>
                    </div>

                    {/* Send result feedback */}
                    {result?.error && (
                      <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Email failed: {result.error}
                      </div>
                    )}

                    {result?.previewUrl && (
                      <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Email sent successfully!
                        <a href={result.previewUrl} target="_blank" rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-brand-400 hover:text-brand-300">
                          <ExternalLink className="w-3 h-3" /> Preview
                        </a>
                      </div>
                    )}

                    {/* Completed banner */}
                    {isCompleted && (
                      <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Privacy request completed</p>
                          <p className="text-green-400/70 mt-0.5">[DEMO] {req.targetOrg} confirmed removal of your personal data.</p>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => copyText(req.generatedRequest)}
                        className="flex items-center gap-1.5 text-xs bg-surface-muted/40 hover:bg-surface-muted text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                        <Copy className="w-3.5 h-3.5" /> Copy Letter
                      </button>

                      {canSend && (
                        <button
                          onClick={() => handleSend(req.id)}
                          disabled={isSending}
                          className="flex items-center gap-1.5 text-xs bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                          {isSending
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                            : <><Send className="w-3.5 h-3.5" /> Send Request</>}
                        </button>
                      )}

                      {isFailed && (
                        <button
                          onClick={() => handleSend(req.id)}
                          disabled={isSending}
                          className="flex items-center gap-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg transition-colors">
                          <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 italic">
                      ⓘ PRIVEX uses Ethereal demo email (no real email server needed). The processing workflow is simulated for the hackathon demo and does not contact real organisations.
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
