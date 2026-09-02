import { useState, useEffect } from 'react'
import { Loader2, X, CheckCircle2, AlertCircle, Smartphone, FlaskConical } from 'lucide-react'
import { initierRechargePaygate, getPaygateMode } from '../services/api'

const NETWORKS = [
  { value: 'FLOOZ', label: 'Moov Money (FLOOZ)', icon: '🟠', color: 'orange' },
  { value: 'TMONEY', label: 'T-Money (Togocel)', icon: '🔵', color: 'blue' },
]

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 25000]

export default function RechargeModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState('form') // 'form' | 'pending' | 'success' | 'error'
  const [network, setNetwork] = useState('FLOOZ')
  const [telephone, setTelephone] = useState('')
  const [montant, setMontant] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [txRef, setTxRef] = useState('')
  const [isDevMode, setIsDevMode] = useState(false)

  useEffect(() => {
    if (open) getPaygateMode().then(r => setIsDevMode(r.devMode)).catch(() => {})
  }, [open])

  if (!open) return null

  const reset = () => {
    setStep('form')
    setMontant('')
    setTelephone('')
    setError('')
    setTxRef('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    const amt = Number(montant)
    if (!montant || amt < 500) { setError('Montant minimum : 500 FCFA'); return }
    if (!telephone.trim()) { setError('Entrez votre numéro de téléphone'); return }

    setError('')
    setLoading(true)
    try {
      const res = await initierRechargePaygate(amt, network, telephone.trim())
      if (res.paygateStatus === 0) {
        setTxRef(res.txReference || res.identifier)
        // En mode dev le solde est crédité immédiatement, on passe direct à success
        if (res.message?.includes('[MODE TEST]')) {
          setStep('success')
          if (onSuccess) onSuccess()
        } else {
          setStep('pending')
        }
      } else {
        setError(res.message || 'Échec du paiement')
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSuccess = () => {
    setStep('success')
    if (onSuccess) onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative bg-primary px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-heading font-extrabold text-white text-lg leading-tight">
                Recharger le portefeuille
              </h4>
              <p className="text-white/60 text-xs font-medium mt-0.5">Paiement mobile sécurisé</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          {/* ── FORM ── */}
          {step === 'form' && (
            <div className="space-y-5">
              {/* Bandeau mode test */}
              {isDevMode && (
                <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <FlaskConical size={15} className="text-amber-500 shrink-0" />
                  <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">
                    MODE TEST — aucun argent réel débité
                  </p>
                </div>
              )}
              {/* Réseau */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Réseau mobile</label>
                <div className="grid grid-cols-2 gap-2">
                  {NETWORKS.map(n => (
                    <button
                      key={n.value}
                      onClick={() => setNetwork(n.value)}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all text-left ${
                        network === n.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-xl">{n.icon}</span>
                      <div>
                        <p className={`text-[11px] font-black leading-tight ${network === n.value ? 'text-primary' : 'text-gray-600'}`}>
                          {n.value}
                        </p>
                        <p className="text-[9px] text-gray-400 font-medium">{n.label.split('(')[0].trim()}</p>
                      </div>
                      {network === n.value && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numéro */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Numéro de téléphone</label>
                <div className="flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl overflow-hidden focus-within:border-primary transition-all">
                  <div className="px-4 py-3.5 border-r-2 border-gray-100 text-gray-500 text-sm font-bold shrink-0">+228</div>
                  <div className="flex items-center gap-2 flex-1 px-4">
                    <Smartphone size={15} className="text-gray-300 shrink-0" />
                    <input
                      type="tel"
                      placeholder="90 00 00 00"
                      value={telephone}
                      onChange={e => setTelephone(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 bg-transparent py-3.5 text-sm font-bold text-primary placeholder:text-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Montant */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Montant (FCFA)</label>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {QUICK_AMOUNTS.map(a => (
                    <button
                      key={a}
                      onClick={() => setMontant(String(a))}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                        montant === String(a)
                          ? 'bg-accent/10 text-accent border-accent/30'
                          : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {a.toLocaleString('fr-FR')}
                    </button>
                  ))}
                </div>
                <div className="flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl overflow-hidden focus-within:border-primary transition-all">
                  <input
                    type="number"
                    placeholder="5 000"
                    value={montant}
                    min="500"
                    onChange={e => setMontant(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3.5 text-sm font-bold text-primary placeholder:text-gray-300 focus:outline-none"
                  />
                  <span className="px-4 text-xs font-black text-gray-400 shrink-0">FCFA</span>
                </div>
                <p className="text-[10px] text-gray-400 font-medium ml-1">Minimum : 500 FCFA</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-600 font-bold">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <>Payer {montant ? `${Number(montant).toLocaleString('fr-FR')} FCFA` : ''} →</>
                }
              </button>
            </div>
          )}

          {/* ── PENDING ── */}
          {step === 'pending' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Smartphone size={32} className="text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="font-heading font-extrabold text-xl text-primary">Confirmez sur votre téléphone</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Un message de confirmation a été envoyé au <span className="font-black text-primary">+228 {telephone}</span>.
                  Entrez votre code PIN {network} pour valider.
                </p>
              </div>
              {txRef && (
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Référence transaction</p>
                  <p className="text-xs font-black text-primary mt-1 font-mono">{txRef}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleConfirmSuccess}
                  className="w-full bg-success text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <CheckCircle2 size={18} />
                  J'ai confirmé le paiement
                </button>
                <button
                  onClick={handleClose}
                  className="w-full text-gray-400 font-black text-xs uppercase tracking-widest py-2 hover:text-primary transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === 'success' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} className="text-success" />
              </div>
              <div className="space-y-2">
                <h3 className="font-heading font-extrabold text-xl text-primary">
                  {isDevMode ? 'Solde crédité !' : 'Recharge en cours'}
                </h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {isDevMode
                    ? 'Mode test : votre solde a été crédité instantanément sans débit réel.'
                    : 'Votre paiement a été initié. Votre solde sera crédité automatiquement dès confirmation par le réseau.'
                  }
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-primary text-white font-black py-3.5 rounded-2xl active:scale-[0.98] transition-all"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
