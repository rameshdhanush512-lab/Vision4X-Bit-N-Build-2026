import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { privacyApi } from '../services/api';
import { Exposure } from '../types';
import { getRiskBadgeClass, formatDate, formatConfidence } from '../utils';

export default function ExposuresPage() {
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  function load() {
    setLoading(true);
    privacyApi.getExposures()
      .then(({ exposures }) => setExposures(exposures))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading exposures…</div>;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Exposures</h1>
          <p className="text-sm text-gray-500 mt-0.5">{exposures.length} potential exposures detected</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      {exposures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <AlertTriangle className="w-10 h-10 mb-3" />
          <p className="text-sm">No exposures found yet — run a Privacy Scan first.</p>
          <Link to="/scan" className="mt-3 text-brand-400 text-sm hover:underline">Go to Scan →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {exposures.map((exp) => (
            <Card key={exp.id} className="hover:border-surface-muted transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-sm font-medium text-white">{exp.source}</span>
                    {exp.riskAssessment && (
                      <Badge className={getRiskBadgeClass(exp.riskAssessment.riskLevel)}>
                        {exp.riskAssessment.riskLevel}
                      </Badge>
                    )}
                    <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      {exp.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {exp.dataTypes.map((dt) => (
                      <span key={dt} className="text-xs bg-surface-muted/50 text-gray-400 px-2 py-0.5 rounded">
                        {dt.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{exp.evidence}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span>Confidence: {formatConfidence(exp.confidence)}</span>
                    <span>Detected: {formatDate(exp.detectedAt)}</span>
                    {exp.riskAssessment && (
                      <span>Score: {exp.riskAssessment.riskScore}/100</span>
                    )}
                  </div>
                </div>
                <Link to={`/exposures/${exp.id}`}
                  className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
