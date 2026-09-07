import './App.css'
import Header from './common/Header/Header'
import Footer from './common/Footer/Footer'
import MobileTabBar from './common/MobileTabBar/MobileTabBar'
import NotificationToast from './components/NotificationToast'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Component, lazy, Suspense, useEffect } from 'react'
import { AuthProvider, RequireAuth } from './context/AuthContext'
import { PusherProvider } from './context/PusherContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { useBeams } from './hooks/useBeams'
const Connexion = lazy(() => import('./Pages/Connexion'))
const Dashboard = lazy(() => import('./Pages/Dashboard'))
const Opportunites = lazy(() => import('./Pages/Opportunites'))
const History = lazy(() => import('./Pages/History'))
const DetailOpportunite = lazy(() => import('./Pages/DetailOpportunite'))
const Portefeuille = lazy(() => import('./Pages/Portefeuille'))
const Sondages = lazy(() => import('./Pages/Sondages'))
const SondageDetail = lazy(() => import('./Pages/SondageDetail'))
const Catalogue = lazy(() => import('./Pages/Catalogue'))
const Verification = lazy(() => import('./Pages/Verification'))

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Erreur d’affichage interceptée', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">!</div>
          <h1 className="text-xl font-black text-slate-950">Cette page n’a pas pu s’afficher</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Rechargez la page ou revenez au catalogue pour poursuivre vos tests.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="/" className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Voir le catalogue</a>
            <button type="button" onClick={() => window.location.reload()} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">Recharger</button>
          </div>
        </section>
      </main>
    )
  }
}

function ScrollToTop() {
  const { pathname, state } = useLocation()
  useEffect(() => {
    if (!state?.backgroundLocation) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [pathname, state?.backgroundLocation])
  return null
}

function AppInner() {
  const location = useLocation()
  const backgroundLocation = location.state?.backgroundLocation
  useBeams()

  return (
    <>
      <ScrollToTop />
      <Header />
      <div className="pb-20 md:pb-0">
        <Suspense fallback={<div className="flex min-h-[45vh] items-center justify-center text-sm font-bold text-gray-400">Chargement...</div>}>
          <Routes location={backgroundLocation || location}>
          <Route path="/" element={<Opportunites />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/portefeuille" element={<RequireAuth><Portefeuille /></RequireAuth>} />
          <Route path="/historique" element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/opportunity/:id" element={<DetailOpportunite />} />
          <Route path="/opportunites" element={<Catalogue />} />
          <Route path="/sondages" element={<Sondages />} />
          <Route path="/sondages/:id" element={<RequireAuth><SondageDetail /></RequireAuth>} />
          <Route path="/verification" element={<RequireAuth><Verification /></RequireAuth>} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Connexion />} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
      <MobileTabBar />
      <NotificationToast />

      {/* Connexion/Inscription en overlay modal quand backgroundLocation est défini */}
      {backgroundLocation && (
        <Suspense fallback={null}>
          <Routes>
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/inscription" element={<Connexion />} />
          </Routes>
        </Suspense>
      )}
    </>
  )
}

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <PusherProvider>
          <NotificationsProvider>
            <AppInner />
          </NotificationsProvider>
        </PusherProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App
