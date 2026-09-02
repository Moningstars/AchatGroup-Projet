import { useState } from 'react'
import { X, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  inscriptionInitier,
  inscriptionVerifier,
  completerProfil,
} from '../services/api'

const OPERATEURS = ['MTN', 'MOOV', 'TOGOCEL']

export default function Inscription() {
  const [step, setStep] = useState(1)
  const [identifiant, setIdentifiant] = useState('')
  const [code, setCode] = useState('')
  const [nom, setNom] = useState('')
  const [operateur, setOperateur] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devCode, setDevCode] = useState('')

  const navigate = useNavigate()
  const { saveSession } = useAuth()

  const handleInitier = async () => {
    if (!identifiant.trim()) { setError("Entrez un email ou un numéro de téléphone"); return }
    setError(''); setLoading(true)
    try {
      const res = await inscriptionInitier(identifiant.trim())
      setDevCode(res.codeDevMode || '')
      setStep(2)
    } catch (e) {
      setError(e.response?.data?.message || 'Cet identifiant est déjà utilisé')
    } finally { setLoading(false) }
  }

  const handleVerifier = async () => {
    if (code.length !== 6) { setError('Le code doit contenir 6 chiffres'); return }
    setError(''); setLoading(true)
    try {
      const auth = await inscriptionVerifier(identifiant.trim(), code)
      saveSession(auth)
      setStep(3)
    } catch (e) {
      setError(e.response?.data?.message || 'Code invalide ou expiré')
    } finally { setLoading(false) }
  }

  const handleCompleterProfil = async () => {
    if (!nom.trim()) { setError('Entrez votre nom'); return }
    if (!operateur) { setError('Choisissez votre opérateur mobile'); return }
    setError(''); setLoading(true)
    try {
      const auth = await completerProfil(nom.trim(), operateur)
      saveSession(auth)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la complétion du profil')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xl px-6 py-6">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white/95 shadow-2xl">
        <button
          onClick={() => navigate(-1)}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
        >
          <X size={16} />
        </button>

        <div className="p-8">
          <div className="mb-2 flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
            ))}
          </div>

          <div className="mb-6 mt-4">
            <h2 className="text-2xl font-bold text-slate-950">
              {step === 1 && 'Créer un compte'}
              {step === 2 && 'Vérifier le code'}
              {step === 3 && 'Compléter le profil'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {step === 1 && 'Entrez votre email ou numéro de téléphone'}
              {step === 2 && `Code envoyé à ${identifiant}`}
              {step === 3 && 'Dernière étape avant de commencer'}
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <input
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInitier()}
                placeholder="email@exemple.com ou +228 XX XX XX"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {devCode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">
                  Code dev : <span className="font-bold tracking-widest">{devCode}</span>
                </div>
              )}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifier()}
                placeholder="000000"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { setStep(1); setCode(''); setError('') }}
                className="text-sm text-slate-500 underline underline-offset-2"
              >
                Changer d'identifiant
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Votre nom complet"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                {OPERATEURS.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperateur(op)}
                    className={`rounded-2xl border py-3 text-sm font-semibold transition ${
                      operateur === op
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={step === 1 ? handleInitier : step === 2 ? handleVerifier : handleCompleterProfil}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                {step === 1 && 'Envoyer le code'}
                {step === 2 && 'Vérifier'}
                {step === 3 && 'Terminer'}
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {step === 1 && (
            <button
              type="button"
              onClick={() => navigate('/connexion', { state: { backgroundLocation: { pathname: '/' } } })}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              J'ai déjà un compte
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
