import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { User, Wallet, ShieldCheck, ShieldX, ShieldAlert, Clock, LogOut, ChevronDown, Bell, CheckCircle2, XCircle, Trash2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePusher } from '../../context/PusherContext'
import { useNotifications } from '../../context/NotificationsContext'
import { getSolde, getKycStatus } from '../../services/api'

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

const KYC_CONFIG = {
  AUCUN:      { label: 'Non vérifié',       Icon: ShieldAlert, cls: 'text-orange-500 bg-orange-50' },
  EN_ATTENTE: { label: 'En cours d\'examen', Icon: Clock,       cls: 'text-blue-500 bg-blue-50' },
  VERIFIE:    { label: 'Identité vérifiée', Icon: ShieldCheck,  cls: 'text-emerald-600 bg-emerald-50' },
  REJETE:     { label: 'Rejeté',            Icon: ShieldX,      cls: 'text-red-500 bg-red-50' },
}

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const { on, off } = usePusher()
  const { notifications, unreadCount, dismissNotification, clearAll, markAllRead } = useNotifications()
  const [solde, setSolde] = useState(0)
  const [kyc, setKyc] = useState(null)
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef(null)
  const notifRef = useRef(null)
  const pathname = location.pathname

  const toggleNotifs = () => {
    if (!notifOpen) markAllRead()
    setNotifOpen(v => !v)
  }

  const scrollTo = (id) => {
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/', { state: { scrollTo: id } })
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    getSolde()
      .then(raw => setSolde(Number(raw?.soldeDisponible ?? raw?.solde ?? raw ?? 0)))
      .catch(() => {})
    getKycStatus()
      .then(setKyc)
      .catch(() => setKyc({ niveauVerification: 'AUCUN' }))
  }, [isAuthenticated, pathname])

  // Solde mis à jour en temps réel dès qu'un événement wallet arrive (souscription, recharge, retrait, remboursement...)
  useEffect(() => {
    if (!isAuthenticated) return
    const majSolde = (data) => {
      if (data?.nouveauSolde !== undefined) setSolde(Number(data.nouveauSolde))
    }
    on('wallet.credited', majSolde)
    on('wallet.debited', majSolde)
    return () => { off('wallet.credited', majSolde); off('wallet.debited', majSolde) }
  }, [isAuthenticated])

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  const kycNiveau = kyc?.niveauVerification ?? 'AUCUN'
  const kycCfg = KYC_CONFIG[kycNiveau] ?? KYC_CONFIG.AUCUN
  const KycIcon = kycCfg.Icon

  const initiales = user?.nom
    ? user.nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between glass-header">

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 group shrink-0">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
          <i className="ti ti-building-community text-xl" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-primary font-heading font-extrabold text-lg leading-none">OpportuniHub</h1>
          <span className="text-[10px] text-success font-bold uppercase tracking-widest hidden sm:block">Community Power</span>
        </div>
      </Link>

      {/* Nav + actions */}
      <div className="flex items-center gap-2">
        <nav className="hidden md:flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link to="/opportunites" className={`text-sm font-bold transition-colors ${pathname === '/opportunites' ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>Opportunités</Link>
              <Link to="/sondages"    className={`text-sm font-bold transition-colors ${pathname === '/sondages'    ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>Sondages</Link>
              <Link to="/historique"  className={`text-sm font-bold transition-colors ${pathname === '/historique'  ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>Participations</Link>
            </>
          ) : (
            <>
              <button onClick={() => scrollTo('qui-sommes-nous')} className="text-sm font-bold text-gray-400 hover:text-primary transition-colors">Qui sommes-nous ?</button>
              <button onClick={() => scrollTo('contact')}         className="text-sm font-bold text-gray-400 hover:text-primary transition-colors">Contact</button>
            </>
          )}
        </nav>

        {isAuthenticated ? (
          <>
            {/* Solde — masqué sur mobile pour ne pas couvrir le nom de l'app */}
            <Link to="/portefeuille" className="hidden sm:flex bg-primary text-white pl-2 pr-3 py-1.5 rounded-full text-xs font-bold items-center gap-1.5 shadow-md shadow-primary/10 hover:bg-primary/90 transition-colors active:scale-95">
              <i className="ti ti-wallet text-sm text-accent" />
              <span className="font-heading">{solde.toLocaleString('fr-FR')} <span className="text-[10px] opacity-70">FCFA</span></span>
            </Link>

            {/* Bouton notifications + panneau */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotifs}
                className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary/20 bg-primary/10 hover:border-primary hover:bg-primary/20 transition-all"
              >
                <Bell size={18} className="text-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-urgency text-white text-[9px] font-black flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 max-w-[85vw] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-primary/5">
                    <p className="font-bold text-sm text-primary">Notifications</p>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-urgency transition-colors"
                      >
                        <Trash2 size={12} /> Tout effacer
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 font-medium py-8 px-4">Aucune notification pour l'instant.</p>
                    ) : (
                      notifications.map(n => {
                        const content = (
                          <>
                            {NOTIF_ICONS[n.style]}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 leading-snug">{n.msg}</p>
                              <p className="text-[10px] text-gray-400 font-bold mt-1">{heureRelative(n.ts)}</p>
                            </div>
                          </>
                        )
                        return (
                          <div key={n.id} className="flex items-start gap-2.5 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                            {n.href ? (
                              <Link to={n.href} onClick={() => setNotifOpen(false)} className="flex-1 flex items-start gap-2.5 min-w-0">
                                {content}
                              </Link>
                            ) : (
                              <div className="flex-1 flex items-start gap-2.5 min-w-0">{content}</div>
                            )}
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
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

            {/* Bouton profil + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 w-10 h-10 rounded-full border-2 border-primary/20 bg-primary/10 justify-center ring-2 ring-white hover:border-primary hover:bg-primary/20 transition-all"
              >
                <User size={20} className="text-primary" />
              </button>

              {open && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">

                  {/* Identité */}
                  <div className="px-4 py-3 bg-primary/5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-heading font-black text-sm shrink-0">
                        {initiales ?? <User size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{user?.nom || 'Utilisateur'}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.telephone}</p>
                      </div>
                    </div>

                    {/* Badge KYC */}
                    <div className={`mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold w-fit ${kycCfg.cls}`}>
                      <KycIcon size={13} />
                      {kycCfg.label}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="py-1">
                    <Link
                      to="/portefeuille"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Wallet size={16} className="text-gray-400" />
                      Mon portefeuille
                    </Link>
                    <Link
                      to="/verification"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ShieldCheck size={16} className="text-gray-400" />
                      Vérification d'identité
                    </Link>
                  </div>

                  {/* Déconnexion */}
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Se déconnecter
                    </button>
                  </div>

                </div>
              )}
            </div>
          </>
        ) : (
          <Link to="/connexion" state={{ backgroundLocation: location }} className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95">
            Connexion
          </Link>
        )}
      </div>
    </header>
  )
}

export default Header
