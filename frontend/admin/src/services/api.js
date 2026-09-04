import axios from 'axios'

// Dérivé de l'hôte utilisé pour charger la page (PC ou téléphone sur le même
// réseau) au lieu de 'localhost' en dur, qui ne désignerait que l'appareil lui-même.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080/api`
export const TOKEN_KEY = 'opportunihub-admin-token'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auth admin
export const adminConnexion = (identifiant, motDePasse) =>
  api.post('/admin/auth/connexion', { identifiant, motDePasse }).then(r => r.data)

export const adminLogout = async () => {
  try {
    await api.post('/admin/auth/logout')
  } catch {
    // Silencieux
  } finally {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Opportunités (admin)
export const getAdminOpportunites = () =>
  api.get('/admin/opportunites').then(r => r.data)

export const getTentativesSouscriptionEchouees = () =>
  api.get('/admin/opportunites/tentatives-echouees').then(r => r.data)

export const getAdminOpportunite = (id) =>
  api.get(`/admin/opportunites/${id}`).then(r => r.data)

export const activerOpportunite = (id) =>
  api.patch(`/admin/opportunites/${id}/activer`).then(r => r.data)

export const cloturerOpportunite = (id) =>
  api.patch(`/admin/opportunites/${id}/cloturer`).then(r => r.data)

export const creerOpportunite = (data) =>
  api.post('/admin/opportunites', data).then(r => r.data)

export const modifierOpportunite = (id, data) =>
  api.patch(`/admin/opportunites/${id}`, data).then(r => r.data)

export const genererSpecsOpportunite = (data) =>
  api.post('/admin/opportunites/generer-specs', data).then(r => r.data)

// Images opportunité (admin)
export const uploadOpportuniteImage = (id, formData) =>
  api.post(`/admin/opportunites/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export const getOpportuniteImages = (id) =>
  api.get(`/admin/opportunites/${id}/images`).then(r => r.data)

export const deleteOpportuniteImage = (id, imageId) =>
  api.delete(`/admin/opportunites/${id}/images/${imageId}`).then(r => r.data)

export const getParticipantsOpportunite = (id) =>
  api.get(`/admin/opportunites/${id}/participants`).then(r => r.data)

export const planifierParticipantsOpportunite = (id, data) =>
  api.patch(`/admin/opportunites/${id}/participants/planification`, data).then(r => r.data)

export const mettreAJourLivraisonParticipants = (id, data) =>
  api.patch(`/admin/opportunites/${id}/participants/livraison`, data).then(r => r.data)

// Sondages (admin)
export const getAdminSondages = () =>
  api.get('/admin/sondages').then(r => r.data)

export const activerSondage = (id) =>
  api.patch(`/admin/sondages/${id}/activer`).then(r => r.data)

export const distribuerSondage = (id) =>
  api.post(`/admin/sondages/${id}/distribuer`).then(r => r.data)

export const cloturerSondage = (id) =>
  api.patch(`/admin/sondages/${id}/cloturer`).then(r => r.data)

export const creerSondage = (data) =>
  api.post('/admin/sondages', data).then(r => r.data)

export const creerEligibilite = (sondageId, data) =>
  api.post(`/admin/sondages/${sondageId}/eligibilite`, data).then(r => r.data)

export const modifierSondage = (id, data) =>
  api.patch(`/admin/sondages/${id}`, data).then(r => r.data)

export const supprimerSondage = (id) =>
  api.delete(`/admin/sondages/${id}`).then(r => r.data)

export const getReponsesAValider = (id) =>
  api.get(`/admin/sondages/${id}/reponses/a-valider`).then(r => r.data)

export const validerReponse = (reponseId, approuve) =>
  api.patch(`/admin/sondages/reponses/${reponseId}/valider`, null, { params: { approuve } }).then(r => r.data)

export const getSondageResultats = (id) =>
  api.get(`/admin/sondages/${id}/resultats`).then(r => r.data)

export const getRepondantsSondage = (id) =>
  api.get(`/admin/sondages/${id}/repondants`).then(r => r.data)

// Utilisateurs (admin)
export const getAdminUtilisateurs = () =>
  api.get('/admin/utilisateurs').then(r => r.data)

export const getAdminUtilisateurDetail = (id) =>
  api.get(`/admin/utilisateurs/${id}/detail`).then(r => r.data)

export const activerUtilisateur = (id) =>
  api.patch(`/admin/utilisateurs/${id}/activer`).then(r => r.data)

export const suspendreUtilisateur = (id) =>
  api.patch(`/admin/utilisateurs/${id}/suspendre`).then(r => r.data)

export const supprimerUtilisateur = (id) =>
  api.delete(`/admin/utilisateurs/${id}`)

// Commanditaires (admin)
export const getAdminCommanditaires = () =>
  api.get('/admin/commanditaires').then(r => r.data)

export const creerCommanditaire = (data) =>
  api.post('/admin/commanditaires', data).then(r => r.data)

export const activerCommanditaire = (id) =>
  api.patch(`/admin/commanditaires/${id}/activer`).then(r => r.data)

export const suspendreCommanditaire = (id) =>
  api.patch(`/admin/commanditaires/${id}/suspendre`).then(r => r.data)

// Fournisseurs d'opportunités (admin)
export const getAdminFournisseurs = () =>
  api.get('/admin/fournisseurs').then(r => r.data)

export const creerFournisseur = (data) =>
  api.post('/admin/fournisseurs', data).then(r => r.data)

export const activerFournisseur = (id) =>
  api.patch(`/admin/fournisseurs/${id}/activer`).then(r => r.data)

export const suspendreFournisseur = (id) =>
  api.patch(`/admin/fournisseurs/${id}/suspendre`).then(r => r.data)

// Stats admin
export const getAdminStats = () =>
  api.get('/admin/stats').then(r => r.data)

// Wallet plateforme (admin)
export const getAdminWallet = () =>
  api.get('/admin/wallet').then(r => r.data)

export const alimenterWallet = (montant, description) =>
  api.post('/admin/wallet/alimenter', { montant, description }).then(r => r.data)

export const modifierTauxConversion = (tauxConversionPoints) =>
  api.patch('/admin/wallet/taux-conversion', { tauxConversionPoints }).then(r => r.data)

export const modifierRecompenseParrainage = (recompenseParrainagePoints) =>
  api.patch('/admin/wallet/parrainage', { recompenseParrainagePoints }).then(r => r.data)

// Transactions (admin — toutes)
export const getAdminTransactions = () =>
  api.get('/admin/transactions').then(r => r.data)

// Bannières (admin)
export const getAdminBannieres = () =>
  api.get('/admin/bannieres').then(r => r.data)

export const creerBanniere = (formData) =>
  api.post('/admin/bannieres', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export const modifierBanniere = (id, formData) =>
  api.put(`/admin/bannieres/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export const toggleBanniere = (id) =>
  api.patch(`/admin/bannieres/${id}/toggle`).then(r => r.data)

export const supprimerBanniere = (id) =>
  api.delete(`/admin/bannieres/${id}`)

// Ajustement manuel du solde d'un participant
export const ajusterSoldeUtilisateur = (id, montant, description) =>
  api.patch(`/admin/wallet/utilisateurs/${id}/ajuster`, { montant, description }).then(r => r.data)

// Remboursement forcé d'une participation
export const forcerRemboursement = (participationId) =>
  api.patch(`/admin/opportunites/participations/${participationId}/rembourser`).then(r => r.data)

// Retraits en attente
export const getRetraitsEnAttente = () =>
  api.get('/admin/transactions/retraits/en-attente').then(r => r.data)

export const approuverRetrait = (id) =>
  api.patch(`/admin/transactions/retraits/${id}/approuver`).then(r => r.data)

export const rejeterRetrait = (id) =>
  api.patch(`/admin/transactions/retraits/${id}/rejeter`).then(r => r.data)

// KYC (admin)
export const getKycEnAttente = () =>
  api.get('/admin/kyc/en-attente').then(r => r.data)

export const getKycDetail = (userId) =>
  api.get(`/admin/kyc/${userId}`).then(r => r.data)

export const approuverKyc = (userId) =>
  api.post(`/admin/kyc/${userId}/approuver`).then(r => r.data)

export const rejeterKyc = (userId) =>
  api.post(`/admin/kyc/${userId}/rejeter`).then(r => r.data)

export { api }
export default api
