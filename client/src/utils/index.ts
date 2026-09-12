import { RiskLevel } from '../types';

export function getRiskColor(level: RiskLevel | string): string {
  switch (level) {
    case 'CRITICAL': return 'text-red-400';
    case 'HIGH':     return 'text-orange-400';
    case 'MEDIUM':   return 'text-yellow-400';
    case 'LOW':      return 'text-green-400';
    default:         return 'text-gray-400';
  }
}

export function getRiskBadgeClass(level: RiskLevel | string): string {
  switch (level) {
    case 'CRITICAL': return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'HIGH':     return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'MEDIUM':   return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'LOW':      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    default:         return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'RUNNING':   return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'COMPLETED': return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'FAILED':    return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'WAITING':   return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    case 'SKIPPED':   return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    default:          return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

export function scoreToColor(score: number): string {
  if (score >= 75) return '#44cc88';
  if (score >= 50) return '#ffd700';
  if (score >= 25) return '#ff8c00';
  return '#ff4444';
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
