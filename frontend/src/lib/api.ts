import axios from 'axios';

// ════════════════════════════════════════════════════════════════
// CLIENT API CENTRALISÉ — ImmoGest Frontend
// ════════════════════════════════════════════════════════════════

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
      return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
    }
  }
  return '/api';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ─── Intercepteur REQUEST : Injection automatique du JWT & URL dynamic 
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('access_token');
    if (token && token !== 'undefined' && token !== 'null' && token !== 'demo-session-token') {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Intercepteur RESPONSE : Gestion des erreurs globales ────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Redirection propre vers /login si 401 (non authentifié / token expiré)
    if (err.response?.status === 401) {
      if (!original._retry) {
        original._retry = true;
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken && refreshToken !== 'undefined') {
            const { data } = await axios.post(`${getApiBaseUrl()}/auth/refresh`, { RefreshToken: refreshToken });
            const newAccess  = data.AccessToken || data.accessToken;
            const newRefresh = data.RefreshToken || data.refreshToken;
            if (newAccess) {
              localStorage.setItem('access_token', newAccess);
              if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
              api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
              original.headers.Authorization = `Bearer ${newAccess}`;
              return api(original);
            }
          }
        } catch {
          // Échec du rafraîchissement
        }
      }

      // Redirection automatique vers /login sans accumuler de notifications d'erreurs
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

// ════════════════════════════════════════════════════════════════
// Types partagés
// ════════════════════════════════════════════════════════════════
export interface PagedResult<T> {
  Items: T[];
  TotalCount: number;
  Page: number;
  PageSize: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Dashboard
// ════════════════════════════════════════════════════════════════
export const dashboardApi = {
  getKpis: (params?: Record<string, unknown>) => api.get('/dashboard/kpis', { params }).then((r) => r.data),
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Auth
// ════════════════════════════════════════════════════════════════
export const authApi = {
  login:   (data: { Email: string; MotDePasse: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  register: (data: { NomComplet: string; Email: string; MotDePasse: string; Role?: number }) =>
    api.post('/auth/register', data).then((r) => r.data),
  logout:  () => api.post('/auth/logout'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { RefreshToken: refreshToken }).then((r) => r.data),
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Propriétaires
// ════════════════════════════════════════════════════════════════
export const proprietairesApi = {
  getAll:  (params?: Record<string, unknown>) =>
    api.get<PagedResult<any>>('/proprietaires', { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/proprietaires/${id}`).then((r) => r.data),
  create:  (data: unknown) => api.post('/proprietaires', data).then((r) => r.data),
  update:  (id: string, data: unknown) => api.put(`/proprietaires/${id}`, data).then((r) => r.data),
  delete:  (id: string) => api.delete(`/proprietaires/${id}`),
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Maisons
// ════════════════════════════════════════════════════════════════
export const maisonsApi = {
  getAll:       (params?: Record<string, unknown>) =>
    api.get('/maisons', { params }).then((r) => r.data),
  getById:      (id: string) => api.get(`/maisons/${id}`).then((r) => r.data),
  getByIdm:     (idm: string) => api.get(`/maisons/idm/${idm}`).then((r) => r.data),
  generateIdm:  (params: Record<string, unknown>) =>
    api.get('/maisons/generate-idm', { params }).then((r) => r.data),
  create:       (data: unknown) => api.post('/maisons', data).then((r) => r.data),
  update:       (id: string, data: unknown) => api.put(`/maisons/${id}`, data).then((r) => r.data),
  delete:       (id: string) => api.delete(`/maisons/${id}`),
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Locataires
// ════════════════════════════════════════════════════════════════
export const locatairesApi = {
  getAll:  (params?: Record<string, unknown>) => api.get('/locataires', { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/locataires/${id}`).then((r) => r.data),
  create:  (data: unknown) => api.post('/locataires', data).then((r) => r.data),
  update:  (id: string, data: unknown) => api.put(`/locataires/${id}`, data).then((r) => r.data),
  delete:  (id: string) => api.delete(`/locataires/${id}`),
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Souscriptions
// ════════════════════════════════════════════════════════════════
export const souscriptionsApi = {
  getAll:       (params?: Record<string, unknown>) => api.get('/souscriptions', { params }).then((r) => r.data),
  getById:      (id: string) => api.get(`/souscriptions/${id}`).then((r) => r.data),
  getByLocataire: (locataireId: string) =>
    api.get(`/souscriptions/locataire/${locataireId}`).then((r) => r.data),
  printContrat: (id: string) =>
    api.get(`/souscriptions/${id}/print`, { responseType: 'blob' }).then((r) => r.data),
  create:       (data: unknown) => api.post('/souscriptions', data).then((r) => r.data),
  update:       (id: string, data: unknown) => api.put(`/souscriptions/${id}`, data).then((r) => r.data),
  delete:       (id: string) => api.delete(`/souscriptions/${id}`),
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Règlements
// ════════════════════════════════════════════════════════════════
export const reglementsApi = {
  getAll:      (params?: Record<string, unknown>) => api.get('/reglements', { params }).then((r) => r.data),
  getById:     (id: string) => api.get(`/reglements/${id}`).then((r) => r.data),
  getImpayes:  () => api.get('/reglements/impayes').then((r) => r.data),
  getRecu:     (id: string) =>
    api.get(`/reglements/${id}/recu`, { responseType: 'blob' }).then((r) => r.data),
  getRecusGroupes: (annee: number, mois: number) =>
    api.get('/reglements/recu-groupes', { params: { annee, mois }, responseType: 'blob' }).then((r) => r.data),
  create:      (data: unknown) => api.post('/reglements', data).then((r) => r.data),
  createBatch: (data: unknown) => api.post('/reglements/batch', data).then((r) => r.data),
  update:      (id: string, data: unknown) => api.put(`/reglements/${id}`, data).then((r) => r.data),
  delete:      (id: string) => api.delete(`/reglements/${id}`),
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Dépenses
// ════════════════════════════════════════════════════════════════
export const depensesApi = {
  getAll:      (params?: Record<string, unknown>) => api.get('/depenses', { params }).then((r) => r.data),
  getById:     (id: string) => api.get(`/depenses/${id}`).then((r) => r.data),
  getByMaison: (maisonId: string) => api.get(`/depenses/maison/${maisonId}`).then((r) => r.data),
  getByLocataire: (locataireId: string) => api.get(`/depenses/locataire/${locataireId}`).then((r) => r.data),
  create:      (data: unknown) => api.post('/depenses', data).then((r) => r.data),
  update:      (id: string, data: unknown) => api.put(`/depenses/${id}`, data).then((r) => r.data),
  delete:      (id: string) => api.delete(`/depenses/${id}`),
  uploadPJ:    (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/depenses/${id}/piece-justificative`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data);
  },
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Entreprises & Administration SaaS
// ════════════════════════════════════════════════════════════════
export const entreprisesApi = {
  getProfil:        () => api.get('/entreprises').then((r) => r.data),
  updateProfil:     (data: unknown) => api.post('/entreprises', data).then((r) => r.data),
  getSaasClients:   () => api.get('/entreprises/saas-clients').then((r) => r.data),
  toggleBlock:      (id: string) => api.post(`/entreprises/${id}/toggle-block`).then((r) => r.data),
  prolongerEssai:   (id: string) => api.post(`/entreprises/${id}/prolonger-essai`).then((r) => r.data),
};

// ════════════════════════════════════════════════════════════════
// API ENDPOINTS — Utilisateurs & Comptes
// ════════════════════════════════════════════════════════════════
export const utilisateursApi = {
  getAll:       () => api.get<any[]>('/utilisateurs').then((r) => r.data),
  toggleStatus: (id: string, estActif: boolean) =>
    api.put(`/utilisateurs/${id}/toggle-status`, { EstActif: estActif }).then((r) => r.data),
  delete:       (id: string) => api.delete(`/utilisateurs/${id}`),
};

// ─── Utilitaire : téléchargement de PDF ──────────────────────
export function downloadPdf(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
