/* API Service — Centralized API client for AI Travel Hub */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('access_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 — try to refresh token
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getToken()}`;
      const retry = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      if (!retry.ok) throw new Error(`API Error: ${retry.status}`);
      return retry.json();
    }
    // Redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

async function refreshToken() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    localStorage.setItem('access_token', data.access);
    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
    return true;
  } catch {
    return false;
  }
}

/* ═══ Auth ═══ */
export const auth = {
  googleLogin: (data) => request('/auth/google/', { method: 'POST', body: JSON.stringify(data) }),
  demoLogin: (data) => request('/auth/demo-login/', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me/'),
  updateMe: (data) => request('/auth/me/', { method: 'PATCH', body: JSON.stringify(data) }),
};

/* ═══ Groups ═══ */
export const groups = {
  list: () => request('/groups/'),
  get: (id) => request(`/groups/${id}/`),
  create: (data) => request('/groups/', { method: 'POST', body: JSON.stringify(data) }),
  join: (inviteCode) => request('/groups/join/', { method: 'POST', body: JSON.stringify({ invite_code: inviteCode }) }),
};

/* ═══ Trips ═══ */
export const trips = {
  list: (groupId) => request(`/trips/${groupId ? `?group=${groupId}` : ''}`),
  get: (id) => request(`/trips/${id}/`),
  create: (data) => request('/trips/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/trips/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/trips/${id}/`, { method: 'DELETE' }),
};

/* ═══ Itinerary ═══ */
export const itinerary = {
  list: (tripId) => request(`/trips/${tripId}/itinerary/`),
  create: (tripId, data) => request(`/trips/${tripId}/itinerary/`, { method: 'POST', body: JSON.stringify(data) }),
  update: (tripId, itemId, data) => request(`/trips/${tripId}/itinerary/${itemId}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (tripId, itemId) => request(`/trips/${tripId}/itinerary/${itemId}/`, { method: 'DELETE' }),
  reorder: (tripId, itemIds) => request(`/trips/${tripId}/itinerary/reorder/`, { method: 'POST', body: JSON.stringify({ item_ids: itemIds }) }),
};

/* ═══ Chat ═══ */
export const chat = {
  history: (groupId) => request(`/chat/${groupId}/messages/`),
};

/* ═══ Checklist ═══ */
export const checklists = {
  list: (tripId) => request(`/checklists/${tripId}/`),
};

/* ═══ Finance ═══ */
export const finance = {
  expenses: (tripId) => request(`/finance/trips/${tripId}/expenses/`),
  createExpense: (data) => request('/finance/expenses/create/', { method: 'POST', body: JSON.stringify(data) }),
  debtSummary: (tripId) => request(`/finance/debts/${tripId}/summary/`),
  markPaid: (splitId) => request(`/finance/debts/${splitId}/pay/`, { method: 'POST' }),
};

/* ═══ AI ═══ */
export const ai = {
  status: () => request('/ai/status/'),
};

/* ═══ Notifications ═══ */
export const notifications = {
  registerToken: (token) => request('/notifications/push-token/', { method: 'POST', body: JSON.stringify({ push_token: token }) }),
  preferences: () => request('/notifications/preferences/'),
  updatePreference: (data) => request('/notifications/preferences/', { method: 'POST', body: JSON.stringify(data) }),
};

/* ═══ WebSocket Helper ═══ */
export function createWebSocket(path) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsBase = `${protocol}//${window.location.host}`;
  return new WebSocket(`${wsBase}${path}`);
}
