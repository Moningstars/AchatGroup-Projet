import axios from 'axios'

// En production, l'API passe par le hostname public Cloudflare.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`
export const BACKEND_ORIGIN = BASE_URL.replace(/\/api\/?$/, '')
export const TOKEN_KEY = 'opportunihub-token'

export const imgUrl = (url) =>
  url ? (url.startsWith('http') ? url : BACKEND_ORIGIN + url) : null

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const removeToken = async () => {
  try {
    // Révocation côté serveur (blacklist Redis) avant suppression locale
    await api.post('/auth/logout')
  } catch {
    // Silencieux : le logout local reste effectif même si le serveur est injoignable
  } finally {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authVerifierFirebase = (idToken) =>
  api.post('/auth/verifier-token', { idToken }).then((r) => r.data)

// [DEV] Contournement temporaire tant que Firebase n'est pas configuré (voir Connexion.jsx)
export const connexionDev = (telephone) =>
  api.post('/auth/dev/connexion', { telephone }).then((r) => r.data)

export const completerProfil = (nom) =>
  api.post('/auth/completer-profil', { nom }).then((r) => r.data)

// ── Stats publiques ───────────────────────────────────────────────────────────

export const getStats = () =>
  api.get('/stats').then((r) => r.data)

// ── Opportunités ──────────────────────────────────────────────────────────────

export const getOpportunites = (params = {}) =>
  api.get('/opportunites', {
    params,
    paramsSerializer: {
      indexes: null,
    },
  }).then((r) => r.data)

export const getOpportunite = (id) =>
  api.get(`/opportunites/${id}`).then((r) => r.data)

export const souscrire = (id, quantite = 1) =>
  api.post(`/opportunites/${id}/souscrire`, null, { params: { quantite } }).then((r) => r.data)

export const getMesParticipationsOpportunites = () =>
  api.get('/opportunites/mes-participations').then((r) => r.data)

export const confirmerReceptionOpportunite = (participationId, recu = true, commentaire = '') =>
  api.patch(`/opportunites/mes-participations/${participationId}/reception`, { recu, commentaire }).then((r) => r.data)

// ── Portefeuille ──────────────────────────────────────────────────────────────

export const getSolde = () =>
  api.get('/wallet/solde').then((r) => r.data)

export const recharger = (montant, moyenPaiement, reference) =>
  api.post('/wallet/recharger', { montant, moyenPaiement, reference }).then((r) => r.data)

export const initierRechargePaygate = (montant, network, telephone) =>
  api.post('/wallet/recharger/paygate', { montant, network, telephone }).then((r) => r.data)

export const getPaygateMode = () =>
  api.get('/wallet/recharger/paygate/mode').then((r) => r.data)

export const demanderRetrait = (montant, coordonnees) =>
  api.post('/wallet/retrait', { montant, coordonnees }).then((r) => r.data)

export const getTransactions = () =>
  api.get('/wallet/transactions').then((r) => r.data)

export const convertirPoints = (montantPoints) =>
  api.post('/wallet/convertir-points', { montantPoints }).then((r) => r.data)

// ── KYC / Profil ─────────────────────────────────────────────────────────────

export const getKycStatus = () =>
  api.get('/profil/kyc').then((r) => r.data)

export const soumettreKyc = (data) =>
  api.post('/profil/kyc', data).then((r) => r.data)

// ── Sondages ──────────────────────────────────────────────────────────────────

export const getSondages = () =>
  api.get('/sondages').then((r) => r.data)

export const getSondage = (id) =>
  api.get(`/sondages/${id}`).then((r) => r.data)

export const getEligibiliteQuestions = (sondageId) =>
  api.get(`/sondages/${sondageId}/eligibilite`).then((r) => r.data).catch(() => null)

export const getMonEligibilite = (sondageId) =>
  api.get(`/sondages/${sondageId}/mon-eligibilite`).then((r) => r.data).catch(() => null)

export const passerEligibilite = (sondageId, reponses) =>
  api.post(`/sondages/${sondageId}/eligibilite`, { reponses }).then((r) => r.data)

export const repondreASondage = (sondageId, reponses) =>
  api.post(`/sondages/${sondageId}/repondre`, { reponses }).then((r) => r.data)

export const getMesParticipationsSondages = () =>
  api.get('/sondages/mes-participations').then((r) => r.data)

export const soumettrePreuve = (sondageId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/sondages/${sondageId}/reponse/preuve`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// Bannières
export const getBannieres = (page) =>
  api.get('/bannieres', { params: { page } }).then(r => r.data)
