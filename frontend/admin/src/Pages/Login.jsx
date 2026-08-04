import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { adminConnexion } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await adminConnexion(identifiant, motDePasse)
      login(data)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #3b0764 100%)',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Glow */}
        <div
          className="pointer-events-none absolute -inset-1 rounded-2xl opacity-20 blur-2xl"
          style={{ background: 'radial-gradient(ellipse at center, #7c3aed, transparent 70%)' }}
        />

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
          {/* Violet accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-700" />

          <div className="px-8 pt-8 pb-8">
            {/* Logo mark */}
            <div className="mb-7 flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-900/30">
                <ShieldCheck size={22} className="text-white" />
              </div>
              <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">OpportuniHub</h1>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.15em] text-violet-600">Administration</p>
              <p className="mt-2 text-[13px] text-slate-400">Connectez-vous à votre espace administrateur</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Email
                </label>
                <input
                  type="text"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  placeholder="admin@plateforme.tg"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-900/20 transition hover:from-violet-700 hover:to-indigo-800 hover:shadow-violet-900/30 disabled:opacity-60"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Se connecter
              </button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-white/25">
          Accès réservé aux administrateurs autorisés
        </p>
      </div>
    </div>
  )
}
