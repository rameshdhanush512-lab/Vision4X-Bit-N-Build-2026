import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { privacyApi } from '../services/api';
import { Exposure } from '../types';
import { getRiskBadgeClass, formatDate, formatConfidence } from '../utils';

export default function ExposureDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const [exp, setExp] = useState<Exposure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    privacyApi.getExposureById(id)
      .then(({ exposure }) => setExp(exposure))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading…</div>;
  if (error || !exp) return (
    <div className="p-6">
      <Link to="/exposures" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="text-red-400 text-sm">{error || 'Exposure not found'}</div>
    </div>
  );

  const risk = exp.riskAssessment;

  return (
    <div className="p-6 max-w-2xl space-y-5 animate-fade-in">
      <Link to="/exposures" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> All Exposures
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{exp.source}</h1>
          <div className="flex items-center gap-2 mt-1">
            {risk && <Badge className={getRiskBadgeClass(risk.riskLevel)}>{risk.riskLevel}</Badge>}
            <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/30">
              {exp.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
        {risk && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{risk.riskScore}</div>
            <div className="text-xs text-gray-500">risk score</div>
          </div>
        )}
      </div>

      {/* Data exposed */}
      <Card>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Data Exposed</h3>
        <div className="flex flex-wrap gap-2">
          {exp.dataTypes.map((dt) => (
            <span key={dt} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-lg">
              {dt.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Confidence</span>
            <p className="text-white mt-0.5">{formatConfidence(exp.confidence)}</p>
          </div>
          <div>
            <span className="text-gray-500">Detected</span>
            <p className="text-white mt-0.5">{formatDate(exp.detectedAt)}</p>
          </div>
        </div>
      </Card>

      {/* Evidence */}
      <Card>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Evidence</h3>
        <p className="text-sm text-gray-300">{exp.evidence}</p>
      </Card>

      {/* Risk explanation */}
      {risk && (
        <Card>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Why This Matters</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{risk.explanation}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {risk.factors.map((f) => (
              <span key={f} className="text-xs bg-surface-muted/40 text-gray-400 px-2 py-0.5 rounded">{f}</span>
            ))}
          </div>
          <div className="mt-4 p-3 bg-brand-900/40 border border-brand-700/30 rounded-lg">
            <p className="text-xs text-brand-300"><Shield className="inline w-3.5 h-3.5 mr-1" /><strong>Recommended: </strong>{risk.recommendation}</p>
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {exp.privacyRequests && exp.privacyRequests.length > 0 ? (
            <Link to="/requests"
              className="flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg text-sm hover:bg-green-500/30 transition-colors">
              <CheckCircle className="w-4 h-4" /> View Request
            </Link>
          ) : (
            <Link to="/requests"
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              <FileText className="w-4 h-4" /> Generate Privacy Request
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
