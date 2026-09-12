// ─────────────────────────────────────────────
// PRIVEX API Service
// All HTTP calls to the Express backend
// ─────────────────────────────────────────────

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('privex_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Backend unavailable. Start the server on http://localhost:3001.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST', body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST', body: JSON.stringify(data),
    }),

  getMe: () => request<{ user: any }>('/auth/me'),
};

// ── Privacy
export const privacyApi = {
  startScan: (additionalContext?: string) =>
    request<{ scanId: string; message: string }>('/privacy/scan', {
      method: 'POST', body: JSON.stringify({ additionalContext }),
    }),

  getExposures: () =>
    request<{ exposures: any[] }>('/privacy/exposures'),

  getExposureById: (id: string) =>
    request<{ exposure: any }>(`/privacy/exposures/${id}`),

  createRequest: (data: any) =>
    request<{ request: any }>('/privacy/request', {
      method: 'POST', body: JSON.stringify(data),
    }),

  getRequests: () =>
    request<{ requests: any[] }>('/privacy/requests'),

  getRequestById: (id: string) =>
    request<{ request: any }>(`/privacy/requests/${id}`),

  sendRequest: (id: string) =>
    request<{ success: boolean; status: string; requestId: string; emailPreviewUrl?: string; message: string }>(
      `/privacy/requests/${id}/send`,
      { method: 'POST' }
    ),

  updateRequestStatus: (id: string, status: string) =>
    request<{ request: any }>(`/privacy/requests/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),

  getFollowUps: () =>
    request<{ followUps: any[] }>('/privacy/followups'),

  verify: (data: { exposureId: string; outcome: string; notes?: string }) =>
    request<{ result: any }>('/privacy/verify', {
      method: 'POST', body: JSON.stringify(data),
    }),

  analyze: (exposureId: string) =>
    request<{ exposureId: string; explanation: string; usedLLM: boolean }>('/privacy/analyze', {
      method: 'POST', body: JSON.stringify({ exposureId }),
    }),
};

// ── Agents / Dashboard
export const agentApi = {
  getRuns: (scanId?: string) =>
    request<{ runs: any[] }>(`/agents/runs${scanId ? `?scanId=${scanId}` : ''}`),
};

export const dashboardApi = {
  get: () => request<any>('/dashboard'),
};
