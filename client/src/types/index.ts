// ─────────────────────────────────────────────
// PRIVEX Frontend Types
// ─────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AgentStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type ExposureStatus =
  | 'DETECTED' | 'ANALYZING' | 'ACTION_REQUIRED'
  | 'REQUEST_SENT' | 'FOLLOW_UP_REQUIRED' | 'RESOLVED' | 'FALSE_POSITIVE';
export type RequestStatus =
  | 'DRAFT' | 'READY' | 'SENT' | 'ACKNOWLEDGED' | 'COMPLETED' | 'REJECTED' | 'EXPIRED';
export type FollowUpStatus = 'PENDING' | 'DUE' | 'COMPLETED' | 'SKIPPED';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Exposure {
  id: string;
  userId: string;
  source: string;
  dataTypes: string[];
  severityCandidate: string;
  confidence: number;
  evidence: string;
  status: ExposureStatus;
  detectedAt: string;
  resolvedAt?: string;
  riskAssessment?: RiskAssessment;
  privacyRequests?: PrivacyRequest[];
  verificationResults?: VerificationResult[];
}

export interface RiskAssessment {
  id: string;
  exposureId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  explanation: string;
  factors: string[];
  recommendation: string;
  analyzedAt: string;
}

export interface AgentRun {
  id: string;
  userId: string;
  scanId: string;
  agentName: string;
  task: string;
  status: AgentStatus;
  result?: string;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface PrivacyRequest {
  id: string;
  userId: string;
  exposureId: string;
  targetOrg: string;
  requestType: string;
  reason: string;
  generatedRequest: string;
  status: RequestStatus;
  sentAt?: string;
  followUpDate?: string;
  createdAt: string;
  exposure?: { source: string; dataTypes: string[] };
}

export interface FollowUp {
  id: string;
  userId: string;
  privacyRequestId: string;
  scheduledAt: string;
  status: FollowUpStatus;
  notes?: string;
  completedAt?: string;
  privacyRequest?: { targetOrg: string; requestType: string; status: string };
}

export interface VerificationResult {
  id: string;
  exposureId: string;
  method: string;
  outcome: string;
  notes?: string;
  verifiedAt: string;
}

export interface DashboardData {
  privacyScore: number;
  exposureSummary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
  };
  activeRequests: number;
  resolvedExposures: number;
  pendingFollowUps: number;
  recentAgentActivity: AgentRun[];
}

export interface AgentEvent {
  scanId: string;
  agentName: string;
  status: AgentStatus;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
