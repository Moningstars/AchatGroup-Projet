import './App.css'
import Header from './common/Header/Header'
import Footer from './common/Footer/Footer'
import MobileTabBar from './common/MobileTabBar/MobileTabBar'
import NotificationToast from './components/NotificationToast'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, RequireAuth } from './context/AuthContext'
import { PusherProvider } from './context/PusherContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { useBeams } from './hooks/useBeams'
import Connexion from './Pages/Connexion'
import Dashboard from './Pages/Dashboard'
import Opportunites from './Pages/Opportunites'
import History from './Pages/History'
import DetailOpportunite from './Pages/DetailOpportunite'
import Portefeuille from './Pages/Portefeuille'
import Sondages from './Pages/Sondages'
import SondageDetail from './Pages/SondageDetail'
import Catalogue from './Pages/Catalogue'
import Verification from './Pages/Verification'

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
        <Footer />
      </div>
      <MobileTabBar />
      <NotificationToast />

      {/* Connexion/Inscription en overlay modal quand backgroundLocation est défini */}
      {backgroundLocation && (
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Connexion />} />
        </Routes>
      )}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <PusherProvider>
        <NotificationsProvider>
          <AppInner />
        </NotificationsProvider>
      </PusherProvider>
    </AuthProvider>
  )
}

export default App
