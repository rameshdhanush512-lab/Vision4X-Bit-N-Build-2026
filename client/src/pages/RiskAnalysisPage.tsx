import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { privacyApi } from '../services/api';
import { Exposure } from '../types';
import { getRiskBadgeClass } from '../utils';

export default function RiskAnalysisPage() {
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    privacyApi.getExposures()
      .then(({ exposures }) => setExposures(exposures))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = exposures
    .filter((e) => e.riskAssessment)
    .sort((a, b) => (b.riskAssessment!.riskScore) - (a.riskAssessment!.riskScore))
    .map((e) => ({
      source: e.source.replace(' Directory', '').replace(' Hub', ''),
      score: e.riskAssessment!.riskScore,
      level: e.riskAssessment!.riskLevel,
    }));

  const LEVEL_COLORS: Record<string, string> = {
    CRITICAL: '#ff4444', HIGH: '#ff8c00', MEDIUM: '#ffd700', LOW: '#44cc88',
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-white">Privacy Risk Analysis</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          How each exposure was scored by the Risk Agent.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : exposures.length === 0 ? (
        <div className="text-center py-20 text-gray-600 text-sm">
          No risk assessments yet — run a Privacy Scan first.
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <Card>
            <CardHeader><CardTitle>Risk Score by Source</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: -20 }}>
                <XAxis dataKey="source" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  formatter={(val: number) => [`${val} / 100`, 'Risk Score']}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={LEVEL_COLORS[entry.level] ?? '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Detailed cards */}
          <div className="space-y-3">
            {exposures.filter((e) => e.riskAssessment).map((exp) => {
              const risk = exp.riskAssessment!;
              return (
                <Card key={exp.id}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <span className="text-sm font-medium text-white">{exp.source}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getRiskBadgeClass(risk.riskLevel)}>{risk.riskLevel}</Badge>
                        <span className="text-xs text-gray-500">Score: {risk.riskScore}/100</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{risk.explanation}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {risk.factors.map((f) => (
                      <span key={f} className="text-xs bg-surface-muted/40 text-gray-500 px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                  <p className="text-xs text-brand-400 mt-3">→ {risk.recommendation}</p>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
