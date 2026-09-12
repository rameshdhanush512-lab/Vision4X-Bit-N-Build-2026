// ─────────────────────────────────────────────────────────────────────────────
// PRIVEX — Controlled Demo Dataset
// Uses entirely fictional data. No real personal information.
// ─────────────────────────────────────────────────────────────────────────────

import { ScoutFinding } from '../types';

export const DEMO_FINDINGS: ScoutFinding[] = [
  {
    source: 'PublicRecords Directory',
    dataTypes: ['email', 'phone', 'name', 'address'],
    severityCandidate: 'CRITICAL',
    confidence: 0.97,
    evidence: 'Full contact profile publicly listed including home address',
    rawData: { url: 'demo://publicrecords/profile/12345', recordType: 'contact_profile' },
  },
  {
    source: 'DataAggregator Hub',
    dataTypes: ['email', 'phone', 'name'],
    severityCandidate: 'HIGH',
    confidence: 0.91,
    evidence: 'Email and phone cross-referenced from multiple leaked datasets',
    rawData: { url: 'demo://dataaggregator/results', recordType: 'cross_reference' },
  },
  {
    source: 'Marketing Data Exchange',
    dataTypes: ['email', 'purchase_history', 'demographics'],
    severityCandidate: 'HIGH',
    confidence: 0.85,
    evidence: 'Purchase behaviour and demographic data sold to third-party advertisers',
    rawData: { url: 'demo://marketingexchange/id/9876', recordType: 'behavioral_profile' },
  },
  {
    source: 'Leaked Forum Archive',
    dataTypes: ['email', 'username', 'password_hash'],
    severityCandidate: 'CRITICAL',
    confidence: 0.99,
    evidence: 'Email and bcrypt password hash found in credential dump from 2023 breach',
    rawData: { url: 'demo://leakedforum/breach/2023', recordType: 'credential_dump' },
  },
  {
    source: 'Social Profile Index',
    dataTypes: ['name', 'employer', 'location'],
    severityCandidate: 'MEDIUM',
    confidence: 0.78,
    evidence: 'Public social media profile aggregated by data broker',
    rawData: { url: 'demo://socialindex/user/alex_kumar', recordType: 'social_aggregate' },
  },
  {
    source: 'Telemarketing Registry',
    dataTypes: ['phone', 'name'],
    severityCandidate: 'LOW',
    confidence: 0.72,
    evidence: 'Phone number on opt-in telemarketing contact list',
    rawData: { url: 'demo://telemarketing/list/general', recordType: 'contact_list' },
  },
];

export function getDemoFindings(): ScoutFinding[] {
  // Return a copy to avoid mutation
  return DEMO_FINDINGS.map((f) => ({ ...f }));
}
