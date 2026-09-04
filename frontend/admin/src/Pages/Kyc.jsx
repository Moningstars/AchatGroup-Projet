import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, ShieldCheck, ShieldX, X,
  User, Phone, Mail, MapPin, Briefcase, CreditCard, Calendar,
  Globe, Home, FileText, CheckCircle,
} from 'lucide-react'
import { Badge, Spinner, SearchInput } from '../components/ui'
import { getKycEnAttente, approuverKyc, rejeterKyc } from '../services/api'
import { usePusher } from '../context/PusherContext'

const NIVEAU_COLOR = { EN_ATTENTE: 'amber', VERIFIE: 'emerald', REJETE: 'rose', AUCUN: 'gray' }
const NIVEAU_LABEL = { EN_ATTENTE: 'En attente', VERIFIE: 'Vérifié', REJETE: 'Rejeté', AUCUN: 'Aucun' }

const AV_COLORS = ['bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700']

function avatarColor(nom) {
  return AV_COLORS[(nom || '?').charCodeAt(0) % AV_COLORS.length]
}

function initiales(nom, prenom) {
  return ((nom?.[0] || '') + (prenom?.[0] || '')).toUpperCase() || '?'
}

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
      <div className="w-6 h-6 flex-shrink-0 rounded-md bg-violet-50 flex items-center justify-center mt-0.5">
        <Icon size={12} className="text-violet-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-[12.5px] font-semibold text-slate-800 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

function DetailPanel({ demande, onClose, onApprouver, onRejeter, actionId }) {
  if (!demande) {
    return (
      <div className="flex min-h-72 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center shadow-soft">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
          <FileText size={20} className="text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Sélectionnez un dossier</p>
        <p className="text-xs text-slate-300 mt-1">Le détail s'affichera ici</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${avatarColor(demande.nom)}`}>
          {initiales(demande.nom, demande.prenom)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{demande.prenom} {demande.nom}</p>
          <p className="text-[11px] font-mono text-slate-400">{demande.telephone}</p>
        </div>
        <Badge color={NIVEAU_COLOR[demande.niveauVerification] || 'gray'}>
          {NIVEAU_LABEL[demande.niveauVerification] || demande.niveauVerification}
        </Badge>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Identité</p>
          <DetailRow icon={User}      label="Nom complet"       value={`${demande.prenom || ''} ${demande.nom || ''}`.trim()} />
          <DetailRow icon={Calendar}  label="Date de naissance" value={fmt(demande.dateNaissance)} />
          <DetailRow icon={Globe}     label="Nationalité"       value={demande.nationalite} />
          <DetailRow icon={MapPin}    label="Lieu de naissance" value={demande.lieuNaissance} />
        </div>
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pièce d'identité</p>
          <DetailRow icon={CreditCard} label="Type"        value={demande.typePiece} />
          <DetailRow icon={CreditCard} label="Numéro"      value={demande.numeroPiece} />
          <DetailRow icon={Calendar}   label="Expiration"  value={fmt(demande.dateExpirationPiece)} />
        </div>
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Coordonnées</p>
          <DetailRow icon={Phone}     label="Téléphone"   value={demande.telephone} />
          <DetailRow icon={Mail}      label="Email"       value={demande.email} />
          <DetailRow icon={Home}      label="Adresse"     value={demande.adresse} />
          <DetailRow icon={MapPin}    label="Ville / Pays" value={[demande.ville, demande.pays].filter(Boolean).join(' · ')} />
        </div>
        {(demande.profession || demande.sourceRevenus) && (
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Situation professionnelle</p>
            {demande.profession    && <DetailRow icon={Briefcase} label="Profession"     value={demande.profession} />}
            {demande.sourceRevenus && <DetailRow icon={Briefcase} label="Source revenus" value={demande.sourceRevenus} />}
          </div>
        )}
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Compte</p>
          <DetailRow icon={Calendar} label="Inscrit le" value={fmt(demande.inscritLe)} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 px-4 py-3 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={onRejeter}
          disabled={!!actionId}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-rose-200 bg-rose-50 py-2 text-[12px] font-semibold text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
        >
          {actionId === 'rejeter' ? <Loader2 size={14} className="animate-spin" /> : <ShieldX size={14} />}
          Rejeter
        </button>
        <button
          onClick={onApprouver}
          disabled={!!actionId}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-700 py-2 text-[12px] font-semibold text-white hover:bg-violet-800 transition disabled:opacity-50"
        >
          {actionId === 'approuver' ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          Approuver
        </button>
      </div>
    </div>
  )
}

export default function Kyc() {
  const { on, off } = usePusher()
  const [demandes, setDemandes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [selected, setSelected]   = useState(null)
  const [actionId, setActionId]   = useState(null)
  const [actionError, setActionError] = useState('')
  const [search, setSearch]       = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    getKycEnAttente()
      .then(setDemandes)
      .catch(() => setError('Impossible de charger les demandes KYC.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let active = true
    getKycEnAttente()
      .then(data => { if (active) setDemandes(data) })
      .catch(() => { if (active) setError('Impossible de charger les demandes KYC.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Nouvelle soumission KYC — apparaît dans la file sans refresh (refetch silencieux, sans spinner plein écran)
  useEffect(() => {
    const onKycSoumis = () => { getKycEnAttente().then(setDemandes).catch(() => {}) }
    on('KYC_SOUMIS', onKycSoumis)
    return () => off('KYC_SOUMIS', onKycSoumis)
  }, [off, on])

  const handleApprouver = async (userId) => {
    setActionError('')
    setActionId('approuver')
    try {
      await approuverKyc(userId)
      setSelected(null)
      fetchData()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Impossible d’approuver cette demande. Réessayez.')
    }
    finally { setActionId(null) }
  }

  const handleRejeter = async (userId) => {
    setActionError('')
    setActionId('rejeter')
    try {
      await rejeterKyc(userId)
      setSelected(null)
      fetchData()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Impossible de rejeter cette demande. Réessayez.')
    }
    finally { setActionId(null) }
  }

  const filtered = demandes.filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.nom?.toLowerCase().includes(q) ||
      d.prenom?.toLowerCase().includes(q) ||
      d.telephone?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">

      {/* ── Stats bar ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-[13px] font-bold text-slate-900">Vérification d'identité</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dossiers soumis par les utilisateurs</p>
        </div>
        <span className={`text-[12px] font-bold px-3 py-1.5 rounded-lg ${
          demandes.length > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {demandes.length > 0 ? `⏳ ${demandes.length} en attente` : '✓ Tout traité'}
        </span>
      </div>

      {/* ── Split panel ── */}
      <div className="flex min-h-[520px] flex-col gap-4 lg:h-[calc(100vh-210px)] lg:max-h-[720px] lg:flex-row">

        {/* Liste */}
        <div className="flex max-h-80 w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft lg:max-h-none lg:w-80">
          <div className="p-3 border-b border-slate-100 flex-shrink-0">
            <SearchInput value={search} onChange={setSearch} placeholder="Nom, téléphone…" className="w-full" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <Spinner py="py-8" />
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-sm text-rose-500 font-semibold">{error}</p>
                <button onClick={fetchData} className="mt-2 text-xs text-violet-600 hover:underline font-semibold">Réessayer</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-center px-4">
                <CheckCircle size={28} className="text-emerald-400" />
                <p className="text-sm font-semibold text-slate-500">
                  {search ? 'Aucun résultat' : 'Aucune demande en attente'}
                </p>
                <p className="text-xs text-slate-400">
                  {search ? 'Essayez un autre terme' : 'Toutes les demandes ont été traitées'}
                </p>
              </div>
            ) : (
              filtered.map(d => (
                <button
                  key={d.utilisateurId}
                  onClick={() => setSelected(d)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 text-left transition ${
                    selected?.utilisateurId === d.utilisateurId
                      ? 'bg-violet-50 border-l-2 border-l-violet-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold ${avatarColor(d.nom)}`}>
                    {initiales(d.nom, d.prenom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-900 truncate">{d.prenom} {d.nom}</p>
                    <p className="text-[10.5px] font-mono text-slate-400">{d.telephone}</p>
                  </div>
                  <div className="flex-shrink-0 text-[10px] text-slate-400">
                    {new Date(d.inscritLe).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panneau de détail */}
        <DetailPanel
          demande={selected}
          onClose={() => setSelected(null)}
          onApprouver={() => handleApprouver(selected.utilisateurId)}
          onRejeter={() => handleRejeter(selected.utilisateurId)}
          actionId={actionId}
        />
      </div>
      {actionError && (
        <div role="alert" className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 shadow-lift">
          {actionError}
        </div>
      )}
    </div>
  )
}
