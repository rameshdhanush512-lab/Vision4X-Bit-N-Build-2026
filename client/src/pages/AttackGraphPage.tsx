import { useEffect, useState, useRef } from 'react';
import { Network } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { privacyApi } from '../services/api';
import { Exposure } from '../types';
import { useAuth } from '../hooks/useAuth';

interface GraphNode {
  id: string; label: string; type: 'user' | 'datatype' | 'source' | 'risk';
  x: number; y: number; color: string;
}

interface GraphEdge { from: string; to: string; }

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff4444', HIGH: '#ff8c00', MEDIUM: '#ffd700', LOW: '#44cc88', user: '#0099d4',
};

export default function AttackGraphPage() {
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [loading, setLoading]     = useState(true);
  const { user }                  = useAuth();
  const svgRef                    = useRef<SVGSVGElement>(null);

  useEffect(() => {
    privacyApi.getExposures()
      .then(({ exposures }) => setExposures(exposures))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build graph nodes + edges from exposures
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // User node
  nodes.push({ id: 'user', label: user?.name ?? 'You', type: 'user', x: 440, y: 40, color: RISK_COLORS.user });

  const dataTypeMap = new Map<string, { x: number; y: number }>();
  const allDataTypes = Array.from(new Set(exposures.flatMap((e) => e.dataTypes)));

  // Data type nodes in a row
  allDataTypes.forEach((dt, i) => {
    const x = 100 + (i * (760 / Math.max(allDataTypes.length, 1)));
    const y = 140;
    dataTypeMap.set(dt, { x, y });
    nodes.push({ id: `dt_${dt}`, label: dt.replace('_', ' '), type: 'datatype', x, y, color: '#8de2ff' });
    edges.push({ from: 'user', to: `dt_${dt}` });
  });

  // Source + risk nodes
  exposures.forEach((exp, i) => {
    const riskLevel = exp.riskAssessment?.riskLevel ?? 'LOW';
    const srcX = 80 + (i * (760 / Math.max(exposures.length, 1)));
    const srcY = 260;
    nodes.push({
      id: `src_${exp.id}`, label: exp.source.split(' ')[0],
      type: 'source', x: srcX, y: srcY, color: '#4dd0ff',
    });

    // Connect data types to sources
    exp.dataTypes.forEach((dt) => {
      edges.push({ from: `dt_${dt}`, to: `src_${exp.id}` });
    });

    // Risk node
    nodes.push({
      id: `risk_${exp.id}`, label: riskLevel,
      type: 'risk', x: srcX, y: 370, color: RISK_COLORS[riskLevel] ?? '#6b7280',
    });
    edges.push({ from: `src_${exp.id}`, to: `risk_${exp.id}` });
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-white">Privacy Attack Graph</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          How exposed data types connect to sources and create combined risk.
        </p>
      </div>

      <Card>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : exposures.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-600">
            <Network className="w-8 h-8 mb-2" />
            <p className="text-sm">No exposures to visualise — run a Privacy Scan first.</p>
          </div>
        ) : (
          <svg ref={svgRef} viewBox="0 0 880 440" className="w-full" style={{ minHeight: 360 }}>
            {/* Edges */}
            {edges.map((edge, i) => {
              const from = nodes.find((n) => n.id === edge.from);
              const to   = nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              return (
                <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="#21262d" strokeWidth="1.5" strokeDasharray="4 3" />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={node.type === 'user' ? 28 : 22}
                  fill={`${node.color}22`} stroke={node.color} strokeWidth="1.5" />
                <text x={node.x} y={node.y + 4} textAnchor="middle"
                  fill={node.color} fontSize={node.type === 'user' ? 10 : 9} fontWeight={600}>
                  {node.label.length > 10 ? node.label.substring(0, 10) + '…' : node.label}
                </text>
              </g>
            ))}

            {/* Legend */}
            {[
              { color: RISK_COLORS.user, label: 'You' },
              { color: '#8de2ff', label: 'Data Type' },
              { color: '#4dd0ff', label: 'Source' },
              { color: RISK_COLORS.CRITICAL, label: 'Critical Risk' },
              { color: RISK_COLORS.HIGH, label: 'High Risk' },
            ].map((item, i) => (
              <g key={i} transform={`translate(${20 + i * 160}, 420)`}>
                <circle cx={6} cy={0} r={5} fill={`${item.color}33`} stroke={item.color} strokeWidth="1" />
                <text x={14} y={4} fill="#6b7280" fontSize={10}>{item.label}</text>
              </g>
            ))}
          </svg>
        )}
      </Card>

      {exposures.length > 0 && (
        <Card>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">How to Read This</h3>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li>→ <strong className="text-gray-300">You</strong> are the root node at the top</li>
            <li>→ Each <strong className="text-gray-300">data type</strong> (email, phone, etc.) is a branch from you</li>
            <li>→ Data types connect to <strong className="text-gray-300">sources</strong> where they were found</li>
            <li>→ Each source has a <strong className="text-gray-300">risk level</strong> at the bottom</li>
            <li>→ Multiple paths to the same data type indicate correlation risk</li>
          </ul>
        </Card>
      )}
    </div>
  );
}
