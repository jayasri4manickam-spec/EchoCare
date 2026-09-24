const envApiUrl = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_API_BASE_URL : undefined;

export const API_BASE_URL =
  envApiUrl ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:5001/api');

async function fetchApi(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('echocare_auth_token');
    const headers = {
      'Content-Type': 'application/json',
      'x-guest-access': 'true',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        console.warn(`[API Notice] Endpoint ${endpoint} returned non-JSON payload (HTTP ${response.status}):`, text.substring(0, 150));
        return {
          success: false,
          status: response.status,
          error: `Backend server at ${API_BASE_URL} returned non-JSON HTTP ${response.status}. Please ensure backend server is running.`,
        };
      }
    }

    if (!response.ok) {
      console.warn(`API call ${endpoint} returned status ${response.status}:`, data?.error);
    }
    return data;
  } catch (err) {
    console.warn(`Backend server unreachable at ${endpoint}, using client fallback mode:`, err.message);
    return { success: false, offline: true, error: err.message };
  }
}

export const api = {
  // Auth
  login: (username, password) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => fetchApi('/auth/me'),

  // Patient & Memory Graph
  getPatient: (id = 'pat-1') => fetchApi(`/patients/${id}`),
  updatePatient: (id, data) => fetchApi(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getMemoryGraph: (patientId = 'pat-1') => fetchApi(`/memories/graph?patientId=${patientId}`),

  // Echo Voice Orchestration
  sendEchoMessage: (text, language = 'en-IN', patientId = 'pat-1') =>
    fetchApi('/echo/message', { method: 'POST', body: JSON.stringify({ patientId, text, language }) }),

  // Medications
  getMedications: (patientId = 'pat-1') => fetchApi(`/medications?patientId=${patientId}`),
  getMedicationsTimeline: (patientId = 'pat-1') => fetchApi(`/medications/timeline?patientId=${patientId}`),
  addMedication: (data) => fetchApi('/medications', { method: 'POST', body: JSON.stringify(data) }),
  confirmMedication: (id, confirmation_method = 'UI', verified_by = 'Patient') =>
    fetchApi(`/medications/${id}/confirm`, { method: 'POST', body: JSON.stringify({ confirmation_method, verified_by }) }),
  snoozeMedication: (id) => fetchApi(`/medications/${id}/snooze`, { method: 'POST' }),
  deleteMedication: (id) => fetchApi(`/medications/${id}`, { method: 'DELETE' }),
  runTestSimulation: (patientId = 'pat-1', medicationName = 'Metformin 500mg') =>
    fetchApi('/medications/test-simulation', { method: 'POST', body: JSON.stringify({ patientId, medicationName }) }),

  // Memories
  getMemories: (patientId = 'pat-1') => fetchApi(`/memories?patientId=${patientId}`),
  addMemory: (data) => fetchApi('/memories', { method: 'POST', body: JSON.stringify(data) }),

  // Caregivers
  getCaregivers: (patientId = 'pat-1') => fetchApi(`/caregivers?patientId=${patientId}`),
  addCaregiver: (data) => fetchApi('/caregivers', { method: 'POST', body: JSON.stringify(data) }),
  registerFcmDevice: (caregiverId, token, platform = 'web') =>
    fetchApi('/caregivers/register-device', {
      method: 'POST',
      body: JSON.stringify({
        caregiverId: caregiverId || 'cg-1',
        token,
        fcmToken: token,
        platform: platform || 'web',
        deviceInfo: typeof platform === 'string' && platform.includes('Browser') ? platform : `${platform} browser`,
      }),
    }),

  // Notifications & Acknowledgement
  getNotifications: (patientId = 'pat-1') => fetchApi(`/notifications?patientId=${patientId}`),
  acknowledgeNotification: (id, acknowledgedBy = 'Caregiver User') =>
    fetchApi(`/notifications/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({ acknowledgedBy }) }),
  testAlert: (data) => fetchApi('/notifications/test-alert', { method: 'POST', body: JSON.stringify(data) }),
  sendTestFcmNotification: (caregiverId = 'cg-1', fcmToken = null) =>
    fetchApi('/notifications/test-fcm', { method: 'POST', body: JSON.stringify({ caregiverId, fcmToken }) }),

  // Caregiver Observations
  getObservations: (patientId = 'pat-1') => fetchApi(`/observations?patientId=${patientId}`),
  createDraftObservation: (caregiver_name, raw_audio_text) =>
    fetchApi('/observations', { method: 'POST', body: JSON.stringify({ caregiver_name, raw_audio_text }) }),
  confirmObservation: (data) => fetchApi('/observations/confirm', { method: 'POST', body: JSON.stringify(data) }),

  // Handovers
  getHandovers: (patientId = 'pat-1') => fetchApi(`/handovers?patientId=${patientId}`),
  createHandover: (data) => fetchApi('/handovers', { method: 'POST', body: JSON.stringify(data) }),

  // Timeline
  getTimeline: (patientId = 'pat-1', limit = 50, offset = 0) => fetchApi(`/timeline?patientId=${patientId}&limit=${limit}&offset=${offset}`),

  // Audit Logs
  getAuditLogs: () => fetchApi('/audit-logs'),

  // Database Status
  getDbStatus: () => fetchApi('/db/status'),

  // Real-Time Event Stream Listener
  subscribeEventStream: (onEvent) => {
    try {
      const eventSource = new EventSource(`${API_BASE_URL}/events/stream`);
      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch (err) {
          console.error('Failed parsing EventSource SSE data', err);
        }
      };
      eventSource.onerror = (err) => {
        console.warn('EventSource disconnected, closing stream', err);
        eventSource.close();
      };
      return () => eventSource.close();
    } catch (err) {
      console.warn('EventSource initialization failed:', err.message);
      return () => {};
    }
  },
};
