import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AdminShell from './Pages/AdminShell'
import Dashboard from './Pages/Dashboard'
import Opportunites, { OpportuniteDetailPage, ModifierOpportunitePage, NouvelleOpportunitePage } from './Pages/Opportunites'
import Sondages, { EligibiliteSondagePage, ModifierSondagePage, NouveauSondagePage, ReponsesSondagePage, ResultatsSondagePage } from './Pages/Sondages'
import Utilisateurs, { UtilisateurDetailPage } from './Pages/Utilisateurs'
import Portefeuilles, { AlimenterPortefeuillePage } from './Pages/Portefeuilles'
import Commanditaires, { NouveauCommanditairePage } from './Pages/Commanditaires'
import Fournisseurs, { NouveauFournisseurPage } from './Pages/Fournisseurs'
import Parametres from './Pages/Parametres'
import Kyc from './Pages/Kyc'
import Bannieres, { BanniereEditorPage } from './Pages/Bannieres'
import Login from './Pages/Login'
import { useBeams } from './hooks/useBeams'
import './App.css'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  useBeams()

  return (
    <BrowserRouter>
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
          <Route path="opportunites/nouvelle" element={<NouvelleOpportunitePage />} />
          <Route path="opportunites/:id" element={<OpportuniteDetailPage />} />
          <Route path="opportunites/:id/modifier" element={<ModifierOpportunitePage />} />
          <Route path="sondages" element={<Sondages />} />
          <Route path="sondages/nouveau" element={<NouveauSondagePage />} />
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
          <Route path="fournisseurs" element={<Fournisseurs />} />
          <Route path="fournisseurs/nouveau" element={<NouveauFournisseurPage />} />
          <Route path="bannieres" element={<Bannieres />} />
          <Route path="bannieres/nouvelle" element={<BanniereEditorPage />} />
          <Route path="bannieres/:id/modifier" element={<BanniereEditorPage />} />
          <Route path="kyc" element={<Kyc />} />
          <Route path="parametres" element={<Parametres />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
