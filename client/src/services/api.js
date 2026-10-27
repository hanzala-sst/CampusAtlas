// Centralized API client with credentials included for HttpOnly cookie session auth

const BASE_URL = '/api';

export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    credentials: 'include', // Essential for sending and receiving HttpOnly auth cookies
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  // Parse JSON response
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { success: response.ok, statusText: response.statusText };
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || 'API request failed');
    error.status = response.status;
    error.code = data?.error?.code || 'UNKNOWN_ERROR';
    error.details = data?.error?.details || null;
    throw error;
  }

  return data;
}

export const api = {
  auth: {
    register: (body) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => apiRequest('/auth/logout', { method: 'POST' }),
    me: () => apiRequest('/auth/me', { method: 'GET' }),
  },
  resources: {
    list: (params = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, val);
        }
      });
      const queryStr = searchParams.toString();
      return apiRequest(`/resources${queryStr ? `?${queryStr}` : ''}`, { method: 'GET' });
    },
    get: (id) => apiRequest(`/resources/${id}`, { method: 'GET' }),
    upload: (formData) => apiRequest('/resources', { method: 'POST', body: formData }),
    update: (id, body) => apiRequest(`/resources/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id) => apiRequest(`/resources/${id}`, { method: 'DELETE' }),
    retry: (id) => apiRequest(`/resources/${id}/retry`, { method: 'POST' }),
    vote: (id, value) => apiRequest(`/resources/${id}/vote`, { method: 'POST', body: JSON.stringify({ value }) }),
    getComments: (id) => apiRequest(`/resources/${id}/comments`, { method: 'GET' }),
    addComment: (id, body) => apiRequest(`/resources/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
    deleteComment: (resourceId, commentId) => apiRequest(`/resources/${resourceId}/comments/${commentId}`, { method: 'DELETE' }),
    report: (id, body) => apiRequest(`/resources/${id}/report`, { method: 'POST', body: JSON.stringify(body) }),
    getPreviewUrl: (id) => `${BASE_URL}/resources/${id}/preview`,
    getDownloadUrl: (id) => `${BASE_URL}/resources/${id}/download`,
  },
  search: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const queryStr = searchParams.toString();
    return apiRequest(`/search${queryStr ? `?${queryStr}` : ''}`, { method: 'GET' });
  },
  moderator: {
    getQueue: () => apiRequest('/moderator/queue', { method: 'GET' }),
    verify: (id, note) => apiRequest(`/moderator/resources/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ note }) }),
    unverify: (id) => apiRequest(`/moderator/resources/${id}/unverify`, { method: 'PATCH' }),
    archive: (id, note) => apiRequest(`/moderator/resources/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ note }) }),
    resolveReport: (id, body) => apiRequest(`/moderator/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  users: {
    getContributions: () => apiRequest('/users/me/contributions', { method: 'GET' }),
    getReputation: (userId) => apiRequest(`/users/${userId}/reputation`, { method: 'GET' }),
  },
  ask: {
    query: (body) => apiRequest('/ask', { method: 'POST', body: JSON.stringify(body) }),
  },
};
