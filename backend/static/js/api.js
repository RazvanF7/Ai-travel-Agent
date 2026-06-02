/* API Service — Centralized API client for AI Travel Hub (Session Auth) */

const API_BASE = '/api';

function getCsrfToken() {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, 10) === ('csrftoken=')) {
        cookieValue = decodeURIComponent(cookie.substring(10));
        break;
      }
    }
  }
  return cookieValue;
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCsrfToken(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
      if (response.status === 403 && window.location.pathname.startsWith('/login')) {
          // don't redirect if we're trying to log in
      } else {
        window.location.href = '/login/';
        throw new Error('Session expired');
      }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Make a streaming SSE request (for AI endpoints).
 * Returns a Response object — caller reads the stream.
 */
async function streamRequest(endpoint, body) {
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCsrfToken(),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    window.location.href = '/login/';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `API Error: ${response.status}`);
  }

  return response;
}

/* ═══ Groups ═══ */
export const groups = {
  list: () => request('/groups/'),
  get: (id) => request(`/groups/${id}/`),
  create: (data) => request('/groups/', { method: 'POST', body: JSON.stringify(data) }),
  join: (inviteCode) => request('/groups/join/', { method: 'POST', body: JSON.stringify({ invite_code: inviteCode }) }),
  leave: (id) => request(`/groups/${id}/leave/`, { method: 'POST' }),
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
  poll: (groupId, since) => request(`/chat/${groupId}/messages/?since=${encodeURIComponent(since)}`),
  send: (groupId, content) => request(`/chat/${groupId}/send/`, { method: 'POST', body: JSON.stringify({ content }) }),
};

/* ═══ Checklist ═══ */
export const checklists = {
  list: (tripId) => request(`/checklists/${tripId}/`),
  create: (tripId, data) => request(`/checklists/${tripId}/`, { method: 'POST', body: JSON.stringify(data) }),
  toggle: (tripId, itemId) => request(`/checklists/${tripId}/${itemId}/toggle/`, { method: 'POST' }),
  remove: (tripId, itemId) => request(`/checklists/${tripId}/${itemId}/delete/`, { method: 'DELETE' }),
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
  generateItinerary: (data) => request('/ai/generate-itinerary/', { method: 'POST', body: JSON.stringify(data) }),
  concierge: (data) => streamRequest('/ai/concierge/', data),
};

/* ═══ Notifications ═══ */
export const notifications = {
  registerToken: (token) => request('/notifications/push-token/', { method: 'POST', body: JSON.stringify({ push_token: token }) }),
  preferences: () => request('/notifications/preferences/'),
  updatePreference: (data) => request('/notifications/preferences/', { method: 'POST', body: JSON.stringify(data) }),
};

/**
 * Parse SSE stream from a fetch Response.
 * Calls onEvent(eventData) for each parsed SSE event.
 * Returns when the stream ends.
 */
export async function readSSEStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentData = null;
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        currentData = line.slice(6);
      } else if (line === '' && currentData !== null) {
        try {
          const parsed = JSON.parse(currentData);
          onEvent(parsed);
        } catch (e) {
          console.error('SSE parse error:', e);
        }
        currentData = null;
      }
    }
  }
}
