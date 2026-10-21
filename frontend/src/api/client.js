const BASE_URL = '/api';

async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || data.message || `Request failed with HTTP status ${res.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => fetchJson('/health'),

  // Dashboard
  getDashboard: () => fetchJson('/dashboard/summary'),

  // Disasters
  getDisasters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/disasters${query ? `?${query}` : ''}`);
  },
  getDisaster: (id) => fetchJson(`/disasters/${id}`),
  createDisaster: (data) => fetchJson('/disasters', { method: 'POST', body: JSON.stringify(data) }),
  updateDisaster: (id, data) => fetchJson(`/disasters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Emergency Requests
  getRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/requests${query ? `?${query}` : ''}`);
  },
  getRequest: (id) => fetchJson(`/requests/${id}`),
  createRequest: (data) => fetchJson('/requests', { method: 'POST', body: JSON.stringify(data) }),
  updateRequestStatus: (id, status) => fetchJson(`/requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),

  // Volunteers
  getVolunteers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/volunteers${query ? `?${query}` : ''}`);
  },
  updateVolunteerAvailability: (id, availability) => fetchJson(`/volunteers/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ availability })
  }),

  // Assignments
  getAssignments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/assignments${query ? `?${query}` : ''}`);
  },
  createAssignment: (data) => fetchJson('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignmentStatus: (id, status) => fetchJson(`/assignments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),

  // Inventory
  getInventory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/inventory${query ? `?${query}` : ''}`);
  },
  updateInventoryQuantity: (id, quantity) => fetchJson(`/inventory/${id}/quantity`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity })
  }),
  getInventoryCategories: () => fetchJson('/inventory/categories'),

  // Interactive Graph
  getGraphData: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/graph${query ? `?${query}` : ''}`);
  },

  // Advanced Queries
  getCriticalActiveRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/requests/critical-active${query ? `?${query}` : ''}`);
  },
  getUnassignedRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/requests/unassigned${query ? `?${query}` : ''}`);
  },
  getAvailableExperiencedVolunteers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/volunteers/available-experienced${query ? `?${query}` : ''}`);
  },
  getVolunteersMultipleAssignments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/volunteers/multiple-assignments${query ? `?${query}` : ''}`);
  },
  getShortestPath: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/graph/shortest-path${query ? `?${query}` : ''}`);
  },

  // Metadata dropdowns
  getLocations: () => fetchJson('/meta/locations'),
  getUsers: () => fetchJson('/meta/users'),
  getDisastersMeta: () => fetchJson('/meta/disasters'),
  getVolunteersMeta: () => fetchJson('/meta/volunteers'),
  getRequestsMeta: () => fetchJson('/meta/requests'),
};
