import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AdminShell from './Pages/AdminShell'
import Dashboard from './Pages/Dashboard'
import Opportunites from './Pages/Opportunites'
import Sondages from './Pages/Sondages'
import Utilisateurs from './Pages/Utilisateurs'
import Portefeuilles from './Pages/Portefeuilles'
import Commanditaires from './Pages/Commanditaires'
import Parametres from './Pages/Parametres'
import Kyc from './Pages/Kyc'
import Bannieres from './Pages/Bannieres'
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
          <Route path="sondages" element={<Sondages />} />
          <Route path="utilisateurs" element={<Utilisateurs />} />
          <Route path="portefeuilles" element={<Portefeuilles />} />
          <Route path="commanditaires" element={<Commanditaires />} />
          <Route path="bannieres" element={<Bannieres />} />
          <Route path="kyc" element={<Kyc />} />
          <Route path="parametres" element={<Parametres />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
