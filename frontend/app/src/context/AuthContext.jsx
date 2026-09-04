import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { setToken, removeToken, getToken, api, TOKEN_KEY } from '../services/api'

const AuthContext = createContext(null)
const USER_KEY = 'opportunihub-user'

function parseJwt(token) {
  try {
    const encoded = token.split('.')[1]
    if (!encoded) return null
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(decodeURIComponent(atob(padded).split('').map((c) =>
      `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`
    ).join('')))
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

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function loadValidSession() {
  const token = getToken()
  if (!token) return null
  const payload = parseJwt(token)
  if (isExpired(token) || payload?.role !== 'PARTICIPANT') {
    clearSession()
    return null
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_KEY))
    if (!parsed?.id || parsed.role !== 'PARTICIPANT' || parsed.id !== payload.sub) {
      clearSession()
      return null
    }
    return parsed
  } catch {
    clearSession()
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadValidSession)
  const navigate = useNavigate()

  // Le contrôle est synchrone au chargement pour éviter une redirection fugace.
  useEffect(() => {
    if (user && !user.profilComplete) navigate('/connexion', { replace: true })
  }, [navigate, user])

  // Intercepteur 401 — token rejeté par le serveur en cours de session
  useEffect(() => {
    const id = api.interceptors.response.use(
      res => res,
      err => {
        const url = err.config?.url || ''
        if (err.response?.status === 401 && !url.includes('/auth/')) {
          clearSession()
          setUser(null)
          navigate('/connexion', { replace: true })
        }
        return Promise.reject(err)
      }
    )
    return () => api.interceptors.response.eject(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveSession = (authResponse) => {
    const payload = parseJwt(authResponse?.token)
    if (!payload || payload.role !== 'PARTICIPANT' || payload.sub !== String(authResponse.id)) {
      throw new Error('Session participant invalide')
    }
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

  const logout = async () => {
    try {
      await removeToken()
    } finally {
      clearSession()
      setUser(null)
    }
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
