import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { Bell, CheckCircle2, XCircle, Trash2, X } from 'lucide-react'
import NavBar from '../common/NavBar'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import NotificationToast from '../components/NotificationToast'

const NOTIF_ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
  error:   <XCircle size={16} className="text-rose-500 shrink-0" />,
  info:    <Bell size={16} className="text-indigo-500 shrink-0" />,
}

function heureRelative(ts) {
  const diffMin = Math.floor((Date.now() - ts) / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const PAGE_META = {
  '/': { label: "Vue d'ensemble", sub: 'Tableau de bord général' },
  '/opportunites': { label: 'Opportunités', sub: 'Gestion des achats groupés' },
  '/sondages': { label: 'Sondages', sub: 'Enquêtes rémunérées' },
  '/utilisateurs': { label: 'Utilisateurs', sub: 'Gestion des comptes' },
  '/portefeuilles': { label: 'Portefeuilles', sub: 'Transactions & retraits' },
  '/fournisseurs': { label: 'Fournisseurs', sub: 'Approvisionnement des opportunités' },
  '/commanditaires': { label: 'Commanditaires', sub: 'Sponsors des sondages' },
  '/bannieres': { label: 'Bannières', sub: 'Publicités affichées dans l\'app' },
  '/kyc': { label: 'KYC', sub: "Vérification d'identité" },
  '/parametres': { label: 'Paramètres', sub: 'Configuration du compte' },
}

function getPageMeta(pathname) {
  if (pathname === '/opportunites/nouvelle') {
    return { label: 'Nouvelle opportunité', sub: 'Création guidée de la campagne' }
  }
  if (pathname === '/opportunites/traitement') {
    return { label: 'Opportunités à traiter', sub: 'Préparation, livraison et clôture des dossiers' }
  }
  if (pathname.startsWith('/opportunites/')) {
    return pathname.endsWith('/modifier')
      ? { label: 'Modifier une opportunité', sub: 'Configuration de la campagne' }
      : { label: "Détail de l’opportunité", sub: 'Pilotage de la campagne' }
  }
  if (pathname === '/sondages/nouveau') {
    return { label: 'Nouveau sondage', sub: 'Création complète de l’enquête' }
  }
  if (pathname === '/fournisseurs/nouveau') {
    return { label: 'Nouveau fournisseur', sub: 'Référencement d’un fournisseur produit' }
  }
  if (pathname === '/commanditaires/nouveau') {
    return { label: 'Nouveau commanditaire', sub: 'Référencement d’un sponsor de sondage' }
  }
  if (pathname === '/portefeuilles/alimenter') {
    return { label: 'Alimenter la trésorerie', sub: 'Crédit du wallet plateforme' }
  }
  if (pathname.startsWith('/utilisateurs/')) {
    return { label: 'Détail utilisateur', sub: 'Compte, identité et vérification' }
  }
  if (pathname.startsWith('/sondages/')) {
    if (pathname.endsWith('/modifier')) return { label: 'Modifier le sondage', sub: 'Paramètres de l’enquête' }
    if (pathname.endsWith('/eligibilite')) return { label: 'Test d’éligibilité', sub: 'Présélection des participants' }
    if (pathname.endsWith('/reponses')) return { label: 'Réponses à valider', sub: 'Contrôle des participations' }
    if (pathname.endsWith('/resultats')) return { label: 'Résultats du sondage', sub: 'Analyse et répondants' }
  }
  if (pathname === '/bannieres/nouvelle') {
    return { label: 'Nouvelle bannière', sub: 'Création du contenu publicitaire' }
  }
  if (pathname.startsWith('/bannieres/') && pathname.endsWith('/modifier')) {
    return { label: 'Modifier une bannière', sub: 'Configuration du contenu publicitaire' }
  }
  return PAGE_META[pathname] || { label: 'Administration', sub: 'OpportuniHub' }
}

export default function AdminShell() {
  const { admin, logout } = useAuth()
  const { notifications, unreadCount, dismissNotification, clearAll, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  const meta = getPageMeta(location.pathname)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const toggleNotifs = () => {
    if (!notifOpen) markAllRead()
    setNotifOpen(v => !v)
  }

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="min-h-screen lg:flex">
        <NavBar />

        <main className="min-w-0 flex-1 overflow-y-auto lg:ml-56 lg:h-screen">
          {/* Top bar */}
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 backdrop-blur-xl sm:px-5 lg:px-6">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
              <div>
                <p className="hidden text-[9px] font-extrabold uppercase tracking-[0.2em] text-violet-600 sm:block">{meta.sub}</p>
                <h1 className="text-base font-extrabold leading-tight tracking-tight text-slate-950">{meta.label}</h1>
              </div>
              <div className="flex items-center gap-3">
                {/* Bouton notifications + panneau */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={toggleNotifs}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-white hover:text-violet-700 hover:shadow-sm"
                    aria-label="Afficher les notifications"
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <p className="font-bold text-sm text-slate-900">Notifications</p>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAll}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={12} /> Tout effacer
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-center text-sm text-slate-400 font-medium py-8 px-4">Aucune notification pour l'instant.</p>
                        ) : (
                          notifications.map(n => {
                            const content = (
                              <>
                                {NOTIF_ICONS[n.style]}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 leading-snug">{n.msg}</p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-1">{heureRelative(n.ts)}</p>
                                </div>
                              </>
                            )
                            return (
                              <div key={n.id} className="flex items-start gap-2.5 px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors">
                                {n.href ? (
                                  <Link to={n.href} onClick={() => setNotifOpen(false)} className="flex-1 flex items-start gap-2.5 min-w-0">
                                    {content}
                                  </Link>
                                ) : (
                                  <div className="flex-1 flex items-start gap-2.5 min-w-0">{content}</div>
                                )}
                                <button
                                  onClick={() => dismissNotification(n.id)}
                                  className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {admin && (
                  <span className="hidden items-center gap-2 rounded-xl bg-slate-50 py-1.5 pl-1.5 pr-3 text-sm text-slate-600 sm:flex">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                      {admin.nom ? admin.nom[0].toUpperCase() : 'A'}
                    </span>
                    <span className="font-medium">{admin.nom || admin.email}</span>
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1440px] animate-fade-up space-y-4 px-3.5 py-4 sm:px-5 lg:px-6">
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationToast />
    </div>
  )
}
