import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component, lazy, Suspense } from 'react'
import { useAuth } from './context/AuthContext'
import { useBeams } from './hooks/useBeams'
import './App.css'

const page = (loader, exportName = 'default') => lazy(() => loader().then(module => ({ default: module[exportName] })))
const AdminShell = page(() => import('./Pages/AdminShell'))
const Dashboard = page(() => import('./Pages/Dashboard'))
const Opportunites = page(() => import('./Pages/Opportunites'))
const OpportuniteDetailPage = page(() => import('./Pages/Opportunites'), 'OpportuniteDetailPage')
const ModifierOpportunitePage = page(() => import('./Pages/Opportunites'), 'ModifierOpportunitePage')
const NouvelleOpportunitePage = page(() => import('./Pages/Opportunites'), 'NouvelleOpportunitePage')
const Sondages = page(() => import('./Pages/Sondages'))
const DetailSondagePage = page(() => import('./Pages/Sondages'), 'DetailSondagePage')
const EligibiliteSondagePage = page(() => import('./Pages/Sondages'), 'EligibiliteSondagePage')
const ModifierSondagePage = page(() => import('./Pages/Sondages'), 'ModifierSondagePage')
const NouveauSondagePage = page(() => import('./Pages/Sondages'), 'NouveauSondagePage')
const ReponsesSondagePage = page(() => import('./Pages/Sondages'), 'ReponsesSondagePage')
const ResultatsSondagePage = page(() => import('./Pages/Sondages'), 'ResultatsSondagePage')
const Utilisateurs = page(() => import('./Pages/Utilisateurs'))
const UtilisateurDetailPage = page(() => import('./Pages/Utilisateurs'), 'UtilisateurDetailPage')
const Portefeuilles = page(() => import('./Pages/Portefeuilles'))
const AlimenterPortefeuillePage = page(() => import('./Pages/Portefeuilles'), 'AlimenterPortefeuillePage')
const Commanditaires = page(() => import('./Pages/Commanditaires'))
const CommanditaireDetailPage = page(() => import('./Pages/Commanditaires'), 'CommanditaireDetailPage')
const NouveauCommanditairePage = page(() => import('./Pages/Commanditaires'), 'NouveauCommanditairePage')
const Fournisseurs = page(() => import('./Pages/Fournisseurs'))
const NouveauFournisseurPage = page(() => import('./Pages/Fournisseurs'), 'NouveauFournisseurPage')
const Parametres = page(() => import('./Pages/Parametres'))
const Kyc = page(() => import('./Pages/Kyc'))
const Bannieres = page(() => import('./Pages/Bannieres'))
const BanniereEditorPage = page(() => import('./Pages/Bannieres'), 'BanniereEditorPage')
const Login = page(() => import('./Pages/Login'))
const JournalActivite = page(() => import('./Pages/JournalActivite'))

function ChargementPage() {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-slate-500">Chargement...</div>
}

class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('Erreur affichage administrateur', error, info)
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center">
          <h1 className="text-xl font-black text-slate-950">Cette page ne peut pas afficher</h1>
          <p className="mt-2 text-sm text-slate-500">Rechargez administration. Si le problème persiste, consultez le journal activité.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white">Recharger</button>
        </section>
      </main>
    )
  }
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  useBeams()

  return (
    <AdminErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<ChargementPage />}>
          <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="opportunites" element={<Opportunites />} />
          <Route path="opportunites/traitement" element={<Opportunites mode="traitement" />} />
          <Route path="opportunites/tentatives" element={<Opportunites mode="tentatives" />} />
          <Route path="opportunites/nouvelle" element={<NouvelleOpportunitePage />} />
          <Route path="opportunites/:id" element={<OpportuniteDetailPage />} />
          <Route path="opportunites/:id/modifier" element={<ModifierOpportunitePage />} />
          <Route path="sondages" element={<Sondages />} />
          <Route path="sondages/nouveau" element={<NouveauSondagePage />} />
          <Route path="sondages/:id" element={<DetailSondagePage />} />
          <Route path="sondages/:id/modifier" element={<ModifierSondagePage />} />
          <Route path="sondages/:id/eligibilite" element={<EligibiliteSondagePage />} />
          <Route path="sondages/:id/reponses" element={<ReponsesSondagePage />} />
          <Route path="sondages/:id/resultats" element={<ResultatsSondagePage />} />
          <Route path="utilisateurs" element={<Utilisateurs />} />
          <Route path="utilisateurs/:id" element={<UtilisateurDetailPage />} />
          <Route path="portefeuilles" element={<Portefeuilles />} />
          <Route path="portefeuilles/alimenter" element={<AlimenterPortefeuillePage />} />
          <Route path="commanditaires" element={<Commanditaires />} />
          <Route path="commanditaires/nouveau" element={<NouveauCommanditairePage />} />
          <Route path="commanditaires/:id" element={<CommanditaireDetailPage />} />
          <Route path="fournisseurs" element={<Fournisseurs />} />
          <Route path="fournisseurs/nouveau" element={<NouveauFournisseurPage />} />
          <Route path="bannieres" element={<Bannieres />} />
          <Route path="bannieres/nouvelle" element={<BanniereEditorPage />} />
          <Route path="bannieres/:id/modifier" element={<BanniereEditorPage />} />
          <Route path="kyc" element={<Kyc />} />
          <Route path="parametres" element={<Parametres />} />
          <Route path="journal-activite" element={<JournalActivite />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AdminErrorBoundary>
  )
}

export default App
