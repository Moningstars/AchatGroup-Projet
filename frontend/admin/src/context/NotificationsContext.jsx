import { createContext, useContext, useEffect, useState } from 'react'
import { usePusher } from './PusherContext'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

function buildMessage(type, data) {
  if (type === 'KYC_SOUMIS') {
    return 'Nouvelle demande de vérification d\'identité (KYC) à traiter.'
  }
  if (type === 'RETRAIT_DEMANDE') {
    return `Nouvelle demande de retrait : ${fmt(data.montant)} FCFA à traiter.`
  }
  if (type === 'OPPORTUNITE_PRESQUE_COMPLETE') {
    return `"${data.titre}" a atteint ${data.participantsActuels}/${data.seuilMaximal} participants.`
  }
  if (type === 'OPPORTUNITE_RISQUE_ECHEC') {
    return `"${data.titre}" expire sous 24h et n'a que ${data.participantsActuels}/${data.seuilMinimum} participants — risque d'échec.`
  }
  if (type === 'SONDAGE_BUDGET_PRESQUE_EPUISE') {
    return `Le budget du sondage "${data.titre}" est presque épuisé (${fmt(data.budgetDistribue)}/${fmt(data.budgetReserve)} FCFA distribués).`
  }
  return null
}

function hrefFor(type) {
  if (type === 'KYC_SOUMIS') return '/kyc'
  if (type === 'RETRAIT_DEMANDE') return '/portefeuilles'
  if (type === 'OPPORTUNITE_PRESQUE_COMPLETE') return '/opportunites'
  if (type === 'OPPORTUNITE_RISQUE_ECHEC') return '/opportunites'
  if (type === 'SONDAGE_BUDGET_PRESQUE_EPUISE') return '/sondages'
  return null
}

function styleFor(type) {
  if (type === 'OPPORTUNITE_PRESQUE_COMPLETE') return 'success'
  if (type === 'OPPORTUNITE_RISQUE_ECHEC') return 'error'
  if (type === 'SONDAGE_BUDGET_PRESQUE_EPUISE') return 'error'
  return 'info'
}

const MAX_NOTIFICATIONS = 50
let nextId = 0

function storageKey(adminId) { return `opportunihub-admin-notifications-${adminId}` }

function loadStored(adminId) {
  if (!adminId) return []
  try { return JSON.parse(localStorage.getItem(storageKey(adminId))) || [] }
  catch { return [] }
}

export function NotificationsProvider({ children }) {
  const { isAuthenticated, admin } = useAuth()
  const { on, off } = usePusher()

  const [toasts, setToasts] = useState([])
  const [notifications, setNotifications] = useState([])

  // Charger l'historique persistant à la connexion / changement d'admin
  useEffect(() => {
    setNotifications(isAuthenticated && admin?.id ? loadStored(admin.id) : [])
  }, [isAuthenticated, admin?.id])

  // Sauvegarder à chaque changement
  useEffect(() => {
    if (!isAuthenticated || !admin?.id) return
    localStorage.setItem(storageKey(admin.id), JSON.stringify(notifications))
  }, [notifications, isAuthenticated, admin?.id])

  const add = (type, data) => {
    const msg = buildMessage(type, data)
    if (!msg) return
    const id = ++nextId
    const style = styleFor(type)
    const href = hrefFor(type)

    setToasts(prev => [...prev, { id, msg, style }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)

    setNotifications(prev => [{ id, msg, style, href, ts: Date.now(), lu: false }, ...prev].slice(0, MAX_NOTIFICATIONS))
  }

  // Canal partagé entre tous les admins connectés — voir PusherContext.
  useEffect(() => {
    if (!isAuthenticated) return

    const handlers = {
      'KYC_SOUMIS': data => add('KYC_SOUMIS', data),
      'RETRAIT_DEMANDE': data => add('RETRAIT_DEMANDE', data),
      'OPPORTUNITE_PRESQUE_COMPLETE': data => add('OPPORTUNITE_PRESQUE_COMPLETE', data),
      'OPPORTUNITE_RISQUE_ECHEC': data => add('OPPORTUNITE_RISQUE_ECHEC', data),
      'SONDAGE_BUDGET_PRESQUE_EPUISE': data => add('SONDAGE_BUDGET_PRESQUE_EPUISE', data),
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
