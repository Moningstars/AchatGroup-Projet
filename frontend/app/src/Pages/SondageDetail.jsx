import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Users,
  Loader2, AlertCircle, ShieldCheck, ClipboardList, ShieldX,
} from 'lucide-react'
import {
  getSondage, getEligibiliteQuestions, getMonEligibilite,
  passerEligibilite, repondreASondage, getKycStatus, getMesParticipationsSondages,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSSE } from '../hooks/useSSE'

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function formatMontant(n) { return Number(n || 0).toLocaleString('fr-FR') }

// ─── Composant question ───────────────────────────────────────────────────────

function QuestionField({ q, value, onChange }) {
  if (q.typeQuestion === 'TEXTE_LIBRE') {
    return (
      <div>
        <p className="text-sm font-semibold text-primary mb-2">
          {q.texte}{q.obligatoire && <span className="text-urgency"> *</span>}
        </p>
        <textarea
          rows={3}
          value={value?.text || ''}
          onChange={e => onChange({ text: e.target.value })}
          placeholder="Votre réponse…"
          className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-sm text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition"
        />
      </div>
    )
  }

  if (q.typeQuestion === 'OUI_NON') {
    return (
      <div>
        <p className="text-sm font-semibold text-primary mb-3">
          {q.texte}{q.obligatoire && <span className="text-urgency"> *</span>}
        </p>
        <div className="flex gap-3">
          {['OUI', 'NON'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange({ text: opt })}
              className={`flex-1 py-3 rounded-2xl text-sm font-black border-2 transition-all active:scale-[0.98] ${
                value?.text === opt
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-primary/30'
              }`}>
              {opt === 'OUI' ? 'Oui' : 'Non'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (q.typeQuestion === 'CHOIX_UNIQUE') {
    return (
      <div>
        <p className="text-sm font-semibold text-primary mb-3">
          {q.texte}{q.obligatoire && <span className="text-urgency"> *</span>}
        </p>
        <div className="space-y-2">
          {(q.options || []).sort((a, b) => a.ordre - b.ordre).map(opt => (
            <label key={opt.id} onClick={() => onChange({ optionId: opt.id })} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-all ${
              value?.optionId === opt.id
                ? 'border-primary bg-primary/5'
                : 'border-gray-100 bg-white hover:border-primary/30'
            }`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                value?.optionId === opt.id ? 'border-primary bg-primary' : 'border-gray-300'
              }`}>
                {value?.optionId === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-primary font-medium">{opt.libelle}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (q.typeQuestion === 'CHOIX_MULTIPLE') {
    const selected = value?.optionIds || new Set()
    const toggle = (optId) => {
      const next = new Set(selected)
      if (next.has(optId)) next.delete(optId)
      else next.add(optId)
      onChange({ optionIds: next })
    }
    return (
      <div>
        <p className="text-sm font-semibold text-primary mb-3">
          {q.texte}{' '}
          <span className="text-xs font-normal text-gray-400">(Plusieurs réponses)</span>
          {q.obligatoire && <span className="text-urgency"> *</span>}
        </p>
        <div className="space-y-2">
          {(q.options || []).sort((a, b) => a.ordre - b.ordre).map(opt => (
            <label key={opt.id} onClick={() => toggle(opt.id)} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-all ${
              selected.has(opt.id)
                ? 'border-primary bg-primary/5'
                : 'border-gray-100 bg-white hover:border-primary/30'
            }`}>
              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 ${
                selected.has(opt.id) ? 'border-primary bg-primary' : 'border-gray-300'
              }`}>
                {selected.has(opt.id) && <CheckCircle2 size={10} className="text-white" />}
              </div>
              <span className="text-sm text-primary font-medium">{opt.libelle}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  return null
}

// ─── Carte info sondage ───────────────────────────────────────────────────────

function SondageCard({ sondage }) {
  const pct = sondage.quotaVise
    ? Math.min(100, Math.round((sondage.repondantsActuels / sondage.quotaVise) * 100))
    : 0

  return (
    <div className="bg-primary rounded-3xl p-6 text-white shadow-2xl shadow-primary/25 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 bg-success/20 text-success px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-success/30 mb-4">
          <i className="ti ti-forms text-[10px]" /> Sondage rémunéré
        </div>
        <h1 className="text-xl font-heading font-extrabold mb-2 leading-tight">{sondage.titre}</h1>
        {sondage.description && (
          <p className="text-sm text-white/55 mb-5 leading-relaxed">{sondage.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl bg-white/10 p-3.5 border border-white/10">
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">Récompense</p>
            <p className="text-xl font-heading font-black text-accent">{formatMontant(sondage.recompense)}<span className="text-xs font-bold text-white/50 ml-1">FCFA{sondage.typeRecompense === 'POINTS' ? ' convertis en points' : ''}</span></p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5 border border-white/10">
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={9} /> Participants</p>
            <p className="text-xl font-heading font-black">
              {sondage.repondantsActuels}
              {sondage.quotaVise && <span className="text-sm font-bold text-white/40"> / {sondage.quotaVise}</span>}
            </p>
          </div>
        </div>
        {sondage.quotaVise && (
          <div className="mb-3">
            <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-white/40 font-bold mt-1">{pct}% atteint</p>
          </div>
        )}
        {sondage.dateExpiration && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/40 font-bold">
            <Clock size={11} /> Expire le {formatDate(sondage.dateExpiration)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Étape éligibilité ────────────────────────────────────────────────────────

function EligibiliteStep({ sondageId, eligibilite, onPassed, onFailed }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const setAnswer = (qId, val) => setAnswers(p => ({ ...p, [qId]: val }))

  const validate = () => {
    for (const q of eligibilite.questions) {
      if (!q.obligatoire) continue
      const a = answers[q.id]
      if (!a) return false
      if (q.typeQuestion === 'TEXTE_LIBRE' && !a.text?.trim()) return false
      if (q.typeQuestion === 'OUI_NON' && !a.text) return false
      if (q.typeQuestion === 'CHOIX_UNIQUE' && !a.optionId) return false
      if (q.typeQuestion === 'CHOIX_MULTIPLE' && (!a.optionIds || a.optionIds.size === 0)) return false
    }
    return true
  }

  const buildPayload = () =>
    eligibilite.questions.map(q => {
      const a = answers[q.id]
      if (!a) return { questionId: q.id, optionId: null, valeurTexte: null }
      if (q.typeQuestion === 'CHOIX_UNIQUE') return { questionId: q.id, optionId: a.optionId, valeurTexte: null }
      if (q.typeQuestion === 'CHOIX_MULTIPLE') {
        const [first] = [...(a.optionIds || [])]
        return { questionId: q.id, optionId: first || null, valeurTexte: null }
      }
      return { questionId: q.id, optionId: null, valeurTexte: a.text || '' }
    })

  const handleSubmit = async () => {
    if (!validate()) { setError('Veuillez répondre à toutes les questions obligatoires.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await passerEligibilite(sondageId, buildPayload())
      const res = await getMonEligibilite(sondageId)
      if (res?.estEligible) onPassed()
      else onFailed(res?.tauxObtenu)
    } catch (e) {
      const msg = e.response?.data?.message || 'Erreur lors de la soumission.'
      setError(typeof msg === 'string' ? msg : 'Erreur lors de la soumission.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
          <ShieldCheck size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-black text-primary">{eligibilite.titre}</h2>
          <p className="text-[11px] text-gray-400 font-bold">{eligibilite.nombreQuestions} question{eligibilite.nombreQuestions > 1 ? 's' : ''} · Test de présélection</p>
        </div>
      </div>

      <div className="rounded-2xl bg-accent/8 border border-accent/20 p-4 text-sm text-primary/80 font-medium">
        Répondez correctement à ces questions pour accéder au sondage rémunéré.
      </div>

      <div className="space-y-6">
        {eligibilite.questions
          .slice().sort((a, b) => a.ordre - b.ordre)
          .map((q, idx) => (
            <div key={q.id}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Question {idx + 1}</p>
              <QuestionField q={q} value={answers[q.id]} onChange={val => setAnswer(q.id, val)} />
            </div>
          ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-urgency/5 border border-urgency/10 px-4 py-3">
          <AlertCircle size={15} className="text-urgency shrink-0 mt-0.5" />
          <p className="text-sm text-urgency font-bold">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-2xl bg-accent text-primary text-sm font-black uppercase tracking-widest hover:brightness-105 disabled:opacity-60 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
      >
        {submitting ? <><Loader2 size={16} className="animate-spin" /> Vérification…</> : 'Soumettre le test'}
      </button>
    </div>
  )
}

// ─── Étape sondage ────────────────────────────────────────────────────────────

function SondageStep({ sondage, onDone }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const setAnswer = (qId, val) => setAnswers(p => ({ ...p, [qId]: val }))

  const validate = () => {
    for (const q of sondage.questions) {
      if (!q.obligatoire) continue
      const a = answers[q.id]
      if (!a) return false
      if (q.typeQuestion === 'TEXTE_LIBRE' && !a.text?.trim()) return false
      if (q.typeQuestion === 'OUI_NON' && !a.text) return false
      if (q.typeQuestion === 'CHOIX_UNIQUE' && !a.optionId) return false
      if (q.typeQuestion === 'CHOIX_MULTIPLE' && (!a.optionIds || a.optionIds.size === 0)) return false
    }
    return true
  }

  const buildPayload = () => {
    const reponses = []
    for (const q of sondage.questions) {
      const a = answers[q.id]
      if (!a) continue
      if (q.typeQuestion === 'CHOIX_UNIQUE') {
        reponses.push({ questionId: q.id, optionReponseId: a.optionId, valeurTexte: null })
      } else if (q.typeQuestion === 'CHOIX_MULTIPLE') {
        for (const optId of a.optionIds) {
          reponses.push({ questionId: q.id, optionReponseId: optId, valeurTexte: null })
        }
      } else {
        reponses.push({ questionId: q.id, optionReponseId: null, valeurTexte: a.text || '' })
      }
    }
    return reponses
  }

  const handleSubmit = async () => {
    if (!validate()) { setError('Veuillez répondre à toutes les questions obligatoires.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await repondreASondage(sondage.id, buildPayload())
      onDone()
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data || 'Une erreur est survenue.'
      setError(typeof msg === 'string' ? msg : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0">
          <ClipboardList size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-black text-primary">Questions du sondage</h2>
          <p className="text-[11px] text-gray-400 font-bold">{sondage.questions?.length || 0} question{(sondage.questions?.length || 0) > 1 ? 's' : ''}</p>
        </div>
      </div>

      {(!sondage.questions || sondage.questions.length === 0) ? (
        <p className="text-sm text-gray-400 font-medium">Aucune question disponible.</p>
      ) : (
        <div className="space-y-6">
          {sondage.questions
            .slice().sort((a, b) => a.ordre - b.ordre)
            .map((q, idx) => (
              <div key={q.id}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Question {idx + 1}</p>
                <QuestionField q={q} value={answers[q.id]} onChange={val => setAnswer(q.id, val)} />
              </div>
            ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-urgency/5 border border-urgency/10 px-4 py-3">
          <AlertCircle size={15} className="text-urgency shrink-0 mt-0.5" />
          <p className="text-sm text-urgency font-bold">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
      >
        {submitting ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</> : 'Envoyer mes réponses'}
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SondageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [sondage, setSondage] = useState(null)
  const [eligibilite, setEligibilite] = useState(null)
  const [step, setStep] = useState('loading')
  const [tauxEchec, setTauxEchec] = useState(null)
  const [kycStatus, setKycStatus] = useState(null)
  const [participation, setParticipation] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [s, eq] = await Promise.all([getSondage(id), getEligibiliteQuestions(id)])
        if (cancelled) return
        setSondage(s)

        if (isAuthenticated) {
          const participations = await getMesParticipationsSondages().catch(() => [])
          if (cancelled) return
          const existante = participations.find(p => p.sondageId === id)
          if (existante) {
            setParticipation(existante)
            setStep('suivi')
            return
          }
        }

        if (s.statut !== 'ACTIF') { setStep('ferme'); return }

        if (s.niveauVerification === 'VERIFIE' && isAuthenticated) {
          const kyc = await getKycStatus()
          if (cancelled) return
          if (kyc?.niveauVerification !== 'VERIFIE') { setKycStatus(kyc); setStep('kyc_requis'); return }
        }

        if (!eq) { setStep('sondage'); return }
        setEligibilite(eq)
        if (!isAuthenticated) { setStep('sondage'); return }

        const monElig = await getMonEligibilite(id)
        if (cancelled) return
        if (monElig?.aPasse) {
          if (monElig.estEligible) setStep('sondage')
          else { setTauxEchec(monElig.tauxObtenu); setStep('non_eligible') }
        } else {
          setStep('eligibilite')
        }
      } catch {
        if (!cancelled) setStep('error')
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, isAuthenticated])

  // Chaque changement d'étape (fin d'éligibilité, envoi des réponses...) doit ramener
  // la page en haut — sinon on garde le scroll de la dernière question affichée.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [step])

  useSSE(id ? `sondage/${id}` : null, {
    STATUT: ({ statut }) => {
      setSondage(prev => prev ? { ...prev, statut } : prev)
      if (statut !== 'ACTIF' && !['done', 'suivi', 'non_eligible'].includes(step)) setStep('ferme')
    },
  })

  const handleEligibilitePassed = () => setStep('sondage')
  const handleEligibiliteFailed = (taux) => { setTauxEchec(taux); setStep('non_eligible') }

  // ── États spéciaux ─────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-bg-light flex justify-center items-center">
        <Loader2 size={36} className="animate-spin text-primary" />
      </div>
    )
  }

  if (step === 'error' || !sondage) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-2 border-gray-100">
          <AlertCircle size={36} className="text-gray-200" />
        </div>
        <p className="font-heading font-extrabold text-lg text-primary">Sondage introuvable</p>
        <button onClick={() => navigate('/sondages')}
          className="text-sm font-black text-primary uppercase tracking-widest border-2 border-primary/20 px-6 py-2.5 rounded-full hover:bg-primary hover:text-white transition-all">
          Retour aux sondages
        </button>
      </div>
    )
  }

  if (step === 'kyc_requis') {
    const niveau = kycStatus?.niveauVerification || 'AUCUN'
    const enAttente = niveau === 'EN_ATTENTE'
    const rejete = niveau === 'REJETE'

    return (
      <div className="min-h-screen bg-bg-light p-4 sm:p-6 flex flex-col items-center justify-center pb-28">
        <div className="w-full max-w-sm space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
              <ShieldX size={38} className="text-accent" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-heading font-extrabold text-primary mb-2">Vérification d'identité requise</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Ce sondage est réservé aux participants dont l'identité a été vérifiée (KYC).
            </p>
          </div>

          <div className={`rounded-2xl border-2 p-4 ${
            enAttente ? 'bg-blue-50 border-blue-200' :
            rejete    ? 'bg-urgency/5 border-urgency/20' :
                        'bg-accent/8 border-accent/20'
          }`}>
            <p className={`text-sm font-black mb-1 ${
              enAttente ? 'text-blue-700' : rejete ? 'text-urgency' : 'text-primary'
            }`}>
              {enAttente ? '⏳ Dossier en cours d\'examen' :
               rejete    ? '✗ Vérification rejetée' :
                           '⚠ Identité non vérifiée'}
            </p>
            <p className={`text-xs font-medium leading-relaxed ${
              enAttente ? 'text-blue-600' : rejete ? 'text-urgency/80' : 'text-primary/70'
            }`}>
              {enAttente
                ? 'Votre dossier est en cours d\'examen. Revenez dans 24–48h.'
                : rejete
                ? 'Votre dossier précédent a été rejeté. Soumettez à nouveau avec des informations correctes.'
                : 'Vous n\'avez pas encore soumis vos informations d\'identité.'}
            </p>
          </div>

          <div className="space-y-3">
            {!enAttente && (
              <button onClick={() => navigate('/verification')}
                className="w-full py-4 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
                <ShieldCheck size={16} />
                {rejete ? 'Resoumettre mon dossier' : 'Vérifier mon identité'}
              </button>
            )}
            <button onClick={() => navigate('/sondages')}
              className="w-full py-3.5 rounded-2xl border-2 border-gray-100 text-gray-500 text-sm font-black hover:border-primary hover:text-primary transition-all">
              Retour aux sondages
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center gap-5 p-8 pb-28">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-success" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-heading font-extrabold text-primary">Réponses envoyées !</h2>
          <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-xs">
            Merci pour votre participation. Votre récompense de{' '}
            <span className="font-black text-accent">{sondage.typeRecompense === 'POINTS' ? `l’équivalent en points de ${formatMontant(sondage.recompense)} FCFA` : `${formatMontant(sondage.recompense)} FCFA`}</span>{' '}
            {sondage.modeDistribution === 'AUTO'
              ? 'a été traitée automatiquement.'
              : 'sera créditée dès que notre équipe aura validé votre participation.'}
          </p>
        </div>
        <button onClick={() => navigate('/sondages')}
          className="mt-2 px-8 py-4 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
          Voir d'autres sondages
        </button>
      </div>
    )
  }

  if (step === 'suivi' && participation) {
    const validee = participation.statutValidation === 'VALIDE'
    const rejetee = participation.statutValidation === 'REJETE'
    const payee = participation.recompenseVersee
    return (
      <div className="min-h-screen bg-bg-light p-4 sm:p-6 flex flex-col items-center justify-center pb-28">
        <div className="w-full max-w-md rounded-3xl border-2 border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
          <button onClick={() => navigate('/sondages')} className="mb-6 inline-flex items-center gap-2 text-xs font-black text-gray-400 hover:text-primary">
            <ArrowLeft size={15} /> Retour aux sondages
          </button>
          <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${payee ? 'bg-success/10' : rejetee ? 'bg-urgency/10' : 'bg-accent/10'}`}>
            {payee ? <CheckCircle2 size={32} className="text-success" /> : rejetee ? <XCircle size={32} className="text-urgency" /> : <Clock size={32} className="text-accent" />}
          </div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Ma participation</p>
          <h1 className="text-xl font-heading font-extrabold text-primary">{sondage.titre}</h1>
          <div className="mt-6 rounded-2xl bg-bg-light p-4">
            <p className="text-sm font-black text-primary">
              {payee ? 'Participation validée et récompensée' : rejetee ? 'Participation non retenue' : validee ? 'Validation terminée, versement en cours' : 'Vérification en cours'}
            </p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
              {payee
                ? participation.typeRecompense === 'POINTS'
                  ? `Les points correspondant à ${formatMontant(participation.recompense)} FCFA ont été crédités.`
                  : `Votre récompense de ${formatMontant(participation.recompense)} FCFA a été créditée.`
                : rejetee
                  ? 'La vérification de votre participation n’a pas permis de la valider. Aucun versement ne sera effectué.'
                  : participation.statutSondage === 'EN_ATTENTE_DISTRIBUTION'
                    ? 'Le sondage est fermé aux nouvelles réponses. Les participations reçues sont maintenant en cours de validation.'
                    : 'Votre réponse est bien enregistrée. Aucune preuve supplémentaire n’est obligatoire ; notre équipe vous notifiera après sa décision.'}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Récompense</p>
              <p className="mt-1 font-heading font-extrabold text-primary">{formatMontant(participation.recompense)} FCFA{participation.typeRecompense === 'POINTS' ? ' → points' : ''}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Soumis le</p>
              <p className="mt-1 text-sm font-extrabold text-primary">{formatDate(participation.createdAt)}</p>
            </div>
          </div>
          <button onClick={() => navigate('/historique')} className="mt-6 w-full rounded-2xl bg-primary py-3.5 text-xs font-black uppercase tracking-widest text-white">
            Voir toutes mes participations
          </button>
        </div>
      </div>
    )
  }

  if (step === 'non_eligible') {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center gap-5 p-8 pb-28">
        <div className="w-20 h-20 rounded-full bg-urgency/10 flex items-center justify-center">
          <XCircle size={40} className="text-urgency" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-heading font-extrabold text-primary">Non éligible</h2>
          <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-xs">
            Votre score au test est de{' '}
            <span className="font-black text-urgency">{Number(tauxEchec || 0).toFixed(0)}%</span>.
            Vous n'avez pas atteint le seuil requis pour ce sondage.
          </p>
        </div>
        <button onClick={() => navigate('/sondages')}
          className="mt-2 px-8 py-4 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
          Voir d'autres sondages
        </button>
      </div>
    )
  }

  // ── Vue principale ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-light pb-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-8 space-y-4">

        {/* Retour */}
        <button onClick={() => navigate('/sondages')}
          className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Retour aux sondages
        </button>

        {/* Carte info */}
        <SondageCard sondage={sondage} />

        {/* Stepper éligibilité */}
        {eligibilite && (
          <div className="flex items-center gap-2 bg-white rounded-2xl border-2 border-gray-100 px-4 py-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              step === 'eligibilite' ? 'bg-accent text-primary' : 'bg-success text-white'
            }`}>
              {step === 'eligibilite' ? '1' : <CheckCircle2 size={14} />}
            </div>
            <div className={`h-0.5 flex-1 rounded-full ${step === 'sondage' ? 'bg-primary' : 'bg-gray-100'}`} />
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              step === 'sondage' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
            }`}>2</div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              {step === 'eligibilite' ? 'Présélection' : 'Sondage'}
            </span>
          </div>
        )}

        {/* Sondage fermé */}
        {step === 'ferme' && (
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle size={18} className="text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-primary font-bold">Ce sondage n'est plus ouvert aux réponses.</p>
          </div>
        )}

        {/* Connexion requise */}
        {!isAuthenticated && step !== 'ferme' && (
          <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-primary font-bold">
              Vous devez être{' '}
              <button onClick={() => navigate('/connexion')} className="underline font-black">connecté</button>
              {' '}pour participer à ce sondage.
            </p>
          </div>
        )}

        {/* Étape éligibilité */}
        {step === 'eligibilite' && isAuthenticated && eligibilite && (
          <EligibiliteStep
            sondageId={id}
            eligibilite={eligibilite}
            onPassed={handleEligibilitePassed}
            onFailed={handleEligibiliteFailed}
          />
        )}

        {/* Étape sondage */}
        {step === 'sondage' && isAuthenticated && (
          <SondageStep sondage={sondage} onDone={() => setStep('done')} />
        )}
      </div>
    </div>
  )
}
