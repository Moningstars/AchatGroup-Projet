import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck, BarChart3, Users, Sparkles } from 'lucide-react'
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
    <main className="grid min-h-screen bg-slate-100 lg:grid-cols-2">
      <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-violet-600 shadow-lg shadow-violet-200">
              <span className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full bg-emerald-400" />
              <ShieldCheck size={20} className="relative text-white" />
            </div>
            <div>
              <p className="text-base font-black leading-none text-slate-950">OpportuniHub</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-violet-600">Administration</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Bienvenue</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Pilotez votre activité avec clarté.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">Connectez-vous à l’espace sécurisé de gestion OpportuniHub.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  Adresse email
                </label>
                <input
                  type="text"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  placeholder="admin@plateforme.tg"
                  required
                  autoComplete="username"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Se connecter
              </button>
          </form>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
            <ShieldCheck size={13} /> Accès réservé aux administrateurs autorisés
          </p>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-violet-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[54px] border-white/10" />
        <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full border-[64px] border-emerald-300/20" />
        <div className="relative ml-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
          <Sparkles size={14} /> Données synchronisées en temps réel
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <p className="text-sm font-semibold text-violet-100">Une vue unifiée de votre plateforme</p>
          <h2 className="mt-3 text-5xl font-black leading-[1.05] tracking-tight">Décidez plus vite. Gérez plus simplement.</h2>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white p-5 text-slate-950 shadow-lift">
              <BarChart3 className="text-violet-600" size={22} />
              <p className="mt-8 text-2xl font-black">Pilotage</p>
              <p className="mt-1 text-sm text-slate-500">Indicateurs et opérations au même endroit.</p>
            </div>
            <div className="mt-10 rounded-3xl bg-emerald-300 p-5 text-slate-950 shadow-lift">
              <Users size={22} />
              <p className="mt-8 text-2xl font-black">Communauté</p>
              <p className="mt-1 text-sm text-slate-700">Suivez chaque participant sans perdre le fil.</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-violet-200">© {new Date().getFullYear()} OpportuniHub</p>
      </section>
    </main>
  )
}
