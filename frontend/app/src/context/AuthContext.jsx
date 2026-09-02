import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { setToken, removeToken, getToken, api, TOKEN_KEY } from '../services/api'

const AuthContext = createContext(null)
const USER_KEY = 'opportunihub-user'

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

function isExpired(token) {
  const payload = parseJwt(token)
  if (!payload) return true
  if (!payload.exp) return false
  return payload.exp * 1000 < Date.now()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  // Vérification expiration au chargement
  useEffect(() => {
    const token = getToken()
    if (!token) return

    if (isExpired(token)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      navigate('/connexion', { replace: true })
      return
    }

    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        if (!parsed.profilComplete) {
          navigate('/connexion', { replace: true })
        }
      } catch { localStorage.removeItem(USER_KEY) }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Intercepteur 401 — token rejeté par le serveur en cours de session
  useEffect(() => {
    const id = api.interceptors.response.use(
      res => res,
      err => {
        const url = err.config?.url || ''
        if (err.response?.status === 401 && !url.includes('/auth/')) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setUser(null)
          navigate('/connexion', { replace: true })
        }
        return Promise.reject(err)
      }
    )
    return () => api.interceptors.response.eject(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveSession = (authResponse) => {
    setToken(authResponse.token)
    const userData = {
      id: authResponse.id,
      nom: authResponse.nom,
      telephone: authResponse.telephone,
      profilComplete: authResponse.profilComplete,
      role: authResponse.role,
    }
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    removeToken()
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/connexion" state={{ from: location.pathname, backgroundLocation: location }} replace />
  }
  return children
}
