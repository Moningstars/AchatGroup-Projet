import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { getKycStatus, soumettreKyc } from '../services/api'

const STEPS = ['Informations', 'En examen', 'Vérifié']

const TYPE_PIECE_OPTIONS = [
  { value: 'CNI',              label: "Carte Nationale d'Identité" },
  { value: 'PASSEPORT',        label: 'Passeport' },
  { value: 'PERMIS_CONDUIRE',  label: 'Permis de conduire' },
  { value: 'TITRE_SEJOUR',     label: 'Titre de séjour' },
]

const SOURCE_REVENUS_OPTIONS = [
  { value: 'SALARIE',     label: 'Salarié(e)' },
  { value: 'INDEPENDANT', label: 'Travailleur(se) indépendant(e)' },
  { value: 'ETUDIANT',    label: 'Étudiant(e)' },
  { value: 'RETRAITE',    label: 'Retraité(e)' },
  { value: 'SANS_EMPLOI', label: 'Sans emploi' },
  { value: 'AUTRE',       label: 'Autre' },
]

const todayIso = () => {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function StepBar({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
              i < step ? 'bg-success text-white' : i === step ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <i className="ti ti-check text-sm" /> : i + 1}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${i === step ? 'text-primary' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 h-0.5 mb-5 ${i < step ? 'bg-success' : 'bg-gray-100'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Field({ label, name, type = 'text', value, onChange, required, placeholder, error, ...inputProps }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
        {label}{required && <span className="text-urgency ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...inputProps}
        className={`w-full bg-bg-light border-2 rounded-2xl px-4 py-3 text-sm font-semibold text-primary placeholder-gray-300 focus:outline-none transition-all ${
          error ? 'border-urgency focus:border-urgency' : 'border-gray-100 focus:border-primary'
        }`}
      />
      {error && <p className="text-[11px] font-bold text-urgency">{error}</p>}
    </div>
  )
}

function Select({ label, name, value, onChange, options, required, error, placeholder = 'Sélectionner...' }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
        {label}{required && <span className="text-urgency ml-0.5">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full bg-bg-light border-2 rounded-2xl px-4 py-3 text-sm font-semibold text-primary focus:outline-none transition-all appearance-none ${
          error ? 'border-urgency focus:border-urgency' : 'border-gray-100 focus:border-primary'
        } ${!value ? 'text-gray-400' : 'text-primary'}`}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-[11px] font-bold text-urgency">{error}</p>}
    </div>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-100">
      <i className={`ti ${icon} text-primary text-base`} />
      <h3 className="font-heading font-extrabold text-sm text-primary uppercase tracking-widest">{title}</h3>
    </div>
  )
}

const EMPTY_FORM = {
  nom: '', prenom: '', dateNaissance: '', lieuNaissance: '', nationalite: '',
  typePiece: '', numeroPiece: '', dateExpirationPiece: '',
  email: '', adresse: '', ville: '', pays: '',
  profession: '', sourceRevenus: '',
}

export default function Verification() {
  const navigate = useNavigate()
  const [kycStatus, setKycStatus]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [loadError, setLoadError]   = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    getKycStatus()
      .then(data => {
        setKycStatus(data)
        if (data.dejaSoumis) {
          setForm({
            nom:                data.nom               || '',
            prenom:             data.prenom            || '',
            dateNaissance:      data.dateNaissance     || '',
            lieuNaissance:      data.lieuNaissance     || '',
            nationalite:        data.nationalite       || '',
            typePiece:          data.typePiece         || '',
            numeroPiece:        data.numeroPiece       || '',
            dateExpirationPiece: data.dateExpirationPiece || '',
            email:              data.email             || '',
            adresse:            data.adresse           || '',
            ville:              data.ville             || '',
            pays:               data.pays              || '',
            profession:         data.profession        || '',
            sourceRevenus:      data.sourceRevenus     || '',
          })
        }
      })
      .catch(() => setLoadError('Impossible de récupérer votre statut KYC. Vérifiez votre connexion puis réessayez.'))
      .finally(() => setLoading(false))
  }, [])

  const onChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setFieldErrors(fe => ({ ...fe, [e.target.name]: '' }))
  }

  const valider = () => {
    const errs = {}
    if (!form.nom.trim())           errs.nom           = 'Champ obligatoire'
    if (!form.prenom.trim())        errs.prenom        = 'Champ obligatoire'
    if (!form.lieuNaissance.trim()) errs.lieuNaissance = 'Champ obligatoire'
    if (!form.nationalite.trim())   errs.nationalite   = 'Champ obligatoire'

    if (!form.dateNaissance) {
      errs.dateNaissance = 'Champ obligatoire'
    } else {
      const naissance = new Date(form.dateNaissance)
      const majorite  = new Date(naissance.getFullYear() + 18, naissance.getMonth(), naissance.getDate())
      if (majorite > new Date()) errs.dateNaissance = 'Vous devez avoir au moins 18 ans'
    }

    if (!form.typePiece)            errs.typePiece          = 'Sélectionnez un type de pièce'
    if (!form.numeroPiece.trim())   errs.numeroPiece        = 'Champ obligatoire'
    if (!form.dateExpirationPiece) {
      errs.dateExpirationPiece = 'Champ obligatoire'
    } else if (form.dateExpirationPiece < todayIso()) {
      errs.dateExpirationPiece = 'Votre pièce est expirée'
    }

    if (!form.email.trim()) errs.email = 'Champ obligatoire'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Adresse email invalide'
    if (!form.adresse.trim())       errs.adresse = 'Champ obligatoire'
    if (!form.ville.trim())         errs.ville   = 'Champ obligatoire'
    if (!form.pays.trim())          errs.pays    = 'Champ obligatoire'

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errs = valider()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      const first = document.querySelector('.border-urgency')
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    try {
      const updated = await soumettreKyc({
        ...form,
        dateNaissance:       form.dateNaissance       || null,
        dateExpirationPiece: form.dateExpirationPiece || null,
        typePiece:           form.typePiece           || null,
        sourceRevenus:       form.sourceRevenus       || null,
      })
      setKycStatus(updated)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light">
      <Loader2 size={36} className="animate-spin text-primary" />
    </div>
  )

  if (loadError) return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light px-5">
      <div className="w-full max-w-md rounded-3xl border-2 border-red-100 bg-white p-7 text-center shadow-sm">
        <i className="ti ti-cloud-off text-4xl text-urgency" />
        <h1 className="mt-4 font-heading text-xl font-extrabold text-primary">Statut KYC indisponible</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">{loadError}</p>
        <button onClick={() => window.location.reload()} className="mt-5 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white">
          Réessayer
        </button>
      </div>
    </div>
  )

  const niveau = kycStatus?.niveauVerification || 'AUCUN'
  const currentStep = niveau === 'AUCUN' || niveau === 'REJETE' ? 0
    : niveau === 'EN_ATTENTE' ? 1 : 2

  return (
    <div className="min-h-screen bg-bg-light pb-28">

      {/* Header */}
      <div className="sticky top-0 z-40 glass-header border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-bg-light flex items-center justify-center text-primary hover:bg-gray-200/60 transition-colors">
            <i className="ti ti-arrow-left text-lg" />
          </button>
          <div>
            <h1 className="font-heading font-extrabold text-lg text-primary leading-none">Vérification d'identité</h1>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">Débloquez les retraits et fonctionnalités avancées</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-8">

        <StepBar step={currentStep} />

        {/* ── Statut VERIFIE ── */}
        {niveau === 'VERIFIE' && (
          <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto shadow-lg shadow-success/20">
              <i className="ti ti-circle-check text-5xl text-white" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-2xl text-primary">Identité vérifiée</h2>
              <p className="text-sm text-gray-500 font-semibold mt-2">
                Votre compte est entièrement vérifié. Vous pouvez effectuer des retraits sans restriction.
              </p>
            </div>
            <button onClick={() => navigate('/portefeuille')} className="bg-primary text-white font-black text-sm px-8 py-3 rounded-2xl active:scale-95 transition-transform">
              Accéder au portefeuille
            </button>
          </div>
        )}

        {/* ── Statut EN_ATTENTE ── */}
        {niveau === 'EN_ATTENTE' && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <i className="ti ti-clock-hour-4 text-5xl text-white" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-2xl text-primary">En cours d'examen</h2>
              <p className="text-sm text-gray-500 font-semibold mt-2">
                Votre dossier est en cours de vérification. Vous serez notifié dès qu'une décision sera prise.
              </p>
              {kycStatus?.nom && (
                <p className="text-xs text-blue-600 font-bold mt-3 bg-white/70 rounded-xl px-4 py-2 inline-block">
                  Soumis pour : {kycStatus.prenom} {kycStatus.nom}
                </p>
              )}
            </div>
            <button onClick={() => navigate(-1)} className="bg-white border-2 border-blue-200 text-blue-600 font-black text-sm px-8 py-3 rounded-2xl active:scale-95 transition-transform">
              Retour
            </button>
          </div>
        )}

        {/* ── Formulaire AUCUN / REJETE ── */}
        {(niveau === 'AUCUN' || niveau === 'REJETE') && (
          <div className="space-y-5">

            {niveau === 'REJETE' && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <i className="ti ti-circle-x text-urgency text-xl shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-sm text-urgency">Vérification rejetée</p>
                  <p className="text-xs text-red-600 font-semibold mt-0.5">
                    Votre précédente demande a été rejetée. Vous pouvez soumettre un nouveau dossier.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-4 flex items-start gap-3">
              <i className="ti ti-shield-lock text-primary text-xl shrink-0 mt-0.5" />
              <p className="text-xs text-primary font-semibold">
                Ces informations sont utilisées uniquement pour vérifier votre identité conformément aux exigences réglementaires. Elles ne seront jamais partagées avec des tiers.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

                {/* ── Section 1 : Identité ── */}
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-4">
                  <SectionTitle icon="ti-user-circle" title="Identité" />

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nom" name="nom" value={form.nom} onChange={onChange} required placeholder="Votre nom" error={fieldErrors.nom} />
                    <Field label="Prénom" name="prenom" value={form.prenom} onChange={onChange} required placeholder="Votre prénom" error={fieldErrors.prenom} />
                  </div>

                  <Field label="Date de naissance" name="dateNaissance" type="date" value={form.dateNaissance} onChange={onChange} required error={fieldErrors.dateNaissance} max={todayIso()} />

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Lieu de naissance" name="lieuNaissance" value={form.lieuNaissance} onChange={onChange} required placeholder="Ville de naissance" error={fieldErrors.lieuNaissance} />
                    <Field label="Nationalité" name="nationalite" value={form.nationalite} onChange={onChange} required placeholder="Ex: Togolaise" error={fieldErrors.nationalite} />
                  </div>
                </div>

                {/* ── Section 2 : Pièce d'identité ── */}
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-4">
                  <SectionTitle icon="ti-id-badge-2" title="Pièce d'identité" />

                  <Select
                    label="Type de pièce"
                    name="typePiece"
                    value={form.typePiece}
                    onChange={onChange}
                    options={TYPE_PIECE_OPTIONS}
                    required
                    error={fieldErrors.typePiece}
                  />

                  <Field label="Numéro de la pièce" name="numeroPiece" value={form.numeroPiece} onChange={onChange} required placeholder="Ex: TG-123456789" error={fieldErrors.numeroPiece} />

                  <Field label="Date d'expiration" name="dateExpirationPiece" type="date" value={form.dateExpirationPiece} onChange={onChange} required error={fieldErrors.dateExpirationPiece} min={todayIso()} />
                </div>

                {/* ── Section 3 : Coordonnées ── */}
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-4">
                  <SectionTitle icon="ti-map-pin" title="Coordonnées" />

                  <Field label="Email" name="email" type="email" value={form.email} onChange={onChange} required placeholder="votre@email.com" error={fieldErrors.email} />
                  <Field label="Adresse de résidence" name="adresse" value={form.adresse} onChange={onChange} required placeholder="Rue, quartier..." error={fieldErrors.adresse} />

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Ville" name="ville" value={form.ville} onChange={onChange} required placeholder="Ex: Lomé" error={fieldErrors.ville} />
                    <Field label="Pays" name="pays" value={form.pays} onChange={onChange} required placeholder="Ex: Togo" error={fieldErrors.pays} />
                  </div>
                </div>

                {/* ── Section 4 : Situation professionnelle ── */}
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-4">
                  <SectionTitle icon="ti-briefcase" title="Situation professionnelle" />
                  <p className="text-[11px] text-gray-400 font-semibold -mt-2">Optionnel — aide à la conformité réglementaire</p>

                  <Field label="Profession" name="profession" value={form.profession} onChange={onChange} placeholder="Votre métier" />

                  <Select
                    label="Source de revenus principale"
                    name="sourceRevenus"
                    value={form.sourceRevenus}
                    onChange={onChange}
                    options={SOURCE_REVENUS_OPTIONS}
                    error={fieldErrors.sourceRevenus}
                    placeholder="Sélectionner (optionnel)"
                  />
                </div>

              </div>

              {error && (
                <div className="p-4 bg-urgency/5 border border-urgency/10 rounded-2xl text-urgency text-xs font-bold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-white font-black text-sm py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</>
                  : <><i className="ti ti-send" /> Soumettre ma demande de vérification</>
                }
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
