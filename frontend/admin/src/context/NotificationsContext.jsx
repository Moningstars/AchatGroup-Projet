import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePusher } from './PusherContext'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

function buildMessage(type, data = {}) {
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
    return `Le budget du Miitch i "${data.titre}" est presque épuisé (${fmt(data.budgetDistribue)}/${fmt(data.budgetReserve)} FCFA distribués).`
  }
  if (type === 'OPPORTUNITE_VALIDEE') {
    return `Le Miitch « ${data.titre} » a atteint son seuil minimum (${data.participantsActuels}/${data.seuilMinimum}).`
  }
  if (type === 'OPPORTUNITE_ECHEC') {
    return `Le Miitch « ${data.titre} » a été clôturé sans atteindre son seuil. Les participants ont été remboursés.`
  }
  if (type === 'RECEPTION_PARTICIPANT') {
    return data.recu
      ? 'Un participant a confirmé la réception de sa commande.'
      : 'Un participant a signalé un problème de livraison.'
  }
  if (type === 'RECEPTION_EN_RETARD') {
    return `${data.participant || 'Un participant'} n’a pas encore confirmé une livraison arrivée à échéance.`
  }
  if (type === 'SONDAGE_PREUVE_SOUMISE') {
    return `Nouvelle preuve à vérifier pour le Miitch i « ${data.titre} ».`
  }
  return null
}

function hrefFor(type, data = {}) {
  if (type === 'KYC_SOUMIS') return '/kyc'
  if (type === 'RETRAIT_DEMANDE') return '/portefeuilles'
  if (type.startsWith('OPPORTUNITE_') && (data.id || data.opportuniteId)) return `/opportunites/${data.id || data.opportuniteId}`
  if (type === 'RECEPTION_PARTICIPANT' || type === 'RECEPTION_EN_RETARD') {
    return data.opportuniteId ? `/opportunites/${data.opportuniteId}` : '/opportunites/traitement'
  }
  if (type === 'SONDAGE_PREUVE_SOUMISE' && data.sondageId) return `/sondages/${data.sondageId}/reponses`
  if (type === 'SONDAGE_BUDGET_PRESQUE_EPUISE' && data.sondageId) return `/sondages/${data.sondageId}`
  if (type.startsWith('OPPORTUNITE_')) return '/opportunites'
  if (type.startsWith('SONDAGE_')) return '/sondages'
  return null
}

function styleFor(type, data = {}) {
  if (type === 'OPPORTUNITE_PRESQUE_COMPLETE') return 'success'
  if (type === 'OPPORTUNITE_VALIDEE') return 'success'
  if (type === 'RECEPTION_PARTICIPANT') return data.recu ? 'success' : 'error'
  if (type === 'OPPORTUNITE_RISQUE_ECHEC') return 'error'
  if (type === 'OPPORTUNITE_ECHEC') return 'error'
  if (type === 'SONDAGE_BUDGET_PRESQUE_EPUISE') return 'error'
  if (type === 'RECEPTION_EN_RETARD') return 'warning'
  if (type === 'SONDAGE_PREUVE_SOUMISE') return 'warning'
  return 'info'
}

const MAX_NOTIFICATIONS = 50

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function storageKey(adminId) { return `opportunihub-admin-notifications-${adminId}` }

function loadStored(adminId) {
  if (!adminId) return []
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(adminId)))
    return Array.isArray(stored) ? stored.filter(item => item?.id && item?.msg).slice(0, MAX_NOTIFICATIONS) : []
  }
  catch { return [] }
}

export function NotificationsProvider({ children }) {
  const { isAuthenticated, admin } = useAuth()
  const { on, off } = usePusher()

  const [toasts, setToasts] = useState([])
  const [notifications, setNotifications] = useState([])
  const recentEvents = useRef(new Map())

  // Charger l'historique persistant à la connexion / changement d'admin
  useEffect(() => {
    setNotifications(isAuthenticated && admin?.id ? loadStored(admin.id) : [])
  }, [isAuthenticated, admin?.id])

  // Sauvegarder à chaque changement
  useEffect(() => {
    if (!isAuthenticated || !admin?.id) return
    localStorage.setItem(storageKey(admin.id), JSON.stringify(notifications))
  }, [notifications, isAuthenticated, admin?.id])

  const add = useCallback((type, data = {}) => {
    const msg = buildMessage(type, data)
    if (!msg) return
    const signature = `${type}:${data.id || data.opportuniteId || data.sondageId || data.utilisateurId || ''}:${data.statut || data.recu || ''}`
    const now = Date.now()
    if (now - (recentEvents.current.get(signature) || 0) < 1500) return
    recentEvents.current.set(signature, now)

    const id = createId()
    const style = styleFor(type, data)
    const href = hrefFor(type, data)

    setToasts(prev => [...prev.slice(-2), { id, msg, style }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)

    setNotifications(prev => [{ id, msg, style, href, ts: now, lu: false }, ...prev].slice(0, MAX_NOTIFICATIONS))
  }, [])

  // Canal partagé entre tous les admins connectés — voir PusherContext.
  useEffect(() => {
    if (!isAuthenticated) return

    const handlers = {
      'KYC_SOUMIS': data => add('KYC_SOUMIS', data),
      'RETRAIT_DEMANDE': data => add('RETRAIT_DEMANDE', data),
      'OPPORTUNITE_PRESQUE_COMPLETE': data => add('OPPORTUNITE_PRESQUE_COMPLETE', data),
      'OPPORTUNITE_RISQUE_ECHEC': data => add('OPPORTUNITE_RISQUE_ECHEC', data),
      'SONDAGE_BUDGET_PRESQUE_EPUISE': data => add('SONDAGE_BUDGET_PRESQUE_EPUISE', data),
      'OPPORTUNITE_VALIDEE': data => add('OPPORTUNITE_VALIDEE', data),
      'OPPORTUNITE_ECHEC': data => add('OPPORTUNITE_ECHEC', data),
      'RECEPTION_PARTICIPANT': data => add('RECEPTION_PARTICIPANT', data),
      'RECEPTION_EN_RETARD': data => add('RECEPTION_EN_RETARD', data),
      'SONDAGE_PREUVE_SOUMISE': data => add('SONDAGE_PREUVE_SOUMISE', data),
    }

    Object.entries(handlers).forEach(([event, handler]) => on(event, handler))
    return () => { Object.entries(handlers).forEach(([event, handler]) => off(event, handler)) }
  }, [add, isAuthenticated, off, on])

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
