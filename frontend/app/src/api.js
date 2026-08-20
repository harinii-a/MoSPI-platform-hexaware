/**
 * Centralized API Client for MoSPI Survey Intelligence Platform
 * Handles auth token injection, active dataset context, and error handling.
 */
import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// Inject auth token into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mospi_token');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mospi_token');
      localStorage.removeItem('mospi_user');
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) =>
    api.post('/api/v1/auth/login', { username, password }),
  me: () => api.get('/api/v1/auth/me'),
  roles: () => api.get('/api/v1/auth/roles'),
};

// ─── Datasets ────────────────────────────────────────────────────
export const datasetApi = {
  upload: (formData) =>
    api.post('/api/v1/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadHistorical: (formData, targetDatasetId) =>
    api.post(`/api/v1/datasets/historical?target_dataset_id=${targetDatasetId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: () => api.get('/api/v1/datasets'),
  get: (id) => api.get(`/api/v1/datasets/${id}`),
  schema: (id) => api.get(`/api/v1/datasets/${id}/schema`),
  config: (id) => api.get(`/api/v1/datasets/${id}/configuration`),
  updateConfig: (id, config) => api.put(`/api/v1/datasets/${id}/configuration`, config),
  updateMetadata: (id, metaUpdates) => api.put(`/api/v1/datasets/${id}`, metaUpdates),
  activate: (id) => api.post(`/api/v1/datasets/${id}/activate`),
  delete: (id) => api.delete(`/api/v1/datasets/${id}`),
  validate: (id) => api.post(`/api/v1/datasets/${id}/validate`),
  summary: (id) => api.get(`/api/v1/datasets/${id}/summary`),
  analytics: (id) => api.get(`/api/v1/datasets/${id}/analytics`),
  records: (id, page = 1, pageSize = 50, severity = 'ALL', search = '') =>
    api.get(`/api/v1/datasets/${id}/records?page=${page}&page_size=${pageSize}&severity=${severity}&search=${encodeURIComponent(search)}`),
  clusters: (id) => api.get(`/api/v1/datasets/${id}/clusters`),
  enumerators: (id) => api.get(`/api/v1/datasets/${id}/enumerators`),
  explain: (id, recordIndex) =>
    api.get(`/api/v1/datasets/${id}/records/${recordIndex}/explanation`),
  review: (id, recordIndex, action) =>
    api.post(`/api/v1/datasets/${id}/records/${recordIndex}/review`, action),
  autoApproveClean: (id) =>
    api.post(`/api/v1/datasets/${id}/auto-approve-clean`),
  evaluation: (id) => api.get(`/api/v1/datasets/${id}/evaluation`),
  generateReport: (id, format = 'pdf') =>
    api.post(`/api/v1/datasets/${id}/reports/generate?format=${format}`, null, {
      responseType: 'blob',
    }),
};

// ─── Rules ───────────────────────────────────────────────────────
export const rulesApi = {
  list: (datasetId) =>
    api.get(`/api/v1/rules${datasetId ? `?dataset_id=${datasetId}` : ''}`),
  create: (rule) => api.post('/api/v1/rules', rule),
  update: (id, updates) => api.put(`/api/v1/rules/${id}`, updates),
  delete: (id) => api.delete(`/api/v1/rules/${id}`),
};

// ─── Audit & Notifications ──────────────────────────────────────
export const auditApi = {
  log: (datasetId) =>
    api.get(`/api/v1/audit-log${datasetId ? `?dataset_id=${datasetId}` : ''}`),
  notifications: (datasetId) =>
    api.get(`/api/v1/notifications${datasetId ? `?dataset_id=${datasetId}` : ''}`),
  markRead: (notifId) => api.post(`/api/v1/notifications/${notifId}/read`),
};

// ─── Users ───────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/api/v1/users'),
  create: (user) => api.post('/api/v1/users', user),
  update: (username, updates) => api.put(`/api/v1/users/${username}`, updates),
  delete: (username) => api.delete(`/api/v1/users/${username}`),
};

// ─── Report download helper ─────────────────────────────────────
export const downloadReport = async (datasetId, format = 'pdf') => {
  try {
    const response = await datasetApi.generateReport(datasetId, format);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'json';
    link.setAttribute('download', `survey_report.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Report download failed:', err);
    throw err;
  }
};

export const WS_URL = 'ws://127.0.0.1:8000/ws/live';

export default api;
