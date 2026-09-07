import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Loader2, Plus, Trash2, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Edit2, CheckCircle2, XCircle, Clock, Users,
  AlertTriangle, ArrowLeft, ClipboardList, Eye, BarChart3, Search, SlidersHorizontal,
} from 'lucide-react'
import { Badge, Pagination, ProgressBar } from '../components/ui'
import { useSSE } from '../hooks/useSSE'
import {
  getAdminSondage, getAdminSondages, activerSondage, distribuerSondage, creerSondage,
  creerEligibilite, modifierSondage, supprimerSondage, cloturerSondage,
  getReponsesAValider, validerReponse, getAdminCommanditaires,
  getSondageResultats, getRepondantsSondage, uploadSondageImage, getPreuveReponse, BASE_URL,
} from '../services/api'

const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '')
const mediaUrl = value => value ? (value.startsWith('http') ? value : `${API_ORIGIN}${value}`) : null
const preuveEstPdf = value => /\.pdf(?:$|[?#])/i.test(value || '')
const REFERENCE_TEMPS = Date.now()

function JustificatifPreuve({ reponse }) {
  const fichier = reponse.fichierPreuve
  const externe = fichier?.startsWith('http')
  const [preuve, setPreuve] = useState(() => externe ? { url: fichier, type: preuveEstPdf(fichier) ? 'application/pdf' : 'image/externe' } : null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!fichier || externe) return undefined
    let actif = true
    let objectUrl
    getPreuveReponse(reponse.id)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        if (actif) setPreuve({ url: objectUrl, type: blob.type })
        else URL.revokeObjectURL(objectUrl)
      })
      .catch(() => {
        if (actif) setErreur('Le justificatif ne peut pas être chargé.')
      })
    return () => {
      actif = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [externe, fichier, reponse.id])

  if (!fichier) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-700">
        <AlertTriangle size={18} className="mb-2" />
        Aucun justificatif transmis. Contrôlez attentivement les réponses avant de décider.
      </div>
    )
  }
  if (erreur) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">{erreur}</div>
  if (!preuve) return <div className="flex h-36 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"><Loader2 size={22} className="animate-spin text-violet-600" /></div>

  const pdf = preuve.type === 'application/pdf' || preuveEstPdf(fichier)
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {pdf ? (
        <div className="flex h-36 flex-col items-center justify-center bg-slate-100 px-4 text-center">
          <ClipboardList size={30} className="mb-2 text-violet-500" />
          <p className="text-xs font-bold text-slate-700">Document justificatif PDF</p>
          <p className="mt-1 text-[10px] text-slate-400">Utilisez le bouton ci-dessous pour le consulter.</p>
        </div>
      ) : (
        <button type="button" onClick={() => window.open(preuve.url, '_blank', 'noopener,noreferrer')} className="block w-full bg-slate-100 p-2">
          <img src={preuve.url} alt={`Justificatif transmis par ${reponse.participantNom || 'le participant'}`} className="h-36 w-full rounded-lg object-contain" />
        </button>
      )}
      <button type="button" onClick={() => window.open(preuve.url, '_blank', 'noopener,noreferrer')} className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-violet-700 hover:bg-violet-50">
        <Eye size={13} /> Ouvrir en grand
      </button>
    </div>
  )
}

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

// ─── Formulaire dédié : nouveau sondage ──────────────────────────────────────

const ELIG_Q_VIDE = {
  ordre: 1, typeQuestion: 'CHOIX_UNIQUE', texte: '', obligatoire: true,
  options: [
    { libelle: '', ordre: 1, estCorrecte: false },
    { libelle: '', ordre: 2, estCorrecte: false },
  ],
}

function NouveauSondageForm({ onClose, onSaved, modal = false }) {
  const [form, setForm] = useState({
    titre: '', description: '', imageUrl: '',
    quotaVise: '', recompense: '', typeRecompense: 'ARGENT',
    seuilEligibilite: '80', niveauVerification: 'AUCUN',
    modeDistribution: 'AUTO', dateExpiration: '',
    commanditaireId: '',
  })
  const [commanditaires, setCommanditaires] = useState([])
  const [questions, setQuestions] = useState([{ ...QUESTION_VIDE }])
  const [eligTitre, setEligTitre] = useState('')
  const [eligQuestions, setEligQuestions] = useState([{ ...ELIG_Q_VIDE }])
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  useEffect(() => {
    getAdminCommanditaires()
      .then(list => setCommanditaires(list.filter(c => c.statut === 'ACTIF')))
      .catch(() => {})
  }, [])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validateQuestions = (items, eligibility = false) => {
    for (const [index, q] of items.entries()) {
      if (!q.texte.trim()) return `Renseignez le texte de la question ${index + 1}.`
      if (['CHOIX_UNIQUE', 'CHOIX_MULTIPLE'].includes(q.typeQuestion)) {
        if (q.options.some(option => !option.libelle.trim())) return `Complétez toutes les options de la question ${index + 1}.`
        if (eligibility) {
          const correctes = q.options.filter(option => option.estCorrecte).length
          if (correctes === 0) return `Cochez au moins une bonne réponse pour la question ${index + 1}.`
          if (q.typeQuestion === 'CHOIX_UNIQUE' && correctes !== 1) return `Sélectionnez une seule bonne réponse pour la question ${index + 1}.`
        }
      }
    }
    return ''
  }

  const goNext = () => {
    let message = ''
    if (step === 1 && (!form.titre.trim() || !form.quotaVise || form.recompense === '' || !form.dateExpiration)) {
      message = 'Complétez le titre, le quota, la récompense et la date d’expiration.'
    }
    if (step === 2) message = validateQuestions(questions)
    if (step === 3) message = validateQuestions(eligQuestions, true)
    if (message) {
      setError(message)
      return
    }
    setError('')
    setStep(current => Math.min(4, current + 1))
  }

  const steps = [
    { number: 1, label: 'Informations' },
    { number: 2, label: 'Questions' },
    { number: 3, label: 'Présélection' },
    { number: 4, label: 'Vérification' },
  ]

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
        imageUrl: imageFile ? undefined : (form.imageUrl || undefined),
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

      if (imageFile) {
        await uploadSondageImage(sondage.id, imageFile)
      }

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

  const content = (
    <div className={modal ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6' : 'mx-auto w-full max-w-4xl pb-8'}>
      <div className={modal
        ? 'flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]'
        : 'flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-600">Création guidée</p>
            <h3 className="text-xl font-bold text-slate-950">Nouveau sondage</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6">
          <div className="grid grid-cols-4 gap-2">
            {steps.map(item => (
              <button key={item.number} type="button" onClick={() => item.number < step && setStep(item.number)}
                className={`min-w-0 rounded-xl px-2 py-2 text-left transition ${item.number === step ? 'bg-violet-700 text-white shadow-md shadow-violet-200' : item.number < step ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-400'}`}>
                <span className="block text-[10px] font-black">{item.number < step ? '✓' : `0${item.number}`}</span>
                <span className="hidden truncate text-xs font-bold sm:block">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">

          {/* ── Section 1 : infos générales ── */}
          {step === 1 && <div>
            <p className="mb-1 text-base font-bold text-slate-900">Informations générales</p>
            <p className="mb-4 text-sm text-slate-500">Définissez le cadre, la récompense et les règles de participation.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Commanditaire du sondage</label>
                <select value={form.commanditaireId} onChange={e => setField('commanditaireId', e.target.value)} className={inputCls}>
                  <option value="">— Aucun (sondage interne) —</option>
                  {commanditaires.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.prenom}{c.societe ? ` — ${c.societe}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">Sponsor de l’enquête — ce choix n’est jamais utilisé comme fournisseur d’opportunité.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Titre *</label>
                <input required value={form.titre} onChange={e => setField('titre', e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={2} className={inputCls + ' resize-none'} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Image de couverture</label>
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="Aperçu" className="mb-2 h-28 w-full rounded-xl object-cover border border-slate-200" />
                )}
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={e => {
                      setField('imageUrl', e.target.value)
                      setImageFile(null)
                    }}
                    className={inputCls}
                  />
                  <div className="relative overflow-hidden rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer flex-shrink-0 transition-colors">
                    <span className="flex items-center gap-1"><Plus size={16} /> Fichier</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={e => {
                        const file = e.target.files[0]
                        if (file) {
                          setImageFile(file)
                          setField('imageUrl', URL.createObjectURL(file))
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">Collez un lien direct ou uploadez un fichier image.</p>
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
          </div>}

          {/* ── Section 2 : questions du sondage ── */}
          {step === 2 && <div>
            <p className="mb-1 text-base font-bold text-slate-900">Questions du sondage</p>
            <p className="mb-4 text-sm text-slate-500">Ajoutez les questions qui seront présentées aux participants.</p>
            <QuestionsEditor questions={questions} setQuestions={setQuestions} eligibilite={false} />
          </div>}

          {/* ── Section 3 : test d'éligibilité ── */}
          {step === 3 && <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="mb-1 text-base font-bold text-slate-900">Test de présélection</p>
            <p className="mb-4 text-sm text-slate-500">Déterminez si le participant correspond au profil recherché.</p>
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
          </div>}

          {step === 4 && (
            <div>
              <p className="mb-1 text-base font-bold text-slate-900">Vérifiez avant de créer</p>
              <p className="mb-5 text-sm text-slate-500">Un dernier contrôle des informations importantes.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sondage</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{form.titre}</p>
                  <p className="mt-1 text-sm text-slate-500">{form.description || 'Aucune description'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Participation</p>
                  <p className="mt-2 font-bold text-slate-900">{form.quotaVise} répondants visés</p>
                  <p className="text-sm text-slate-500">{questions.length} question{questions.length > 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Récompense</p>
                  <p className="mt-2 font-bold text-slate-900">{fmt(form.recompense)} {form.typeRecompense === 'ARGENT' ? 'FCFA' : 'points'}</p>
                  <p className="text-sm text-slate-500">Validation {form.modeDistribution === 'AUTO' ? 'automatique' : 'manuelle'}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Présélection</p>
                  <p className="mt-2 font-bold text-slate-900">{eligTitre || `Test d’éligibilité — ${form.titre}`}</p>
                  <p className="text-sm text-slate-600">{eligQuestions.length} question{eligQuestions.length > 1 ? 's' : ''} · seuil de réussite {form.seuilEligibilite}%</p>
                </div>
              </div>
            </div>
          )}

          {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
            <button type="button" onClick={step === 1 ? onClose : () => { setError(''); setStep(current => current - 1) }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
              {step > 1 && <ChevronLeft size={16} />} {step === 1 ? 'Annuler' : 'Précédent'}
            </button>
            {step < 4 ? (
              <button type="button" onClick={goNext}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800">
                Continuer <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800 disabled:opacity-60">
                {loading && <Loader2 size={14} className="animate-spin" />}
                Créer le sondage
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )

  return modal ? createPortal(content, document.body) : content
}

// ─── Formulaire dédié : éligibilité ──────────────────────────────────────────

function ConfigurerEligibiliteForm({ sondage, onClose, onSaved }) {
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
    <div className="mx-auto w-full max-w-4xl pb-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Configurer le test d'éligibilité</h3>
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{sondage.titre}</p>
          </div>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={15} /> Retour</button>
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

// ─── Formulaire dédié : modification ─────────────────────────────────────────

function ModifierSondageForm({ sondage, onClose, onSaved }) {
  const budgetVerrouille = sondage.statut !== 'BROUILLON'
  const [form, setForm] = useState({
    titre: sondage.titre || '',
    description: sondage.description || '',
    imageUrl: sondage.imageUrl || '',
    quotaVise: String(sondage.quotaVise || ''),
    recompense: String(sondage.recompense || ''),
    dateExpiration: sondage.dateExpiration ? sondage.dateExpiration.slice(0, 16) : '',
  })
  const [imageFile, setImageFile] = useState(null)
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
        imageUrl: imageFile ? undefined : (form.imageUrl || undefined),
        description: form.description || undefined,
        quotaVise: !budgetVerrouille && form.quotaVise ? Number(form.quotaVise) : undefined,
        recompense: !budgetVerrouille && form.recompense ? Number(form.recompense) : undefined,
        dateExpiration: form.dateExpiration ? new Date(form.dateExpiration).toISOString() : undefined,
      })
      if (imageFile) {
        await uploadSondageImage(sondage.id, imageFile)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Modifier le sondage</h3>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={15} /> Retour</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {budgetVerrouille && <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-800"><strong>Sondage déjà activé.</strong> Le titre, la description, l’image et l’expiration restent modifiables. Le quota et la récompense sont verrouillés car le budget a déjà été réservé.</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input value={form.titre} onChange={e => setField('titre', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3}
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Image de couverture</label>
            {form.imageUrl && (
              <img src={form.imageUrl} alt="Aperçu" className="mb-2 h-24 w-full rounded-xl object-cover border border-slate-200" />
            )}
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={e => {
                  setField('imageUrl', e.target.value)
                  setImageFile(null)
                }}
                className={inputCls}
              />
              <div className="relative overflow-hidden rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer flex-shrink-0 transition-colors">
                <span className="flex items-center gap-1"><Plus size={16} /> Fichier</span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={e => {
                    const file = e.target.files[0]
                    if (file) {
                      setImageFile(file)
                      setField('imageUrl', URL.createObjectURL(file))
                    }
                  }}
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-400">Collez un lien direct ou uploadez un fichier image.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Quota visé</label>
              <input type="number" min="1" disabled={budgetVerrouille} value={form.quotaVise} onChange={e => setField('quotaVise', e.target.value)} className={inputCls + ' disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Récompense (FCFA)</label>
              <input type="number" min="0" disabled={budgetVerrouille} value={form.recompense} onChange={e => setField('recompense', e.target.value)} className={inputCls + ' disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'} />
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

// ─── Page de validation des réponses ─────────────────────────────────────────

function ReponsesSondageContent({ sondageId, onClose, onChanged }) {
  const [reponses, setReponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [filtrePreuve, setFiltrePreuve] = useState('TOUTES')
  const [triReponses, setTriReponses] = useState('RECENTES')
  const [pageReponses, setPageReponses] = useState(1)
  const pageSizeReponses = 5

  const load = () => {
    setLoading(true)
    getReponsesAValider(sondageId)
      .then(setReponses)
      .catch(() => setError('Impossible de charger les réponses'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    getReponsesAValider(sondageId)
      .then(data => { if (!cancelled) setReponses(data) })
      .catch(() => { if (!cancelled) setError('Impossible de charger les réponses') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sondageId])

  const handle = async (reponseId, approuve) => {
    const reponse = reponses.find(item => item.id === reponseId)
    const action = approuve ? 'valider et rémunérer' : 'rejeter'
    if (!window.confirm(`Confirmer : ${action} la réponse de ${reponse?.participantNom || 'ce participant'} ? Cette décision est définitive.`)) return
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

  const rechercheNormalisee = recherche.trim().toLocaleLowerCase('fr')
  const reponsesFiltrees = [...reponses]
    .filter(reponse => {
      const aUnePreuve = Boolean(reponse.fichierPreuve)
      if (filtrePreuve === 'AVEC' && !aUnePreuve) return false
      if (filtrePreuve === 'SANS' && aUnePreuve) return false
      if (!rechercheNormalisee) return true

      const contenu = [
        reponse.participantNom,
        reponse.participantContact,
        ...(reponse.details || []).flatMap(detail => [detail.question, detail.reponse]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fr')
      return contenu.includes(rechercheNormalisee)
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return triReponses === 'ANCIENNES' ? dateA - dateB : dateB - dateA
    })

  const totalPagesReponses = Math.max(1, Math.ceil(reponsesFiltrees.length / pageSizeReponses))
  const pageReponsesActive = Math.min(pageReponses, totalPagesReponses)
  const debutPageReponses = (pageReponsesActive - 1) * pageSizeReponses
  const reponsesPage = reponsesFiltrees.slice(debutPageReponses, debutPageReponses + pageSizeReponses)

  useEffect(() => {
    setPageReponses(1)
    setExpandedId(null)
  }, [recherche, filtrePreuve, triReponses])

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-950">Réponses à valider</h3>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={15} /> Retour</button>
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
            <div className="space-y-4">
              <section aria-label="Filtres des réponses" className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_170px_170px]">
                  <label className="relative">
                    <span className="sr-only">Rechercher dans les réponses</span>
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={recherche}
                      onChange={event => setRecherche(event.target.value)}
                      placeholder="Participant, téléphone ou réponse…"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </label>
                  <select value={filtrePreuve} onChange={event => setFiltrePreuve(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-violet-400">
                    <option value="TOUTES">Toutes les preuves</option>
                    <option value="AVEC">Avec justificatif</option>
                    <option value="SANS">Sans justificatif</option>
                  </select>
                  <select value={triReponses} onChange={event => setTriReponses(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-violet-400">
                    <option value="RECENTES">Plus récentes</option>
                    <option value="ANCIENNES">Plus anciennes</option>
                  </select>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-500">{reponsesFiltrees.length} dossier{reponsesFiltrees.length > 1 ? 's' : ''} à examiner</p>
                  {(recherche || filtrePreuve !== 'TOUTES' || triReponses !== 'RECENTES') && (
                    <button type="button" onClick={() => { setRecherche(''); setFiltrePreuve('TOUTES'); setTriReponses('RECENTES') }} className="text-[11px] font-bold text-violet-700 hover:underline">Réinitialiser les filtres</button>
                  )}
                </div>
              </section>

              {reponsesFiltrees.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <Search size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Aucune réponse ne correspond aux filtres</p>
                  <button type="button" onClick={() => { setRecherche(''); setFiltrePreuve('TOUTES'); setTriReponses('RECENTES') }} className="mt-2 text-xs font-bold text-violet-700 hover:underline">Afficher tous les dossiers</button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
              {reponsesPage.map(r => (
                <article key={r.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link to={r.participantId ? `/utilisateurs/${r.participantId}` : '#'} className="text-sm font-bold text-slate-800 hover:text-violet-700 hover:underline">{r.participantNom || '—'} →</Link>
                      <p className="text-xs text-slate-400 truncate">{r.participantContact || '—'} · {formatDatetime(r.createdAt)}</p>
                      <p className={`mt-1 text-[10px] font-bold ${r.fichierPreuve ? 'text-emerald-600' : 'text-amber-600'}`}>{r.fichierPreuve ? 'Preuve jointe' : 'Aucune preuve jointe'}</p>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                      <button onClick={() => setExpandedId(current => current === r.id ? null : r.id)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Eye size={13} className="mr-1 inline" />{expandedId === r.id ? 'Réduire' : 'Examiner'}</button>
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
                  {expandedId === r.id && <div className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-[minmax(0,1fr)_260px]">
                    <div><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Réponses fournies</p><div className="space-y-2">{(r.details || []).map((detail, index) => <div key={`${detail.questionId}-${index}`} className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-bold text-slate-700"><span className="mr-1 text-slate-400">{String(detail.ordre).padStart(2, '0')}.</span>{detail.question}</p><p className="mt-1 text-sm text-slate-600">{detail.reponse || 'Aucune réponse'}</p></div>)}</div></div>
                    <aside>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Justificatif</p>
                        {r.fichierPreuve && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">{preuveEstPdf(r.fichierPreuve) ? 'PDF' : 'Image'}</span>}
                      </div>
                      <JustificatifPreuve key={r.id} reponse={r} />
                    </aside>
                  </div>}
                </article>
              ))}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <Pagination page={pageReponsesActive} totalItems={reponsesFiltrees.length} pageSize={pageSizeReponses} onPageChange={page => { setPageReponses(page); setExpandedId(null) }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page de résultats ────────────────────────────────────────────────────────

function ResultatsSondageContent({ sondageId, onClose }) {
  const [resultats, setResultats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [repondants, setRepondants] = useState([])
  const [loadingRepondants, setLoadingRepondants] = useState(true)
  const [periode, setPeriode] = useState('TOUT')
  const [rechercheRepondant, setRechercheRepondant] = useState('')
  const [statutRepondant, setStatutRepondant] = useState('TOUS')
  const [pageRepondants, setPageRepondants] = useState(1)
  const pageSizeRepondants = 10

  useEffect(() => {
    getSondageResultats(sondageId)
      .then(setResultats)
      .catch(() => setError('Impossible de charger les résultats'))
      .finally(() => setLoading(false))
  }, [sondageId])

  useEffect(() => {
    getRepondantsSondage(sondageId)
      .then(setRepondants)
      .catch(() => setRepondants([]))
      .finally(() => setLoadingRepondants(false))
  }, [sondageId])

  const limitePeriode = periode === '7J' ? 7 : periode === '30J' ? 30 : null
  const repondantsPeriode = repondants.filter(item => !limitePeriode || (REFERENCE_TEMPS - new Date(item.createdAt).getTime()) <= limitePeriode * 86400000)
  const rechercheNormalisee = rechercheRepondant.trim().toLocaleLowerCase('fr')
  const repondantsFiltres = repondantsPeriode.filter(item => {
    const correspondStatut = statutRepondant === 'TOUS' || item.statutValidation === statutRepondant
    const correspondRecherche = !rechercheNormalisee
      || [item.participantNom, item.participantContact].some(value => String(value || '').toLocaleLowerCase('fr').includes(rechercheNormalisee))
    return correspondStatut && correspondRecherche
  })
  const totalPagesRepondants = Math.max(1, Math.ceil(repondantsFiltres.length / pageSizeRepondants))
  const pageRepondantsActive = Math.min(pageRepondants, totalPagesRepondants)
  const repondantsPage = repondantsFiltres.slice(
    (pageRepondantsActive - 1) * pageSizeRepondants,
    pageRepondantsActive * pageSizeRepondants,
  )
  const repartitionValidation = ['VALIDE', 'EN_ATTENTE_PREUVE', 'REJETE'].map(statut => ({
    statut,
    label: STATUT_VALIDATION_LABEL[statut],
    count: repondantsPeriode.filter(item => item.statutValidation === statut).length,
  }))

  useEffect(() => {
    setPageRepondants(1)
  }, [periode, rechercheRepondant, statutRepondant])

  const exporterCsv = () => {
    if (!resultats) return
    const echapper = value => `"${String(value ?? '').replaceAll('"', '""')}"`
    const lignes = [['Question', 'Type', 'Réponse', 'Nombre', 'Pourcentage']]
    resultats.resultatsParQuestion.forEach(question => {
      if (question.repartition) question.repartition.forEach(option => lignes.push([question.texte, TYPE_Q[question.typeQuestion] || question.typeQuestion, option.libelle, option.count, option.pourcentage]))
      if (question.verbatims) question.verbatims.forEach(verbatim => lignes.push([question.texte, TYPE_Q[question.typeQuestion] || question.typeQuestion, verbatim, 1, '']))
    })
    const csv = '\uFEFF' + lignes.map(ligne => ligne.map(echapper).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const lien = document.createElement('a')
    lien.href = url
    lien.download = `resultats-${resultats.titre.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`
    lien.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
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
          <div className="flex flex-wrap gap-2">
            <button onClick={exporterCsv} disabled={!resultats} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-40"><BarChart3 size={14} className="mr-1 inline" />Exporter CSV</button>
            <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={15} /> Retour</button>
          </div>
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-black text-slate-900">Qualité et activité des réponses</p><p className="text-[11px] text-slate-400">Répartition des décisions pour la période sélectionnée</p></div>
                  <select value={periode} onChange={event => setPeriode(event.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"><option value="TOUT">Toute la période</option><option value="7J">7 derniers jours</option><option value="30J">30 derniers jours</option></select>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">{repartitionValidation.map(item => { const pct = repondantsPeriode.length ? Math.round(item.count * 100 / repondantsPeriode.length) : 0; return <div key={item.statut} className="rounded-xl bg-white p-3"><div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-600">{item.label}</span><strong className="text-slate-900">{item.count}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.statut === 'VALIDE' ? 'bg-emerald-500' : item.statut === 'REJETE' ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} /></div><p className="mt-1 text-right text-[10px] text-slate-400">{pct}%</p></div> })}</div>
              </div>

              {/* Par question */}
              <div className="space-y-4">
                {resultats.resultatsParQuestion.map(q => (
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
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Répondants</h4>
                  <p className="text-[11px] text-slate-500">{repondantsFiltres.length} résultat{repondantsFiltres.length > 1 ? 's' : ''}{repondantsFiltres.length !== repondants.length ? ` sur ${repondants.length}` : ''}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px] lg:w-[520px]">
                  <label className="relative">
                    <span className="sr-only">Rechercher un répondant</span>
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={rechercheRepondant} onChange={event => setRechercheRepondant(event.target.value)} placeholder="Nom ou téléphone…" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                  </label>
                  <select value={statutRepondant} onChange={event => setStatutRepondant(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-violet-400">
                    <option value="TOUS">Tous les statuts</option>
                    <option value="VALIDE">Validées</option>
                    <option value="EN_ATTENTE_PREUVE">À vérifier</option>
                    <option value="REJETE">Non retenues</option>
                  </select>
                </div>
              </div>
            </div>
            {loadingRepondants ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-violet-500" />
              </div>
            ) : repondantsFiltres.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Users size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Aucun répondant trouvé</p>
                <button type="button" onClick={() => { setRechercheRepondant(''); setStatutRepondant('TOUS') }} className="mt-2 text-xs font-bold text-violet-700 hover:underline">Réinitialiser la recherche</button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                {repondantsPage.map(r => (
                  <div key={r.id} className="flex flex-col gap-2 px-4 py-3 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link to={r.participantId ? `/utilisateurs/${r.participantId}` : '#'} className="inline-flex items-center gap-1 text-sm font-bold text-slate-800 hover:text-violet-700 hover:underline">{r.participantNom || '—'} <span aria-hidden="true" className="text-violet-500">→</span></Link>
                      <p className="text-xs text-slate-400 truncate">{r.participantContact || '—'} · {formatDatetime(r.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:justify-end">
                      {r.recompenseVersee && (
                        <span className="text-[10px] font-semibold text-emerald-600">Récompense versée</span>
                      )}
                      <Badge color={STATUT_VALIDATION_COLOR[r.statutValidation] || 'gray'}>
                        {STATUT_VALIDATION_LABEL[r.statutValidation] || r.statutValidation}
                      </Badge>
                      {r.statutValidation === 'EN_ATTENTE_PREUVE' && <Link to={`/sondages/${sondageId}/reponses`} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100">Vérifier</Link>}
                    </div>
                  </div>
                ))}
                </div>
                <Pagination page={pageRepondantsActive} totalItems={repondantsFiltres.length} pageSize={pageSizeRepondants} onPageChange={setPageRepondants} />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ─── SondageCard ─────────────────────────────────────────────────────────────

function SondageCard({ survey, actionId, onActiver, onDistribuer, onCloturer, onModifier, onSupprimer, onVoirDetail, onVoirReponses, onConfigurerElig, onVoirResultats }) {
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
      <div className="p-4">
        <div className="flex flex-wrap items-start gap-3 mb-2">
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
              <p className="mt-1 text-xs text-slate-500 line-clamp-1">{survey.description}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="relative flex flex-shrink-0 gap-2" ref={actionsRef}>
            {(survey.reponsesAValider || 0) > 0 ? <button onClick={() => onVoirReponses(survey.id)} className="h-10 rounded-xl bg-amber-50 px-3 text-xs font-bold text-amber-700 hover:bg-amber-100">{survey.reponsesAValider} à vérifier</button> : <button onClick={() => onVoirDetail(survey.id)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Voir la fiche</button>}
            <button onClick={() => setActionsOpen(v => !v)} aria-expanded={actionsOpen} aria-haspopup="menu"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700">
              Actions {actionsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {actionsOpen && <div role="menu" aria-label={`Actions pour ${survey.titre}`} className="absolute right-0 top-12 z-20 w-64 space-y-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lift [&>button]:min-h-9 [&>button]:w-full [&>button]:justify-start [&>button]:rounded-xl">
            <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Actions disponibles</p>
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
                <div className="my-1 border-t border-slate-100" />
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition">
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
                <button onClick={() => onVoirReponses(survey.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition">
                  <Eye size={12} /> Réponses
                </button>
                <button onClick={() => onModifier(survey)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition">
                  <Edit2 size={12} /> Modifier
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button onClick={() => onCloturer(survey.id)}
                  disabled={isActing('-cloturer')}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
                  title="Arrête définitivement la collecte de nouvelles réponses">
                  {isActing('-cloturer') ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
                  Clôturer la collecte
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
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
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
            {survey.questions.map(q => (
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

function useSondageRoute() {
  const { id } = useParams()
  const [sondage, setSondage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getAdminSondage(id)
      .then(item => { if (!cancelled) setSondage(item) })
      .catch(() => { if (!cancelled) setSondage(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return { id, sondage, loading }
}

function SondageRouteLoading() {
  return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-violet-600" /></div>
}

export function DetailSondagePage() {
  const navigate = useNavigate()
  const { sondage, loading } = useSondageRoute()
  const [repondants, setRepondants] = useState([])

  useEffect(() => {
    if (!sondage?.id) return
    getRepondantsSondage(sondage.id).then(setRepondants).catch(() => setRepondants([]))
  }, [sondage?.id])

  if (loading) return <SondageRouteLoading />
  if (!sondage) return <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Sondage introuvable.</p>

  const cfg = STATUT_CONFIG[sondage.statut] || STATUT_CONFIG.BROUILLON
  const progression = sondage.quotaVise ? Math.min(100, Math.round((sondage.repondantsActuels / sondage.quotaVise) * 100)) : 0
  const valides = repondants.filter(item => item.statutValidation === 'VALIDE').length
  const rejetes = repondants.filter(item => item.statutValidation === 'REJETE').length

  return (
    <div className="space-y-4 pb-8">
      <button onClick={() => navigate('/sondages')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-700"><ArrowLeft size={15} /> Retour aux sondages</button>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[260px_1fr]">
          <div className="h-48 bg-slate-100 lg:h-full lg:min-h-56">
            {sondage.imageUrl ? <img src={mediaUrl(sondage.imageUrl)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ClipboardList size={42} className="text-slate-300" /></div>}
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2"><Badge color={cfg.color}>{cfg.label}</Badge><Badge color="gray">{MODE_LABEL[sondage.modeDistribution]}</Badge><Badge color="gray">{RECOMPENSE_LABEL[sondage.typeRecompense]}</Badge></div>
                <h2 className="text-2xl font-black leading-tight text-slate-950">{sondage.titre}</h2>
                {sondage.description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{sondage.description}</p>}
                <p className="mt-3 text-xs font-semibold text-indigo-600">{sondage.commanditaireNom ? `${sondage.commanditaireNom}${sondage.commanditaireSociete ? ` · ${sondage.commanditaireSociete}` : ''}` : 'Sondage interne'}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button onClick={() => navigate(`/sondages/${sondage.id}/modifier`)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Edit2 size={13} className="mr-1 inline" />Modifier</button>
                <button onClick={() => navigate(`/sondages/${sondage.id}/resultats`)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"><BarChart3 size={13} className="mr-1 inline" />Résultats</button>
              </div>
            </div>
            <div className="mt-5"><ProgressBar value={progression} color={progression >= 100 ? 'emerald' : 'violet'} className="h-2" /><p className="mt-1 text-right text-[11px] font-semibold text-slate-400">{progression}% du quota</p></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Répondants', `${sondage.repondantsActuels}/${sondage.quotaVise}`, 'text-slate-950'],
          ['À valider', sondage.reponsesAValider || 0, (sondage.reponsesAValider || 0) > 0 ? 'text-amber-600' : 'text-slate-950'],
          ['Validées', valides, 'text-emerald-600'],
          ['Rejetées', rejetes, 'text-rose-600'],
          ['Budget restant', `${fmt(sondage.budgetRestant || 0)} FCFA`, 'text-violet-700'],
          ['Expiration', formatDate(sondage.dateExpiration), 'text-slate-950'],
        ].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-2 text-base font-black ${color}`}>{value}</p></div>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-black text-slate-900">Questions du sondage</h3><Badge color="gray">{sondage.questions?.length || 0} questions</Badge></div>
          <div className="space-y-2">{(sondage.questions || []).map(q => <div key={q.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold text-slate-800"><span className="mr-2 text-slate-400">{String(q.ordre).padStart(2, '0')}.</span>{q.texte}</p><span className="shrink-0 text-[10px] font-bold text-slate-400">{TYPE_Q[q.typeQuestion]}</span></div>{q.options?.length > 0 && <p className="mt-2 text-xs text-slate-500">{q.options.map(o => o.libelle).join(' · ')}</p>}</div>)}</div>
        </div>
        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-black text-slate-900">Pilotage</h3><div className="mt-3 grid gap-2">
            {(sondage.reponsesAValider || 0) > 0 && <button onClick={() => navigate(`/sondages/${sondage.id}/reponses`)} className="rounded-xl bg-amber-50 px-3 py-2.5 text-left text-xs font-bold text-amber-700">Vérifier {sondage.reponsesAValider} réponse(s)</button>}
            {!sondage.hasEligibilite && <button onClick={() => navigate(`/sondages/${sondage.id}/eligibilite`)} className="rounded-xl bg-violet-50 px-3 py-2.5 text-left text-xs font-bold text-violet-700">Configurer l’éligibilité</button>}
            <button onClick={() => navigate(`/sondages/${sondage.id}/resultats`)} className="rounded-xl bg-slate-100 px-3 py-2.5 text-left text-xs font-bold text-slate-700">Analyser les résultats</button>
          </div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-black text-slate-900">Cadre financier</h3><div className="mt-3 space-y-2 text-xs text-slate-500"><p className="flex justify-between"><span>Récompense</span><strong className="text-slate-900">{fmt(sondage.recompense)} {sondage.typeRecompense === 'POINTS' ? 'points' : 'FCFA'}</strong></p><p className="flex justify-between"><span>Budget réservé</span><strong className="text-slate-900">{fmt(sondage.budgetReserve || 0)} FCFA</strong></p><p className="flex justify-between"><span>Distribué</span><strong className="text-slate-900">{fmt(sondage.budgetDistribue || 0)} FCFA</strong></p></div></div>
        </aside>
      </section>
    </div>
  )
}

export function NouveauSondagePage() {
  const navigate = useNavigate()
  return <NouveauSondageForm onClose={() => navigate('/sondages')} onSaved={() => navigate('/sondages')} />
}

export function ModifierSondagePage() {
  const navigate = useNavigate()
  const { sondage, loading } = useSondageRoute()
  if (loading) return <SondageRouteLoading />
  if (!sondage) return <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Sondage introuvable.</p>
  return <ModifierSondageForm sondage={sondage} onClose={() => navigate('/sondages')} onSaved={() => navigate('/sondages')} />
}

export function EligibiliteSondagePage() {
  const navigate = useNavigate()
  const { sondage, loading } = useSondageRoute()
  if (loading) return <SondageRouteLoading />
  if (!sondage) return <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Sondage introuvable.</p>
  return <ConfigurerEligibiliteForm sondage={sondage} onClose={() => navigate('/sondages')} onSaved={() => navigate('/sondages')} />
}

export function ReponsesSondagePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  return <ReponsesSondageContent sondageId={id} onClose={() => navigate('/sondages')} onChanged={() => undefined} />
}

export function ResultatsSondagePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  return <ResultatsSondageContent sondageId={id} onClose={() => navigate('/sondages')} />
}

// ─── Sondages (main) ─────────────────────────────────────────────────────────

export default function Sondages() {
  const navigate = useNavigate()
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
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)

  const fetchData = () => {
    setLoading(true)
    getAdminSondages()
      .then(setSondages)
      .catch(() => setSondages([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    getAdminSondages()
      .then(data => { if (!cancelled) setSondages(data) })
      .catch(() => { if (!cancelled) setSondages([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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

  const handleActiver = (id) => {
    const sondage = sondages.find(item => item.id === id)
    if (!window.confirm(`Activer « ${sondage?.titre || 'ce sondage'} » et réserver son budget ?`)) return
    act(id, '-activer', () => activerSondage(id))
  }
  const handleDistribuer = (id) => {
    const sondage = sondages.find(item => item.id === id)
    if (!window.confirm(`Finaliser définitivement « ${sondage?.titre || 'ce sondage'} », distribuer les récompenses dues et libérer le reliquat ?`)) return
    act(id, '-distribuer', () => distribuerSondage(id))
  }
  const handleCloturer = (id) => {
    const sondage = sondages.find(item => item.id === id)
    if (!window.confirm(`Fermer « ${sondage?.titre || 'ce sondage'} » aux nouvelles réponses ? Les validations en attente devront encore être traitées.`)) return
    act(id, '-cloturer', () => cloturerSondage(id))
  }
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
  useEffect(() => setPage(1), [filtre, search, modeFilter, rewardFilter, sort])
  const sondagesPage = sondagesFiltres.slice((page - 1) * 10, page * 10)
  const reponsesAValiderTotal = sondages.reduce((total, item) => total + Number(item.reponsesAValider || 0), 0)
  const budgetReserveTotal = sondages.reduce((total, item) => total + Number(item.budgetReserve || 0), 0)
  const budgetRestantTotal = sondages.reduce((total, item) => total + Number(item.budgetRestant || 0), 0)
  const expirationProche = sondages.filter(item => item.statut === 'ACTIF' && new Date(item.dateExpiration).getTime() > REFERENCE_TEMPS && new Date(item.dateExpiration).getTime() - REFERENCE_TEMPS <= 7 * 86400000).length
  const progressionMoyenne = sondages.length ? Math.round(sondages.reduce((total, item) => total + (item.quotaVise ? Math.min(100, Number(item.repondantsActuels || 0) * 100 / item.quotaVise) : 0), 0) / sondages.length) : 0

  return (
    <div className="space-y-5">
      {/* ── En-tête compact ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span><strong className="text-slate-900">{sondages.length}</strong> sondage{sondages.length !== 1 ? 's' : ''}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span><strong className="text-sky-600">{countByStatut('ACTIF')}</strong> en cours</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span><strong className="text-amber-600">{countByStatut('EN_ATTENTE_DISTRIBUTION')}</strong> à finaliser</span>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-800 sm:w-auto">
          <Plus size={15} /> Nouveau sondage
        </button>
      </div>

      <section aria-label="Indicateurs décisionnels" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['À vérifier', reponsesAValiderTotal, reponsesAValiderTotal > 0 ? 'text-amber-600' : 'text-slate-900'],
          ['Budget réservé', `${fmt(budgetReserveTotal)} FCFA`, 'text-violet-700'],
          ['Budget restant', `${fmt(budgetRestantTotal)} FCFA`, 'text-emerald-700'],
          ['Expiration < 7 jours', expirationProche, expirationProche > 0 ? 'text-rose-600' : 'text-slate-900'],
          ['Progression moyenne', `${progressionMoyenne}%`, 'text-sky-700'],
        ].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-2 text-lg font-black ${color}`}>{value}</p></div>)}
      </section>

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
        <><div className="space-y-3">
          {sondagesPage.map(survey => (
            <SondageCard
              key={survey.id}
              survey={survey}
              actionId={actionId}
              onActiver={handleActiver}
              onDistribuer={handleDistribuer}
              onCloturer={handleCloturer}
              onModifier={survey => navigate(`/sondages/${survey.id}/modifier`)}
              onSupprimer={handleSupprimer}
              onVoirDetail={id => navigate(`/sondages/${id}`)}
              onVoirReponses={id => navigate(`/sondages/${id}/reponses`)}
              onConfigurerElig={survey => navigate(`/sondages/${survey.id}/eligibilite`)}
              onVoirResultats={id => navigate(`/sondages/${id}/resultats`)}
            />
          ))}
        </div><Pagination page={page} totalItems={sondagesFiltres.length} onPageChange={setPage} /></>
      )}

      {createOpen && (
        <NouveauSondageForm
          modal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
