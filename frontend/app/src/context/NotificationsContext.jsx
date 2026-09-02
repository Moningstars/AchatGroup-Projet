import { createContext, useContext, useEffect, useState } from 'react'
import { usePusher } from './PusherContext'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

// Raisons de wallet.credited/wallet.debited qui n'ont pas déjà leur propre notification
// spécifique (RECOMPENSE et RETRAIT_REJETE sont déjà couverts via le canal SSE).
const WALLET_CREDIT_LABELS = {
  RECHARGE: 'Recharge effectuée avec succès !',
  REMBOURSEMENT: 'Remboursement reçu sur votre portefeuille.',
  CONVERSION_POINTS: 'Conversion de points réussie.',
  AJUSTEMENT_ADMIN: 'Votre solde a été crédité par l\'administration.',
}
const WALLET_DEBIT_LABELS = {
  RETRAIT_DEMANDE: 'Demande de retrait enregistrée — fonds gelés.',
  SOUSCRIPTION: 'Souscription confirmée — fonds gelés jusqu\'à la clôture.',
  AJUSTEMENT_ADMIN: 'Votre solde a été débité par l\'administration.',
}

function buildMessage(type, data) {
  if (type === 'RECOMPENSE') {
    return data.type === 'POINTS'
      ? `Récompense reçue : ${fmt(data.montant)} points crédités !`
      : `Récompense reçue : ${fmt(data.montant)} FCFA crédités sur votre portefeuille !`
  }
  if (type === 'KYC') {
    return data.statut === 'VERIFIE'
      ? 'Votre identité a été vérifiée avec succès !'
      : 'Votre demande de vérification a été rejetée.'
  }
  if (type === 'RETRAIT') {
    return data.statut === 'APPROUVE'
      ? `Retrait de ${fmt(data.montant)} FCFA approuvé.`
      : `Retrait de ${fmt(data.montant)} FCFA rejeté — montant remboursé.`
  }
  if (type === 'WALLET_CREDIT') {
    const label = WALLET_CREDIT_LABELS[data.raison]
    return label ? `${label} +${fmt(data.montant)} FCFA (solde : ${fmt(data.nouveauSolde)} FCFA)` : null
  }
  if (type === 'WALLET_DEBIT') {
    const label = WALLET_DEBIT_LABELS[data.raison]
    return label ? `${label} −${fmt(data.montant)} FCFA (solde : ${fmt(data.nouveauSolde)} FCFA)` : null
  }
  if (type === 'OPPORTUNITE_PALIER') {
    return `Le prix de "${data.titre}" vient de baisser à ${fmt(data.nouveauPrix)} FCFA !`
  }
  if (type === 'OPPORTUNITE_PROGRESSION') {
    return `${data.pourcentage}% des participants requis atteints pour "${data.titre}" (${data.participantsActuels}/${data.seuilMinimum}) !`
  }
  if (type === 'OPPORTUNITE_VALIDEE') {
    return `Achat groupé validé : "${data.titre}" a atteint son seuil minimum !`
  }
  if (type === 'OPPORTUNITE_ECHEC') {
    return `"${data.titre}" n'a pas atteint son seuil minimum — vous avez été remboursé.`
  }
  if (type === 'OPPORTUNITE_EXPIRATION_PROCHE') {
    return `"${data.titre}" expire dans moins de 24h.`
  }
  return null
}

function toastStyle(type, data) {
  if (type === 'RECOMPENSE') return 'success'
  if (type === 'KYC') return data.statut === 'VERIFIE' ? 'success' : 'error'
  if (type === 'RETRAIT') return data.statut === 'APPROUVE' ? 'success' : 'error'
  if (type === 'WALLET_CREDIT') return 'success'
  if (type === 'WALLET_DEBIT') return 'info'
  if (type === 'OPPORTUNITE_PALIER') return 'success'
  if (type === 'OPPORTUNITE_PROGRESSION') return 'info'
  if (type === 'OPPORTUNITE_VALIDEE') return 'success'
  if (type === 'OPPORTUNITE_ECHEC') return 'error'
  if (type === 'OPPORTUNITE_EXPIRATION_PROCHE') return 'info'
  return 'info'
}

function hrefFor(type, data) {
  if (type.startsWith('OPPORTUNITE_') && data.id) return `/opportunity/${data.id}`
  return null
}

const MAX_NOTIFICATIONS = 50
let nextId = 0

function storageKey(userId) { return `opportunihub-notifications-${userId}` }

function loadStored(userId) {
  if (!userId) return []
  try { return JSON.parse(localStorage.getItem(storageKey(userId))) || [] }
  catch { return [] }
}

export function NotificationsProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const { on, off } = usePusher()

  const [toasts, setToasts] = useState([])
  const [notifications, setNotifications] = useState([])

  // Charger l'historique persistant à la connexion / changement d'utilisateur
  useEffect(() => {
    setNotifications(isAuthenticated && user?.id ? loadStored(user.id) : [])
  }, [isAuthenticated, user?.id])

  // Sauvegarder à chaque changement
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    localStorage.setItem(storageKey(user.id), JSON.stringify(notifications))
  }, [notifications, isAuthenticated, user?.id])

  const add = (type, data) => {
    const msg = buildMessage(type, data)
    if (!msg) return
    const id = ++nextId
    const style = toastStyle(type, data)
    const href = hrefFor(type, data)

    setToasts(prev => [...prev, { id, msg, style }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)

    setNotifications(prev => [{ id, msg, style, href, ts: Date.now(), lu: false }, ...prev].slice(0, MAX_NOTIFICATIONS))
  }

  // Toutes les notifications personnelles arrivent par Pusher, sur le canal privé de
  // l'utilisateur (private-user-{id}) — voir PusherContext.
  useEffect(() => {
    if (!isAuthenticated) return

    const handlers = {
      'RECOMPENSE': data => add('RECOMPENSE', data),
      'KYC': data => add('KYC', data),
      'RETRAIT': data => add('RETRAIT', data),
      'OPPORTUNITE_PALIER': data => add('OPPORTUNITE_PALIER', data),
      'OPPORTUNITE_PROGRESSION': data => add('OPPORTUNITE_PROGRESSION', data),
      'OPPORTUNITE_VALIDEE': data => add('OPPORTUNITE_VALIDEE', data),
      'OPPORTUNITE_ECHEC': data => add('OPPORTUNITE_ECHEC', data),
      'OPPORTUNITE_EXPIRATION_PROCHE': data => add('OPPORTUNITE_EXPIRATION_PROCHE', data),
      'wallet.credited': data => add('WALLET_CREDIT', data),
      'wallet.debited': data => add('WALLET_DEBIT', data),
    }

    Object.entries(handlers).forEach(([event, handler]) => on(event, handler))
    return () => { Object.entries(handlers).forEach(([event, handler]) => off(event, handler)) }
  }, [isAuthenticated])

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))
  const dismissNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id))
  const clearAll = () => setNotifications([])
  const markAllRead = () => setNotifications(prev => prev.map(n => n.lu ? n : { ...n, lu: true }))

  const unreadCount = notifications.filter(n => !n.lu).length

  return (
    <NotificationsContext.Provider value={{
      toasts, dismissToast,
      notifications, unreadCount, dismissNotification, clearAll, markAllRead,
    }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
