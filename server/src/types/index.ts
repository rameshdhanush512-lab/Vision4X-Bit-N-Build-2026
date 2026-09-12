// ─────────────────────────────────────────────
// PRIVEX — Shared TypeScript types
// ─────────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  email: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AgentStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type ExposureStatus =
  | 'DETECTED'
  | 'ANALYZING'
  | 'ACTION_REQUIRED'
  | 'REQUEST_SENT'
  | 'FOLLOW_UP_REQUIRED'
  | 'RESOLVED'
  | 'FALSE_POSITIVE';

export interface ScoutFinding {
  source: string;
  dataTypes: string[];
  severityCandidate: string;
  confidence: number;
  evidence: string;
  rawData?: Record<string, unknown>;
}

export interface RiskResult {
  riskLevel: RiskLevel;
  riskScore: number;
  explanation: string;
  factors: string[];
  recommendation: string;
}

export interface PrivacyRequestDraft {
  targetOrg: string;
  requestType: string;
  reason: string;
  generatedRequest: string;
}

// LangGraph workflow state
export interface PrivacyWorkflowState {
  userId: string;
  scanId: string;
  userProfile: {
    name: string;
    email: string;
    additionalContext?: string;
  };
  plan: string[];
  currentStep: string;
  findings: ScoutFinding[];
  riskResults: Array<RiskResult & { findingIndex: number }>;
  privacyRequests: PrivacyRequestDraft[];
  errors: string[];
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  completedAt?: string;
}

// Socket.IO event payloads
export interface AgentEvent {
  scanId: string;
  agentName: string;
  status: AgentStatus;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
