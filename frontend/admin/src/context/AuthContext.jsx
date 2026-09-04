import { createContext, useContext, useEffect, useState } from 'react'
import { TOKEN_KEY, adminLogout as apiLogout, api } from '../services/api'

const USER_KEY = 'opportunihub-admin-user'
const AuthContext = createContext(null)

function parseJwt(token) {
  try {
    const encoded = token.split('.')[1]
    if (!encoded) return null
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
  } catch { return null }
}

function isExpired(token) {
  const payload = parseJwt(token)
  if (!payload) return true
  if (!payload.exp) return false
  return payload.exp * 1000 < Date.now()
}

function loadValidSession() {
  const t = localStorage.getItem(TOKEN_KEY)
  if (!t) return { token: null, admin: null }
  const payload = parseJwt(t)
  if (isExpired(t) || payload?.role !== 'ADMIN') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return { token: null, admin: null }
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_KEY))
    if (!parsed?.id || parsed.role !== 'ADMIN' || parsed.id !== payload?.sub) throw new Error('Session incohérente')
    return { token: t, admin: parsed }
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return { token: null, admin: null }
  }
}

const initial = loadValidSession()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(initial.token)
  const [admin, setAdmin] = useState(initial.admin)

  // Intercepteur 401 — token rejeté en cours de session
  useEffect(() => {
    const id = api.interceptors.response.use(
      res => res,
      err => {
        const url = err.config?.url || ''
        if (err.response?.status === 401 && !url.includes('/auth/')) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setToken(null)
          setAdmin(null)
          window.location.replace('/login')
        }
        return Promise.reject(err)
      }
    )
    return () => api.interceptors.response.eject(id)
  }, [])

  const login = (authResponse) => {
    const { token: t, id, nom, email, role, niveauAcces } = authResponse
    const payload = parseJwt(t)
    if (!payload || payload.role !== 'ADMIN' || payload.sub !== String(id)) {
      throw new Error('Session administrateur invalide')
    }
    localStorage.setItem(TOKEN_KEY, t)
    const userData = { id, nom, email, role, niveauAcces }
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setToken(t)
    setAdmin(userData)
  }

  const logout = async () => {
    await apiLogout()
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setAdmin(null)
  }

  const isSuperAdmin = admin?.niveauAcces === 'SUPER_ADMIN'

  return (
    <AuthContext.Provider value={{ token, admin, isAuthenticated: !!token, isSuperAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
