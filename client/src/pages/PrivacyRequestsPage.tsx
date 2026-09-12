import { useEffect, useState } from 'react';
import { Copy, Send, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { privacyApi } from '../services/api';
import { PrivacyRequest } from '../types';
import { formatDate } from '../utils';

const STATUS_CLASS: Record<string, string> = {
  DRAFT:        'bg-gray-500/20 text-gray-400 border-gray-500/30',
  READY:        'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SENT:         'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ACKNOWLEDGED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  COMPLETED:    'bg-green-500/20 text-green-400 border-green-500/30',
  REJECTED:     'bg-red-500/20 text-red-400 border-red-500/30',
  EXPIRED:      'bg-gray-500/20 text-gray-500 border-gray-500/30',
};

export default function PrivacyRequestsPage() {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  function load() {
    setLoading(true);
    privacyApi.getRequests()
      .then(({ requests }) => setRequests(requests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function markSent(id: string) {
    setUpdating(id);
    try {
      await privacyApi.updateRequestStatus(id, 'SENT');
      load();
    } catch {}
    setUpdating(null);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-white">Privacy Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review and manage your data-removal requests. You control when to send them.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-600">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p className="text-sm">No requests yet — run a Privacy Scan to generate them automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-white">{req.targetOrg}</span>
                    <Badge className={`border ${STATUS_CLASS[req.status] ?? STATUS_CLASS.DRAFT}`}>
                      {req.status}
                    </Badge>
                    <Badge className="bg-surface-muted/40 text-gray-400 border border-surface-border text-xs">
                      {req.requestType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{req.reason}</p>
                  <p className="text-xs text-gray-600 mt-1">Created: {formatDate(req.createdAt)}</p>
                </div>
                <button
                  onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                  className="text-xs text-brand-400 hover:text-brand-300 flex-shrink-0">
                  {expanded === req.id ? 'Hide' : 'View'} Request
                </button>
              </div>

              {expanded === req.id && (
                <div className="mt-4 space-y-3 animate-slide-up">
                  <pre className="bg-surface rounded-lg p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-auto max-h-64 border border-surface-border">
                    {req.generatedRequest}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copyText(req.generatedRequest)}
                      className="flex items-center gap-1.5 text-xs bg-surface-muted/40 hover:bg-surface-muted text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    {req.status === 'READY' && (
                      <button
                        onClick={() => markSent(req.id)}
                        disabled={updating === req.id}
                        className="flex items-center gap-1.5 text-xs bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                        <Send className="w-3.5 h-3.5" />
                        {updating === req.id ? 'Marking…' : 'Mark as Sent'}
                      </button>
                    )}
                    {req.status === 'SENT' && (
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Marked sent — follow-up scheduled
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 italic">
                    ⚠ PRIVEX does not send emails automatically. Copy the request above and submit it manually to {req.targetOrg}.
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
