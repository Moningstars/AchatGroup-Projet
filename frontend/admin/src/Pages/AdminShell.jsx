import { Outlet, useLocation } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import NavBar from '../common/NavBar'
import { useAuth } from '../context/AuthContext'

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
  const navigate = useNavigate()
  const location = useLocation()

  const meta = PAGE_META[location.pathname] || { label: 'Administration', sub: '' }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

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
    </div>
  )
}
