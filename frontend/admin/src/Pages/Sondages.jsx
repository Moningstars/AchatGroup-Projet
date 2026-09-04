import { useEffect, useRef, useState } from 'react'
import {
  Loader2, Plus, Trash2, X, ChevronDown, ChevronUp,
  Edit2, CheckCircle2, XCircle, Clock, Users,
  AlertTriangle, ClipboardList, Eye, BarChart3, Search, SlidersHorizontal,
} from 'lucide-react'
import { Badge, ProgressBar } from '../components/ui'
import { useSSE } from '../hooks/useSSE'
import {
  getAdminSondages, activerSondage, distribuerSondage, creerSondage,
  creerEligibilite, modifierSondage, supprimerSondage, cloturerSondage,
  getReponsesAValider, validerReponse, getAdminCommanditaires,
  getSondageResultats, getRepondantsSondage,
} from '../services/api'

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUT_VALIDATION_COLOR = { VALIDE: 'emerald', EN_ATTENTE_PREUVE: 'amber', REJETE: 'rose' }
const STATUT_VALIDATION_LABEL = { VALIDE: 'Validée', EN_ATTENTE_PREUVE: 'À vérifier', REJETE: 'Non retenue' }

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDatetime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmt(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('fr-FR')
}

const STATUT_CONFIG = {
  BROUILLON:               { label: 'Brouillon',   color: 'gray',    dot: 'bg-slate-400' },
  ACTIF:                   { label: 'En cours',     color: 'sky',     dot: 'bg-sky-500' },
  EN_ATTENTE_DISTRIBUTION: { label: 'À finaliser',  color: 'amber',   dot: 'bg-amber-500' },
  CLOTURE:                 { label: 'Clôturé',      color: 'emerald', dot: 'bg-emerald-500' },
  ANNULE:                  { label: 'Annulé',       color: 'rose',    dot: 'bg-rose-500' },
}

const TYPE_Q = {
  CHOIX_UNIQUE:   'Choix unique',
  CHOIX_MULTIPLE: 'Choix multiple',
  OUI_NON:        'Oui / Non',
  TEXTE_LIBRE:    'Texte libre',
}

const QUESTION_VIDE = {
  ordre: 1, typeQuestion: 'CHOIX_UNIQUE', texte: '', obligatoire: true,
  options: [{ libelle: '', ordre: 1, estCorrecte: false }, { libelle: '', ordre: 2, estCorrecte: false }],
}

const FILTRES = [
  { key: 'TOUS', label: 'Tous' },
  { key: 'BROUILLON', label: 'Brouillon' },
  { key: 'ACTIF', label: 'En cours' },
  { key: 'EN_ATTENTE_DISTRIBUTION', label: 'À finaliser' },
  { key: 'CLOTURE', label: 'Clôturé' },
  { key: 'ANNULE', label: 'Annulé' },
]

const MODE_LABEL = { AUTO: 'Validation automatique', MANUEL: 'Validation manuelle' }
const RECOMPENSE_LABEL = { ARGENT: 'Paiement FCFA', POINTS: 'Points' }

const inputCls = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition'

// ─── helpers questions (réutilisés dans sondage + éligibilité) ───────────────

function QuestionsEditor({ questions, setQuestions, eligibilite = false }) {
  const needsOptions = (type) => ['CHOIX_UNIQUE', 'CHOIX_MULTIPLE'].includes(type)

  const setQ = (qi, k, v) => setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, [k]: v } : q))
  const setOpt = (qi, oi, k, v) => setQuestions(qs => qs.map((q, i) => i === qi
    ? { ...q, options: q.options.map((o, j) => j === oi ? { ...o, [k]: v } : o) } : q))
  const addOpt = (qi) => setQuestions(qs => qs.map((q, i) => i === qi
    ? { ...q, options: [...q.options, { libelle: '', ordre: q.options.length + 1, estCorrecte: false }] } : q))
  const removeOpt = (qi, oi) => setQuestions(qs => qs.map((q, i) => i === qi
    ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q))
  const addQ = () => setQuestions(qs => [
    ...qs,
    { ordre: qs.length + 1, typeQuestion: 'CHOIX_UNIQUE', texte: '', obligatoire: true,
      options: [{ libelle: '', ordre: 1, estCorrecte: false }, { libelle: '', ordre: 2, estCorrecte: false }] }
  ])
  const removeQ = (qi) => setQuestions(qs => qs.filter((_, i) => i !== qi))

  const qCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {eligibilite ? 'Questions du test *' : 'Questions du sondage *'}
        </span>
        <button type="button" onClick={addQ}
          className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">
          <Plus size={12} /> Ajouter
        </button>
      </div>
      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Question {qi + 1}</span>
              <button type="button" onClick={() => removeQ(qi)} disabled={questions.length === 1}
                className="rounded-lg p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <input required placeholder="Texte de la question" value={q.texte}
                  onChange={e => setQ(qi, 'texte', e.target.value)} className={qCls} />
              </div>
              <div>
                <select value={q.typeQuestion} onChange={e => setQ(qi, 'typeQuestion', e.target.value)} className={qCls}>
                  <option value="CHOIX_UNIQUE">Choix unique</option>
                  <option value="CHOIX_MULTIPLE">Choix multiple</option>
                  {!eligibilite && <option value="OUI_NON">Oui / Non</option>}
                  {!eligibilite && <option value="TEXTE_LIBRE">Texte libre</option>}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id={`obl-${eligibilite}-${qi}`} checked={q.obligatoire}
                  onChange={e => setQ(qi, 'obligatoire', e.target.checked)}
                  className="h-4 w-4 accent-violet-600" />
                <label htmlFor={`obl-${eligibilite}-${qi}`} className="text-sm text-slate-600">Obligatoire</label>
              </div>
            </div>
            {needsOptions(q.typeQuestion) && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-400">
                  {eligibilite ? 'Options — cochez la bonne réponse' : 'Options'}
                </p>
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    {eligibilite && (
                      <input type="checkbox" checked={o.estCorrecte}
                        onChange={e => setOpt(qi, oi, 'estCorrecte', e.target.checked)}
                        title="Bonne réponse"
                        className="h-4 w-4 accent-emerald-600 flex-shrink-0" />
                    )}
                    <input required placeholder={`Option ${oi + 1}`} value={o.libelle}
                      onChange={e => setOpt(qi, oi, 'libelle', e.target.value)}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-violet-400 ${
                        eligibilite && o.estCorrecte ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
                      }`} />
                    <button type="button" onClick={() => removeOpt(qi, oi)} disabled={q.options.length <= 2}
                      className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {eligibilite && (
                  <p className="text-[10px] text-emerald-600">☑ = bonne réponse</p>
                )}
                <button type="button" onClick={() => addOpt(qi)} className="text-xs text-violet-600 hover:underline">
                  + Option
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── NouveauSondageModal ─────────────────────────────────────────────────────

const ELIG_Q_VIDE = {
  ordre: 1, typeQuestion: 'CHOIX_UNIQUE', texte: '', obligatoire: true,
  options: [
    { libelle: '', ordre: 1, estCorrecte: false },
    { libelle: '', ordre: 2, estCorrecte: false },
  ],
}

function NouveauSondageModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    titre: '', description: '',
    quotaVise: '', recompense: '', typeRecompense: 'ARGENT',
    seuilEligibilite: '80', niveauVerification: 'AUCUN',
    modeDistribution: 'AUTO', dateExpiration: '',
    commanditaireId: '',
  })
  const [commanditaires, setCommanditaires] = useState([])
  const [questions, setQuestions] = useState([{ ...QUESTION_VIDE }])
  const [eligTitre, setEligTitre] = useState('')
  const [eligQuestions, setEligQuestions] = useState([{ ...ELIG_Q_VIDE }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminCommanditaires()
      .then(list => setCommanditaires(list.filter(c => c.statut === 'ACTIF')))
      .catch(() => {})
  }, [])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Vérification : au moins une bonne réponse par question d'éligibilité à choix
    for (const q of eligQuestions) {
      if (['CHOIX_UNIQUE', 'CHOIX_MULTIPLE'].includes(q.typeQuestion)) {
        const bonnes = q.options.filter(o => o.estCorrecte).length
        if (bonnes === 0) {
          setError(`Test d'éligibilité — Question "${q.texte || `Q${q.ordre}`}" : cochez au moins une bonne réponse.`)
          return
        }
        if (q.typeQuestion === 'CHOIX_UNIQUE' && bonnes !== 1) {
          setError(`Test d'éligibilité — Question "${q.texte || `Q${q.ordre}`}" : choisissez exactement une bonne réponse.`)
          return
        }
      }
    }

    setLoading(true)
    try {
      const sondage = await creerSondage({
        commanditaireId: form.commanditaireId || undefined,
        titre: form.titre,
        description: form.description || undefined,
        quotaVise: Number(form.quotaVise),
        recompense: Number(form.recompense),
        typeRecompense: form.typeRecompense,
        seuilEligibilite: Number(form.seuilEligibilite),
        niveauVerification: form.niveauVerification,
        modeDistribution: form.modeDistribution,
        dateExpiration: new Date(form.dateExpiration).toISOString(),
        questions: questions.map((q, i) => ({
          ordre: i + 1,
          typeQuestion: q.typeQuestion,
          texte: q.texte,
          obligatoire: q.obligatoire,
          options: ['CHOIX_UNIQUE', 'CHOIX_MULTIPLE'].includes(q.typeQuestion)
            ? q.options.map((o, j) => ({ libelle: o.libelle, ordre: j + 1 }))
            : [],
        })),
      })

      await creerEligibilite(sondage.id, {
        titre: eligTitre || `Test d'éligibilité — ${form.titre}`,
        questions: eligQuestions.map((q, i) => ({
          ordre: i + 1,
          typeQuestion: q.typeQuestion,
          texte: q.texte,
          obligatoire: q.obligatoire,
          options: ['CHOIX_UNIQUE', 'CHOIX_MULTIPLE'].includes(q.typeQuestion)
            ? q.options.map((o, j) => ({ libelle: o.libelle, ordre: j + 1, estCorrecte: o.estCorrecte }))
            : [],
        })),
      })

      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-modal-layer fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Nouveau sondage</h3>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Section 1 : infos générales ── */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">1 — Informations générales</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Commanditaire</label>
                <select value={form.commanditaireId} onChange={e => setField('commanditaireId', e.target.value)} className={inputCls}>
                  <option value="">— Aucun (sondage interne) —</option>
                  {commanditaires.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.prenom}{c.societe ? ` — ${c.societe}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Titre *</label>
                <input required value={form.titre} onChange={e => setField('titre', e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={2} className={inputCls + ' resize-none'} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Quota visé *</label>
                <input required type="number" min="1" value={form.quotaVise} onChange={e => setField('quotaVise', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Récompense (FCFA) *</label>
                <input required type="number" min="0" value={form.recompense} onChange={e => setField('recompense', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Type récompense *</label>
                <select value={form.typeRecompense} onChange={e => setField('typeRecompense', e.target.value)} className={inputCls}>
                  <option value="ARGENT">Argent</option>
                  <option value="POINTS">Points</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Seuil éligibilité (%) *</label>
                <input required type="number" min="0" max="100" value={form.seuilEligibilite}
                  onChange={e => setField('seuilEligibilite', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Niveau KYC requis *</label>
                <select value={form.niveauVerification} onChange={e => setField('niveauVerification', e.target.value)} className={inputCls}>
                  <option value="AUCUN">Aucun — ouvert à tous</option>
                  <option value="VERIFIE">KYC vérifié — identité validée requise</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mode de validation *</label>
                <select value={form.modeDistribution} onChange={e => setField('modeDistribution', e.target.value)} className={inputCls}>
                  <option value="AUTO">Automatique — versement immédiat</option>
                  <option value="MANUEL">Manuelle — décision de l’équipe</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Date d'expiration *</label>
                <input required type="datetime-local" value={form.dateExpiration}
                  onChange={e => setField('dateExpiration', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* ── Section 2 : questions du sondage ── */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">2 — Questions du sondage</p>
            <QuestionsEditor questions={questions} setQuestions={setQuestions} eligibilite={false} />
          </div>

          {/* ── Section 3 : test d'éligibilité ── */}
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700">
              3 — Test de présélection (obligatoire)
            </p>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Titre du test</label>
              <input
                placeholder={`Test d'éligibilité — ${form.titre || 'sondage'}`}
                value={eligTitre}
                onChange={e => setEligTitre(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="rounded-xl bg-amber-100/60 border border-amber-200 p-3 mb-3 text-xs text-amber-800">
              Cochez <span className="font-bold">☑</span> la bonne réponse sur chaque option.
              Le participant doit obtenir ≥ <span className="font-bold">{form.seuilEligibilite || '80'}%</span> pour accéder au sondage.
            </div>
            <QuestionsEditor questions={eligQuestions} setQuestions={setEligQuestions} eligibilite={true} />
          </div>

          {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Créer le sondage
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ConfigurerEligibiliteModal ──────────────────────────────────────────────

function ConfigurerEligibiliteModal({ sondage, onClose, onSaved }) {
  const [eligTitre, setEligTitre] = useState(`Test d'éligibilité — ${sondage.titre}`)
  const [eligQuestions, setEligQuestions] = useState([{ ...ELIG_Q_VIDE }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    for (const q of eligQuestions) {
      if (['CHOIX_UNIQUE', 'CHOIX_MULTIPLE'].includes(q.typeQuestion)) {
        const bonnes = q.options.filter(o => o.estCorrecte).length
        if (bonnes === 0) {
          setError(`Question "${q.texte || `Q${q.ordre}`}" : cochez au moins une bonne réponse.`)
          return
        }
        if (q.typeQuestion === 'CHOIX_UNIQUE' && bonnes !== 1) {
          setError(`Question "${q.texte || `Q${q.ordre}`}" : choisissez exactement une bonne réponse.`)
          return
        }
        if (q.options.some(o => !o.libelle.trim())) {
          setError(`Question "${q.texte || `Q${q.ordre}`}" : remplissez toutes les options.`)
          return
        }
      }
      if (!q.texte.trim()) {
        setError('Toutes les questions doivent avoir un texte.')
        return
      }
    }

    setLoading(true)
    try {
      await creerEligibilite(sondage.id, {
        titre: eligTitre.trim() || `Test d'éligibilité — ${sondage.titre}`,
        questions: eligQuestions.map((q, i) => ({
          ordre: i + 1,
          typeQuestion: q.typeQuestion,
          texte: q.texte,
          obligatoire: q.obligatoire,
          options: ['CHOIX_UNIQUE', 'CHOIX_MULTIPLE'].includes(q.typeQuestion)
            ? q.options.map((o, j) => ({ libelle: o.libelle, ordre: j + 1, estCorrecte: o.estCorrecte }))
            : [],
        })),
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la configuration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-modal-layer fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Configurer le test d'éligibilité</h3>
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{sondage.titre}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Le seuil d'éligibilité est de <span className="font-bold">{sondage.seuilEligibilite ?? 80}%</span>.
          Cochez <span className="font-bold">☑</span> la bonne réponse sur chaque option.
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre du test</label>
            <input
              value={eligTitre}
              onChange={e => setEligTitre(e.target.value)}
              className={inputCls}
            />
          </div>

          <QuestionsEditor questions={eligQuestions} setQuestions={setEligQuestions} eligibilite={true} />

          {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button type="submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Enregistrer le test
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ModifierSondageModal ────────────────────────────────────────────────────

function ModifierSondageModal({ sondage, onClose, onSaved }) {
  const [form, setForm] = useState({
    titre: sondage.titre || '',
    description: sondage.description || '',
    quotaVise: String(sondage.quotaVise || ''),
    recompense: String(sondage.recompense || ''),
    dateExpiration: sondage.dateExpiration ? sondage.dateExpiration.slice(0, 16) : '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await modifierSondage(sondage.id, {
        titre: form.titre || undefined,
        description: form.description || undefined,
        quotaVise: form.quotaVise ? Number(form.quotaVise) : undefined,
        recompense: form.recompense ? Number(form.recompense) : undefined,
        dateExpiration: form.dateExpiration ? new Date(form.dateExpiration).toISOString() : undefined,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-modal-layer fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Modifier le sondage</h3>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input value={form.titre} onChange={e => setField('titre', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3}
              className={inputCls + ' resize-none'} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Quota visé</label>
              <input type="number" min="1" value={form.quotaVise} onChange={e => setField('quotaVise', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Récompense (FCFA)</label>
              <input type="number" min="0" value={form.recompense} onChange={e => setField('recompense', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date d'expiration</label>
            <input type="datetime-local" value={form.dateExpiration} onChange={e => setField('dateExpiration', e.target.value)} className={inputCls} />
          </div>
          {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button type="submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Enregistrer
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ReponsesModal ───────────────────────────────────────────────────────────

function ReponsesModal({ sondageId, onClose, onChanged }) {
  const [reponses, setReponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    getReponsesAValider(sondageId)
      .then(setReponses)
      .catch(() => setError('Impossible de charger les réponses'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [sondageId])

  const handle = async (reponseId, approuve) => {
    setActionId(reponseId)
    try {
      await validerReponse(reponseId, approuve)
      load()
      onChanged()
    } catch {
      setError('Erreur lors de la validation')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="admin-modal-layer fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-950">Réponses à valider</h3>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          ) : error ? (
            <p className="text-center text-sm text-rose-600 py-6">{error}</p>
          ) : reponses.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-400" />
              <p className="text-slate-500 font-medium">Aucune réponse en attente de validation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reponses.map(r => (
                <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.participantNom || '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{r.participantContact || '—'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Soumis le {formatDatetime(r.createdAt)}</p>
                  </div>
                  <div className="flex w-full flex-shrink-0 gap-2 sm:w-auto">
                    <button
                      onClick={() => handle(r.id, true)}
                      disabled={actionId === r.id}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
                    >
                      {actionId === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Valider
                    </button>
                    <button
                      onClick={() => handle(r.id, false)}
                      disabled={actionId === r.id}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition"
                    >
                      {actionId === r.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={13} />}
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ResultatsModal ──────────────────────────────────────────────────────────

function ResultatsModal({ sondageId, onClose }) {
  const [resultats, setResultats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [repondants, setRepondants] = useState([])
  const [loadingRepondants, setLoadingRepondants] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSondageResultats(sondageId)
      .then(setResultats)
      .catch(() => setError('Impossible de charger les résultats'))
      .finally(() => setLoading(false))
  }, [sondageId])

  useEffect(() => {
    setLoadingRepondants(true)
    getRepondantsSondage(sondageId)
      .then(setRepondants)
      .catch(() => setRepondants([]))
      .finally(() => setLoadingRepondants(false))
  }, [sondageId])

  return (
    <div className="admin-modal-layer fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Résultats du sondage</h3>
            {resultats && (
              <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                {resultats.titre}
                {resultats.commanditaireSociete && ` · ${resultats.commanditaireSociete}`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          ) : error ? (
            <p className="text-center text-sm text-rose-600 py-6">{error}</p>
          ) : !resultats || resultats.repondantsValides === 0 ? (
            <div className="py-6 text-center">
              <BarChart3 size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">Aucune réponse validée pour l'instant</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Résumé */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-extrabold text-slate-800">
                    {resultats.repondantsValides}/{resultats.quotaVise}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Répondants validés</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-extrabold text-slate-800">{fmt(resultats.tauxCompletion)}%</p>
                  <p className="text-[11px] text-slate-500 font-medium">Taux de complétion</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-extrabold text-slate-800">{fmt(resultats.budgetDistribue)}</p>
                  <p className="text-[11px] text-slate-500 font-medium">FCFA distribués</p>
                </div>
              </div>

              {/* Par question */}
              <div className="space-y-4">
                {resultats.resultatsParQuestion.map((q, i) => (
                  <div key={q.questionId} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        <span className="text-slate-400 font-mono text-xs mr-1.5">{String(q.ordre).padStart(2, '0')}.</span>
                        {q.texte}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 flex-shrink-0">
                        {TYPE_Q[q.typeQuestion] || q.typeQuestion}
                      </span>
                    </div>

                    {q.repartition && (
                      <div className="space-y-2">
                        {q.repartition.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucune réponse</p>
                        ) : q.repartition.map((o, oi) => (
                          <div key={o.optionId || oi}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-600 font-medium">{o.libelle}</span>
                              <span className="text-slate-500">{o.count} · {fmt(o.pourcentage)}%</span>
                            </div>
                            <ProgressBar value={Number(o.pourcentage) || 0} color="violet" className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    )}

                    {q.verbatims && (
                      q.verbatims.length === 0 ? (
                        <p className="text-xs text-slate-400">Aucune réponse</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {q.verbatims.map((v, vi) => (
                            <p key={vi} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600">
                              "{v}"
                            </p>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Répondants */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Répondants ({repondants.length})
            </p>
            {loadingRepondants ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-violet-500" />
              </div>
            ) : repondants.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun répondant pour l'instant.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {repondants.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.participantNom || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{r.participantContact || '—'} · {formatDatetime(r.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.recompenseVersee && (
                        <span className="text-[10px] font-semibold text-emerald-600">Récompense versée</span>
                      )}
                      <Badge color={STATUT_VALIDATION_COLOR[r.statutValidation] || 'gray'}>
                        {STATUT_VALIDATION_LABEL[r.statutValidation] || r.statutValidation}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SondageCard ─────────────────────────────────────────────────────────────

function SondageCard({ survey, actionId, onActiver, onDistribuer, onCloturer, onModifier, onSupprimer, onVoirReponses, onConfigurerElig, onVoirResultats }) {
  const [expanded, setExpanded] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const actionsRef = useRef(null)

  useEffect(() => {
    if (!actionsOpen) return undefined
    const close = (event) => {
      if (event.key === 'Escape' || (event.type === 'mousedown' && !actionsRef.current?.contains(event.target))) {
        setActionsOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [actionsOpen])

  const cfg = STATUT_CONFIG[survey.statut] || { label: survey.statut, color: 'gray', dot: 'bg-slate-400' }
  const progress = survey.quotaVise > 0
    ? Math.min(100, Math.round((survey.repondantsActuels / survey.quotaVise) * 100)) : 0

  const isActing = (suffix) => actionId === survey.id + suffix

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white shadow-soft transition duration-200 hover:shadow-lift">
      {/* ── Header ── */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <Badge color={cfg.color} size="sm">{cfg.label}</Badge>
              <Badge color="gray" size="sm">{MODE_LABEL[survey.modeDistribution] || survey.modeDistribution}</Badge>
              <Badge color="gray" size="sm">{RECOMPENSE_LABEL[survey.typeRecompense] || survey.typeRecompense}</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">{survey.titre}</h3>
            {survey.commanditaireNom && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                <span className="text-indigo-400">⬡</span> {survey.commanditaireNom}
                {survey.commanditaireSociete && ` · ${survey.commanditaireSociete}`}
              </p>
            )}
            {survey.description && (
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{survey.description}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="relative flex-shrink-0" ref={actionsRef}>
            <button onClick={() => setActionsOpen(v => !v)} aria-expanded={actionsOpen} aria-haspopup="menu"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700">
              Gérer {actionsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {actionsOpen && <div role="menu" className="absolute right-0 top-12 z-20 w-64 space-y-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lift [&>button]:min-h-9 [&>button]:w-full [&>button]:justify-start [&>button]:rounded-xl">
            {/* ⚠️ Pas de test d'éligibilité */}
            {!survey.hasEligibilite && !['CLOTURE', 'ANNULE'].includes(survey.statut) && (
              <button onClick={() => onConfigurerElig(survey)}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition">
                <AlertTriangle size={12} /> Test éligibilité ⚠
              </button>
            )}

            {survey.statut === 'BROUILLON' && (
              <>
                <button onClick={() => onActiver(survey.id)}
                  disabled={isActing('-activer')}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50 transition">
                  {isActing('-activer') ? <Loader2 size={12} className="animate-spin" /> : null}
                  Activer
                </button>
                <button onClick={() => onModifier(survey)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition">
                  <Edit2 size={12} /> Modifier
                </button>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition">
                    <Trash2 size={12} /> Supprimer
                  </button>
                ) : (
                <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                    <AlertTriangle size={12} className="text-rose-500" />
                    <span className="text-xs text-rose-700 font-semibold">Confirmer ?</span>
                    <button onClick={() => { onSupprimer(survey.id); setConfirmDelete(false) }}
                      disabled={isActing('-supprimer')}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 disabled:opacity-50">
                      {isActing('-supprimer') ? <Loader2 size={11} className="animate-spin inline" /> : 'Oui'}
                    </button>
                    <span className="text-rose-300">|</span>
                    <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Non</button>
                  </div>
                )}
              </>
            )}

            {survey.statut === 'ACTIF' && (
              <>
                <button onClick={() => onCloturer(survey.id)}
                  disabled={isActing('-cloturer')}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition">
                  {isActing('-cloturer') ? <Loader2 size={12} className="animate-spin" /> : null}
                  Clôturer
                </button>
                <button onClick={() => onVoirReponses(survey.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition">
                  <Eye size={12} /> Réponses
                </button>
                <button onClick={() => onModifier(survey)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition">
                  <Edit2 size={12} /> Modifier
                </button>
              </>
            )}

            {(survey.statut === 'EN_ATTENTE_DISTRIBUTION') && (
              <>
                <button onClick={() => onVoirReponses(survey.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition">
                  <Eye size={12} /> Vérifier les réponses
                </button>
                <button onClick={() => onDistribuer(survey.id)}
                  disabled={isActing('-distribuer')}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition">
                  {isActing('-distribuer') ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Finaliser
                </button>
              </>
            )}

            {!['BROUILLON'].includes(survey.statut) && (
              <button onClick={() => onVoirResultats(survey.id)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                <BarChart3 size={12} /> Résultats
              </button>
            )}

            {/* Expand/collapse questions */}
            {survey.questions?.length > 0 && (
              <button onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition">
                <ClipboardList size={12} />
                {survey.questions.length} question{survey.questions.length > 1 ? 's' : ''}
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
            </div>}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Users size={12} className="text-slate-400" />
            {survey.repondantsActuels} / {survey.quotaVise} répondants
          </span>
          <span className="flex min-w-0 items-center gap-1 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
            {fmt(survey.recompense)} {survey.typeRecompense === 'POINTS' ? 'points' : 'FCFA'} / répondant
          </span>
          {survey.budgetReserve != null && (
            <span className="col-span-2 flex min-w-0 items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:col-span-1">
              {fmt(survey.budgetRestant || 0)} {survey.typeRecompense === 'POINTS' ? 'points' : 'FCFA'} disponibles
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Clock size={12} className="text-slate-400" />
            Expire {formatDate(survey.dateExpiration)}
          </span>
          <span className="hidden items-center rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400 xl:flex">Créé {formatDate(survey.createdAt)}</span>
        </div>

        {/* ── Progress bar ── */}
        <div className="space-y-1">
          <ProgressBar value={progress} color={progress >= 100 ? 'emerald' : 'violet'} className="h-1.5" />
          <p className="text-xs text-slate-400 text-right">{progress}% du quota</p>
        </div>
      </div>

      {/* ── Questions expand ── */}
      {expanded && survey.questions?.length > 0 && (
        <div className="overflow-hidden rounded-b-2xl border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Questions du sondage</p>
          <div className="space-y-3">
            {survey.questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    <span className="text-slate-400 font-mono text-xs mr-1.5">{String(q.ordre).padStart(2,'0')}.</span>
                    {q.texte}
                  </p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {TYPE_Q[q.typeQuestion] || q.typeQuestion}
                    </span>
                    {q.obligatoire && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500">Obligatoire</span>
                    )}
                  </div>
                </div>
                {q.options?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.map(o => (
                      <span key={o.id} className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs text-violet-700 font-medium">
                        {o.libelle}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

// ─── Sondages (main) ─────────────────────────────────────────────────────────

export default function Sondages() {
  const [sondages, setSondages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('TOUS')
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('TOUS')
  const [rewardFilter, setRewardFilter] = useState('TOUS')
  const [sort, setSort] = useState('RECENTS')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [showNouveauModal, setShowNouveauModal] = useState(false)
  const [editSondage, setEditSondage] = useState(null)
  const [configEligSondage, setConfigEligSondage] = useState(null)
  const [reponsesSondageId, setReponsesSondageId] = useState(null)
  const [resultatsSondageId, setResultatsSondageId] = useState(null)

  const fetchData = () => {
    setLoading(true)
    getAdminSondages()
      .then(setSondages)
      .catch(() => setSondages([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  // Compteurs/statut mis à jour en direct
  useSSE('events/sondages', {
    COMPTEUR: ({ id, repondantsActuels }) => {
      setSondages(prev => prev.map(s => s.id === id ? { ...s, repondantsActuels } : s))
    },
    STATUT: ({ id, statut }) => {
      setSondages(prev => prev.map(s => s.id === id ? { ...s, statut } : s))
    },
  })

  const act = async (id, suffix, fn) => {
    setActionId(id + suffix)
    setActionError(null)
    try {
      await fn()
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Une erreur est survenue.'
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setActionId(null)
    }
  }

  const handleActiver    = (id) => act(id, '-activer',    () => activerSondage(id))
  const handleDistribuer = (id) => act(id, '-distribuer', () => distribuerSondage(id))
  const handleCloturer   = (id) => act(id, '-cloturer',   () => cloturerSondage(id))
  const handleSupprimer  = (id) => act(id, '-supprimer',  () => supprimerSondage(id))

  const sondagesFiltres = sondages
    .filter(s => filtre === 'TOUS' || s.statut === filtre)
    .filter(s => modeFilter === 'TOUS' || s.modeDistribution === modeFilter)
    .filter(s => rewardFilter === 'TOUS' || s.typeRecompense === rewardFilter)
    .filter(s => {
      const q = search.trim().toLocaleLowerCase('fr')
      if (!q) return true
      return [s.titre, s.description, s.commanditaireNom, s.commanditaireSociete]
        .some(v => v?.toLocaleLowerCase('fr').includes(q))
    })
    .sort((a, b) => {
      if (sort === 'EXPIRATION') return new Date(a.dateExpiration) - new Date(b.dateExpiration)
      if (sort === 'PROGRESSION') return (b.repondantsActuels / b.quotaVise) - (a.repondantsActuels / a.quotaVise)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  const hasActiveFilters = filtre !== 'TOUS' || modeFilter !== 'TOUS' || rewardFilter !== 'TOUS' || search.trim()
  const resetFilters = () => { setFiltre('TOUS'); setModeFilter('TOUS'); setRewardFilter('TOUS'); setSearch('') }

  const countByStatut = (key) => sondages.filter(s => s.statut === key).length

  return (
    <div className="space-y-5">
      {/* Modals */}
      {showNouveauModal && (
        <NouveauSondageModal
          onClose={() => setShowNouveauModal(false)}
          onSaved={() => { setShowNouveauModal(false); fetchData() }}
        />
      )}
      {editSondage && (
        <ModifierSondageModal
          sondage={editSondage}
          onClose={() => setEditSondage(null)}
          onSaved={() => { setEditSondage(null); fetchData() }}
        />
      )}
      {configEligSondage && (
        <ConfigurerEligibiliteModal
          sondage={configEligSondage}
          onClose={() => setConfigEligSondage(null)}
          onSaved={() => { setConfigEligSondage(null); fetchData() }}
        />
      )}
      {reponsesSondageId && (
        <ReponsesModal
          sondageId={reponsesSondageId}
          onClose={() => setReponsesSondageId(null)}
          onChanged={fetchData}
        />
      )}
      {resultatsSondageId && (
        <ResultatsModal
          sondageId={resultatsSondageId}
          onClose={() => setResultatsSondageId(null)}
        />
      )}

      {/* ── En-tête compact ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span><strong className="text-slate-900">{sondages.length}</strong> sondage{sondages.length !== 1 ? 's' : ''}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span><strong className="text-sky-600">{countByStatut('ACTIF')}</strong> en cours</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span><strong className="text-amber-600">{countByStatut('EN_ATTENTE_DISTRIBUTION')}</strong> à finaliser</span>
        </div>
        <button onClick={() => setShowNouveauModal(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-800 sm:w-auto">
          <Plus size={15} /> Nouveau sondage
        </button>
      </div>

      {/* ── Erreur action ── */}
      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="flex-shrink-0 text-rose-500" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="flex-shrink-0 text-rose-400 hover:text-rose-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Recherche et filtres structurés ── */}
      <section aria-label="Recherche et filtres" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto] lg:grid-cols-[minmax(280px,1fr)_190px_auto]">
          <label className="relative block">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Titre, description ou commanditaire…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" />
          </label>
          <select aria-label="Filtrer par statut" value={filtre} onChange={e => setFiltre(e.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400">
            {FILTRES.map(f => <option key={f.key} value={f.key}>{f.label}{f.key !== 'TOUS' ? ` (${countByStatut(f.key)})` : ''}</option>)}
          </select>
          <button type="button" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${filtersOpen || hasActiveFilters ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            <SlidersHorizontal size={16} /> Filtres avancés
          </button>
        </div>
        {filtersOpen && (
          <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
          <select aria-label="Filtrer par mode" value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400">
            <option value="TOUS">Tous les modes</option><option value="AUTO">Automatique</option><option value="MANUEL">Manuel</option>
          </select>
          <select aria-label="Filtrer par récompense" value={rewardFilter} onChange={e => setRewardFilter(e.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400">
            <option value="TOUS">Toutes récompenses</option><option value="ARGENT">Paiement FCFA</option><option value="POINTS">Points</option>
          </select>
          <select aria-label="Trier les sondages" value={sort} onChange={e => setSort(e.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400">
            <option value="RECENTS">Plus récents</option><option value="EXPIRATION">Expiration proche</option><option value="PROGRESSION">Progression</option>
          </select>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-500">{sondagesFiltres.length} résultat{sondagesFiltres.length !== 1 ? 's' : ''}</p>
          {hasActiveFilters && <button type="button" onClick={resetFilters} className="text-xs font-semibold text-violet-700 hover:underline">Réinitialiser les filtres</button>}
        </div>
      </section>

      {/* ── Liste ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-violet-600" />
        </div>
      ) : sondagesFiltres.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <ClipboardList size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-semibold">Aucun sondage{filtre !== 'TOUS' ? ' dans cette catégorie' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sondagesFiltres.map(survey => (
            <SondageCard
              key={survey.id}
              survey={survey}
              actionId={actionId}
              onActiver={handleActiver}
              onDistribuer={handleDistribuer}
              onCloturer={handleCloturer}
              onModifier={setEditSondage}
              onSupprimer={handleSupprimer}
              onVoirReponses={setReponsesSondageId}
              onConfigurerElig={setConfigEligSondage}
              onVoirResultats={setResultatsSondageId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
