import { useEffect, useState } from 'react';
import { Bell, Calendar, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { privacyApi } from '../services/api';
import { FollowUp } from '../types';
import { formatDate } from '../utils';

const STATUS_CLASS: Record<string, string> = {
  PENDING:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DUE:       'bg-orange-500/20 text-orange-400 border-orange-500/30',
  COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
  SKIPPED:   'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    privacyApi.getFollowUps()
      .then(({ followUps }) => setFollowUps(followUps))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pending = followUps.filter((f) => f.status !== 'COMPLETED');
  const done    = followUps.filter((f) => f.status === 'COMPLETED');

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-white">Follow-ups</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Guardian Agent tracks these reminders to ensure organisations respond to your requests.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : followUps.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-600">
          <Bell className="w-8 h-8 mb-2" />
          <p className="text-sm">No follow-ups scheduled yet.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pending ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map((fu) => <FollowUpCard key={fu.id} fu={fu} />)}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Completed ({done.length})</h2>
              <div className="space-y-3">
                {done.map((fu) => <FollowUpCard key={fu.id} fu={fu} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FollowUpCard({ fu }: { fu: FollowUp }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">
              {fu.privacyRequest?.targetOrg ?? 'Unknown Org'}
            </span>
            <Badge className={`border ${STATUS_CLASS[fu.status] ?? STATUS_CLASS.PENDING}`}>
              {fu.status}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">{fu.notes}</p>
          {fu.privacyRequest && (
            <p className="text-xs text-gray-600 mt-1">
              Request type: {fu.privacyRequest.requestType.replace('_', ' ')}
              {' · '}Status: {fu.privacyRequest.status}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-gray-500 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(fu.scheduledAt)}
          </div>
        </div>
      </div>
    </Card>
  );
}
