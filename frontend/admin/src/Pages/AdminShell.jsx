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
  '/commanditaires': { label: 'Commanditaires', sub: 'Entreprises partenaires' },
  '/bannieres': { label: 'Bannières', sub: 'Publicités affichées dans l\'app' },
  '/kyc': { label: 'KYC', sub: "Vérification d'identité" },
  '/parametres': { label: 'Paramètres', sub: 'Configuration du compte' },
}

export default function AdminShell() {
  const { admin, logout } = useAuth()
  const { notifications, unreadCount, dismissNotification, clearAll, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  const meta = PAGE_META[location.pathname] || { label: 'Administration', sub: '' }

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

        <main className="flex-1 overflow-y-auto lg:h-screen lg:ml-72 xl:ml-80">
          {/* Top bar */}
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{meta.sub}</p>
                <h1 className="text-lg font-bold leading-none text-slate-950">{meta.label}</h1>
              </div>
              <div className="flex items-center gap-3">
                {/* Bouton notifications + panneau */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={toggleNotifs}
                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-10 w-80 max-w-[85vw] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
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
                  <span className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                      {admin.nom ? admin.nom[0].toUpperCase() : 'A'}
                    </span>
                    <span className="font-medium">{admin.nom || admin.email}</span>
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationToast />
    </div>
  )
}
