import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Plus, Trash2, X, Upload, Package, Eye, Users, CalendarClock, Layers, Image, Edit2, Sparkles, Search, Download, Clock, CheckSquare, CalendarDays, UserCheck, ArrowLeft, ClipboardList, Truck, PackageCheck, AlertTriangle, Flag, Route, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Badge, Card, Table, Th, Td, Tr, Spinner, EmptyState, ProgressBar } from '../components/ui'
import { useSSE } from '../hooks/useSSE'
import {
  getAdminOpportunites, getAdminOpportunite, activerOpportunite, cloturerOpportunite,
  creerOpportunite, modifierOpportunite, uploadOpportuniteImage, deleteOpportuniteImage,
  genererSpecsOpportunite, getParticipantsOpportunite, planifierParticipantsOpportunite, mettreAJourLivraisonParticipants,
} from '../services/api'

const BACKEND = `http://${window.location.hostname}:8080`
const imgUrl = (url) => url ? (url.startsWith('http') ? url : BACKEND + url) : null

const CATEGORIES = ['Mode', 'Électronique', 'Véhicules', 'Maison', 'Alimentaire', 'Informatique', 'Beauté', 'Mobilier', 'Sport']

function formatMontant(val) { return Number(val || 0).toLocaleString('fr-FR') }
function normaliserRecherche(val) {
  return String(val ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function todaySlot() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(Math.max(9, d.getHours()))
  return d.toISOString().slice(0, 16)
}
function tomorrowSlot() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}
function escapeCsv(value) {
  const text = String(value ?? '')
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(escapeCsv).join(';')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const STATUT_COLOR = { BROUILLON: 'gray', ACTIVE: 'sky', CLOTUREE: 'emerald', ANNULEE: 'rose' }
const STATUT_LABEL = { BROUILLON: 'Brouillon', ACTIVE: 'Active', CLOTUREE: 'Clôturée', ANNULEE: 'Annulée' }
const STATUT_PARTICIPATION_COLOR = { EN_ATTENTE: 'gray', CONFIRMEE: 'emerald', REMBOURSEE: 'sky' }
const STATUT_PARTICIPATION_LABEL = { EN_ATTENTE: 'En attente', CONFIRMEE: 'Confirmée', REMBOURSEE: 'Remboursée' }
const STATUT_PAIEMENT_LABEL = { DEPOT_GELE: 'Dépôt sécurisé', PAYE: 'Payé', PARTIEL: 'Partiellement payé', IMPAYE: 'Impayé', REMBOURSE: 'Remboursé' }
const STATUT_PAIEMENT_COLOR = { DEPOT_GELE: 'amber', PAYE: 'emerald', PARTIEL: 'amber', IMPAYE: 'rose', REMBOURSE: 'sky' }
const STATUT_LIVRAISON_COLOR = {
  EN_ATTENTE_QUOTA: 'gray',
  A_PREPARER: 'amber',
  PREPARATION: 'indigo',
  PRET_LIVRAISON: 'violet',
  EN_LIVRAISON: 'sky',
  LIVRE_A_CONFIRMER: 'amber',
  LIVRE_CONFIRME: 'emerald',
  ECHEC_LIVRAISON: 'rose',
  LITIGE: 'rose',
  ANNULE: 'gray',
}
const STATUT_LIVRAISON_LABEL = {
  EN_ATTENTE_QUOTA: 'Campagne en cours',
  A_PREPARER: 'Paiement validé',
  PREPARATION: 'Lot transmis au partenaire',
  PRET_LIVRAISON: 'Partenaire confirmé',
  EN_LIVRAISON: 'Date de livraison annoncée',
  LIVRE_A_CONFIRMER: 'Confirmation client attendue',
  LIVRE_CONFIRME: 'Reçu confirmé',
  ECHEC_LIVRAISON: 'Promesse non tenue',
  LITIGE: 'Litige',
  ANNULE: 'Annulé',
}
const STATUT_LIVRAISON_OPTIONS = [
  'A_PREPARER',
  'PREPARATION',
  'EN_LIVRAISON',
  'LIVRE_A_CONFIRMER',
  'ECHEC_LIVRAISON',
  'LITIGE',
  'ANNULE',
]
const ETAPES_LIVRAISON = [
  { key: 'VALIDATION', statuses: ['EN_ATTENTE_QUOTA', 'A_PREPARER'], label: '1. Validation', hint: 'Clôture et paiements' },
  { key: 'PARTENAIRE', statuses: ['PREPARATION', 'PRET_LIVRAISON', 'EN_LIVRAISON'], label: '2. Partenaire', hint: 'Lot accepté et date promise' },
  { key: 'RECEPTION', statuses: ['LIVRE_A_CONFIRMER', 'LIVRE_CONFIRME'], label: '3. Réception', hint: 'Confirmation du client' },
]

const PALIER_VIDE = { seuilMin: '', seuilMax: '', prix: '' }

// Le seuil min de chaque palier (sauf le premier) découle automatiquement
// du seuil max du palier précédent + 1 — impossible de le faire redescendre en dessous.
function calculerPaliers(paliers) {
  return paliers.map((p, i) => {
    if (i === 0) return p
    const prevMax = Number(paliers[i - 1].seuilMax)
    return { ...p, seuilMin: prevMax > 0 ? String(prevMax + 1) : '' }
  })
}

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 transition'
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1'

function ImagePicker({ images, onChange }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((files) => {
    const newImages = Array.from(files).map(file => ({ file, legende: '', preview: URL.createObjectURL(file) }))
    onChange(prev => [...prev, ...newImages])
  }, [onChange])

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }
  const updateLegende = (i, v) => onChange(prev => prev.map((img, idx) => idx === i ? { ...img, legende: v } : img))
  const removeImage = (i) => onChange(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i) })

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
          dragging ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
        }`}
      >
        <Upload size={20} className="text-slate-400" />
        <p className="text-sm text-slate-500">Glissez ou <span className="font-medium text-violet-600">cliquez ici</span></p>
        <p className="text-xs text-slate-400">PNG, JPG, WEBP — max 15 Mo</p>
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div key={i} className="group relative">
              <div className="aspect-square overflow-hidden rounded-xl border border-slate-100">
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
              </div>
              <button type="button" onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <X size={12} />
              </button>
              <input type="text" placeholder="Légende…" value={img.legende}
                onChange={e => updateLegende(i, e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:border-violet-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DetailDrawer({ item, onClose, onActiver, onCloturer, onModifier, actionId }) {
  const [participants, setParticipants] = useState([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [searchParticipant, setSearchParticipant] = useState('')
  const [statutFiltre, setStatutFiltre] = useState('TOUS')
  const [planningFiltre, setPlanningFiltre] = useState('TOUS')
  const [selectedIds, setSelectedIds] = useState([])
  const [plan, setPlan] = useState({})
  const [bulkSlot, setBulkSlot] = useState(todaySlot())
  const [livraisonFiltre, setLivraisonFiltre] = useState('A_TRAITER')
  const [bulkLivraison, setBulkLivraison] = useState('PREPARATION')
  const [bulkDeliveryInfo, setBulkDeliveryInfo] = useState({ referenceLivraison: '', dateLivraisonPrevue: '', noteLivraison: '' })
  const [savingLivraison, setSavingLivraison] = useState(false)

  useEffect(() => {
    if (!item) return
    setSelectedIds([])
    setSearchParticipant('')
    setStatutFiltre('TOUS')
    setPlanningFiltre('TOUS')
    setLivraisonFiltre('A_TRAITER')
    setBulkSlot(todaySlot())
    setBulkLivraison('PREPARATION')
    setBulkDeliveryInfo({ referenceLivraison: '', dateLivraisonPrevue: '', noteLivraison: '' })
    setLoadingParticipants(true)
    getParticipantsOpportunite(item.id)
      .then(data => {
        setParticipants(data)
        setPlan(Object.fromEntries(
          data
            .filter(p => p.creneauTraitement || p.noteTraitement)
            .map(p => [p.id, { slot: p.creneauTraitement ? p.creneauTraitement.slice(0, 16) : '', note: p.noteTraitement || '' }])
        ))
      })
      .catch(() => setParticipants([]))
      .finally(() => setLoadingParticipants(false))
  }, [item?.id])

  if (!item) return null
  const pct = item.seuilMinimum > 0
    ? Math.min(100, Math.round((item.participantsActuels / item.seuilMinimum) * 100)) : 0
  const paliers = [...(item.paliers || [])].sort((a, b) => a.seuilMin - b.seuilMin)
  const images  = item.images || []
  const palierActif = paliers.find(p => item.participantsActuels >= p.seuilMin && item.participantsActuels <= p.seuilMax) || paliers.at(-1)
  const prixActuel = item.prixActuel ?? palierActif?.prix ?? item.prixNormal
  const economies = Math.max(0, Number(item.prixNormal || 0) - Number(prixActuel || 0))
  const totalQuantites = participants.reduce((sum, p) => sum + Number(p.quantite || 0), 0)
  const totalMontantGele = participants.reduce((sum, p) => sum + Number(p.montantGele || 0), 0)
  const livraisonCounts = participants.reduce((acc, p) => {
    const s = p.statutLivraison || 'EN_ATTENTE_QUOTA'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const livraisonMoyenne = participants.length
    ? Math.round(participants.reduce((sum, p) => sum + Number(p.progressionLivraison || 0), 0) / participants.length)
    : 0
  const livraisonsConfirmees = livraisonCounts.LIVRE_CONFIRME || 0
  const livraisonsProblemes = (livraisonCounts.ECHEC_LIVRAISON || 0) + (livraisonCounts.LITIGE || 0)
  const livraisonEnAttenteConfirmation = livraisonCounts.LIVRE_A_CONFIRMER || 0
  const placesRestantes = item.seuilMaximal != null ? Math.max(0, item.seuilMaximal - item.participantsActuels) : null
  const joursRestants = item.dateExpiration ? Math.ceil((new Date(item.dateExpiration) - new Date()) / 86400000) : null
  const prochaineAction = livraisonsProblemes > 0
    ? { icon: AlertTriangle, title: 'Traiter les problèmes', text: `${livraisonsProblemes} livraison(s) en échec ou litige demandent une action humaine.`, color: 'rose' }
    : livraisonEnAttenteConfirmation > 0
      ? { icon: PackageCheck, title: 'Relancer les confirmations', text: `${livraisonEnAttenteConfirmation} participant(s) doivent confirmer la réception.`, color: 'amber' }
      : (livraisonCounts.EN_LIVRAISON || 0) > 0
        ? { icon: Truck, title: 'Contrôler les dates promises', text: `${livraisonCounts.EN_LIVRAISON} participant(s) ont une livraison annoncée par le partenaire.`, color: 'sky' }
        : (livraisonCounts.A_PREPARER || 0) + (livraisonCounts.PREPARATION || 0) + (livraisonCounts.PRET_LIVRAISON || 0) > 0
          ? { icon: ClipboardList, title: 'Transmettre le prochain lot', text: 'Sélectionnez les participants, exportez la liste et consignez la réponse du partenaire.', color: 'violet' }
          : { icon: CheckSquare, title: 'Suivi à jour', text: 'Aucune action urgente détectée sur cette opportunité.', color: 'emerald' }

  const savePlan = (nextPlan) => {
    setPlan(nextPlan)
  }

  const participantPlan = (id) => plan[id] || {}
  const setParticipantPlan = (id, patch) => {
    const next = { ...participantPlan(id), ...patch, updatedAt: new Date().toISOString() }
    savePlan({ ...plan, [id]: next })
    planifierParticipantsOpportunite(item.id, {
      participationIds: [id],
      creneauTraitement: next.slot ? new Date(next.slot).toISOString() : null,
      noteTraitement: next.note || '',
    }).then(setParticipants).catch(() => {})
  }

  const filteredParticipants = (() => {
    const q = searchParticipant.trim().toLowerCase()
    return participants.filter(p => {
      const matchesSearch = !q || [p.nom, p.telephone, p.utilisateurId].some(v => String(v || '').toLowerCase().includes(q))
      const matchesStatut = statutFiltre === 'TOUS' || p.statut === statutFiltre
      const matchesLivraison = livraisonFiltre === 'TOUS'
        || p.statutLivraison === livraisonFiltre
        || (livraisonFiltre === 'PRIORITAIRES' && p.prioriteTraitement)
        || (livraisonFiltre === 'A_TRAITER' && !['LIVRE_CONFIRME', 'ANNULE'].includes(p.statutLivraison))
        || (livraisonFiltre === 'TERMINES' && ['LIVRE_CONFIRME', 'ANNULE'].includes(p.statutLivraison))
      const slot = participantPlan(p.id).slot
      const hasSlot = Boolean(slot)
      const slotDay = hasSlot ? slot.slice(0, 10) : ''
      const today = todaySlot().slice(0, 10)
      const tomorrow = tomorrowSlot().slice(0, 10)
      const matchesPlanning =
        planningFiltre === 'TOUS' ||
        (planningFiltre === 'NON_PLANIFIES' && !hasSlot) ||
        (planningFiltre === 'AUJOURDHUI' && slotDay === today) ||
        (planningFiltre === 'DEMAIN' && slotDay === tomorrow) ||
        (planningFiltre === 'PLANIFIES' && hasSlot)
      return matchesSearch && matchesStatut && matchesLivraison && matchesPlanning
    })
  })()

  const selectedParticipants = filteredParticipants.filter(p => selectedIds.includes(p.id))
  const allVisibleSelected = filteredParticipants.length > 0 && filteredParticipants.every(p => selectedIds.includes(p.id))
  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(ids => ids.filter(id => !filteredParticipants.some(p => p.id === id)))
    } else {
      setSelectedIds(ids => Array.from(new Set([...ids, ...filteredParticipants.map(p => p.id)])))
    }
  }
  const toggleSelected = (id) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }
  const planSelected = (slot) => {
    if (selectedParticipants.length === 0) return
    const nextPlan = { ...plan }
    selectedParticipants.forEach(p => {
      nextPlan[p.id] = { ...nextPlan[p.id], slot, updatedAt: new Date().toISOString() }
    })
    savePlan(nextPlan)
    planifierParticipantsOpportunite(item.id, {
      participationIds: selectedParticipants.map(p => p.id),
      creneauTraitement: slot ? new Date(slot).toISOString() : null,
      noteTraitement: undefined,
    }).then(setParticipants).catch(() => {})
  }
  const clearSelectedPlan = () => {
    if (selectedParticipants.length === 0) return
    const nextPlan = { ...plan }
    selectedParticipants.forEach(p => {
      delete nextPlan[p.id]
    })
    savePlan(nextPlan)
    planifierParticipantsOpportunite(item.id, {
      participationIds: selectedParticipants.map(p => p.id),
      creneauTraitement: null,
      noteTraitement: '',
    }).then(setParticipants).catch(() => {})
  }
  const updateLivraison = async (participationIds, patch) => {
    if (!participationIds.length) return
    setSavingLivraison(true)
    try {
      const next = await mettreAJourLivraisonParticipants(item.id, {
        participationIds,
        ...patch,
      })
      setParticipants(next)
      setPlan(Object.fromEntries(
        next
          .filter(p => p.creneauTraitement || p.noteTraitement)
          .map(p => [p.id, { slot: p.creneauTraitement ? p.creneauTraitement.slice(0, 16) : '', note: p.noteTraitement || '' }])
      ))
    } finally {
      setSavingLivraison(false)
    }
  }
  const updateSelectedLivraison = (patch) => updateLivraison(selectedParticipants.map(p => p.id), patch)
  const applyBulkLivraison = () => {
    updateSelectedLivraison({
      statutLivraison: bulkLivraison,
      referenceLivraison: bulkDeliveryInfo.referenceLivraison || undefined,
      dateLivraisonPrevue: bulkDeliveryInfo.dateLivraisonPrevue ? new Date(bulkDeliveryInfo.dateLivraisonPrevue).toISOString() : undefined,
      noteLivraison: bulkDeliveryInfo.noteLivraison || undefined,
    })
  }
  const exportRows = (rows) => {
    const header = ['Nom', 'Téléphone', 'Quantité', 'Montant gelé', 'Statut paiement', 'État du dossier', 'Avancement', 'Priorité', 'Inscription', 'Lot prévu', 'Date promise par le partenaire', 'Référence partenaire', 'Note admin', 'Note partenaire', 'Confirmation participant', 'ID participant', 'ID utilisateur']
    const body = rows.map(p => {
      const pPlan = participantPlan(p.id)
      return [
        p.nom || '',
        p.telephone || '',
        p.quantite || 0,
        p.montantGele || 0,
        STATUT_PARTICIPATION_LABEL[p.statut] || p.statut || '',
        STATUT_LIVRAISON_LABEL[p.statutLivraison] || p.statutLivraison || '',
        `${p.progressionLivraison || 0}%`,
        p.prioriteTraitement ? 'Oui' : 'Non',
        formatDateTime(p.createdAt),
        pPlan.slot ? formatDateTime(pPlan.slot) : '',
        formatDateTime(p.dateLivraisonPrevue),
        p.referenceLivraison || '',
        pPlan.note || '',
        p.noteLivraison || '',
        p.commentaireParticipantLivraison || '',
        p.id,
        p.utilisateurId,
      ]
    })
    downloadCsv(`participants-${item.titre.replace(/[^\w-]+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body])
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto flex max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <button onClick={onClose} className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-slate-700">
                <ArrowLeft size={14} /> Retour aux opportunités
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-slate-950">{item.titre}</h2>
                <Badge color={STATUT_COLOR[item.statut] || 'gray'}>{STATUT_LABEL[item.statut] || item.statut}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {item.categorie && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 font-bold text-violet-700">{item.categorie}</span>
              )}
                <span>Créée le {formatDate(item.createdAt)}</span>
                <span>Expire le {formatDate(item.dateExpiration)}</span>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <button onClick={() => exportRows(filteredParticipants)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:flex-none">
                <Download size={15} /> Exporter la liste
              </button>
              <button onClick={() => onModifier(item)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:flex-none">
                <Edit2 size={15} /> Modifier
              </button>
              {item.statut === 'BROUILLON' && (
                <button onClick={() => onActiver(item.id)} disabled={actionId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {actionId === item.id ? <Loader2 size={15} className="animate-spin" /> : null}
                  Activer
                </button>
              )}
              {item.statut === 'ACTIVE' && (
                <button onClick={() => onCloturer(item.id)} disabled={actionId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                  {actionId === item.id ? <Loader2 size={15} className="animate-spin" /> : null}
                  Clôturer
                </button>
              )}
              <button onClick={onClose} className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700 sm:inline-flex">
                <X size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  prochaineAction.color === 'rose' ? 'bg-rose-50 text-rose-600'
                    : prochaineAction.color === 'amber' ? 'bg-amber-50 text-amber-600'
                    : prochaineAction.color === 'sky' ? 'bg-sky-50 text-sky-600'
                    : prochaineAction.color === 'violet' ? 'bg-violet-50 text-violet-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <prochaineAction.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">{prochaineAction.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{prochaineAction.text}</p>
                </div>
              </div>
              <div className="w-full">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Avancement du dossier</span>
                  <span>{livraisonMoyenne}%</span>
                </div>
                <ProgressBar value={livraisonMoyenne} color={livraisonMoyenne >= 90 ? 'emerald' : livraisonMoyenne >= 50 ? 'sky' : 'amber'} />
              </div>
            </div>
            <div className="mx-auto mt-5 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              {ETAPES_LIVRAISON.map((step, index) => {
                const count = step.statuses.reduce((sum, status) => sum + (livraisonCounts[status] || 0), 0)
                const active = count > 0
                return (
                  <button key={step.key} onClick={() => setLivraisonFiltre(step.key)}
                    className={`rounded-xl border px-4 py-3 text-center transition ${
                      active ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}>
                    <div className="flex items-center justify-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
                        active ? 'bg-violet-700 text-white' : 'bg-white text-slate-400'
                      }`}>{index + 1}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black tabular-nums ${active ? 'bg-violet-100 text-violet-800' : 'bg-white text-slate-400'}`}>{count}</span>
                    </div>
                    <p className={`mt-2 text-xs font-black ${active ? 'text-violet-900' : 'text-slate-600'}`}>{step.label}</p>
                    <p className="text-[10px] text-slate-400">{step.hint}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <aside className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Prix de base</p>
                  <p className="mt-2 text-lg font-black text-slate-950 tabular-nums">{formatMontant(item.prixNormal)}</p>
                  <p className="text-[10px] text-slate-400">FCFA</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Prix actuel</p>
                  <p className="mt-2 text-lg font-black text-emerald-800 tabular-nums">{formatMontant(prixActuel)}</p>
                  <p className="text-[10px] text-emerald-600">-{formatMontant(economies)} FCFA / unité</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Participants</p>
                  <p className="mt-2 text-lg font-black text-slate-950 tabular-nums">{item.participantsActuels} / {item.seuilMinimum}</p>
                  <ProgressBar value={pct} color="indigo" className="mt-2" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Temps restant</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{joursRestants == null ? '—' : `${Math.max(0, joursRestants)} j`}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(item.dateExpiration)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Pilotage rapide</p>
                  <ClipboardList size={15} className="text-violet-500" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantités</p>
                    <p className="font-black text-slate-900 tabular-nums">{totalQuantites}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Montant gelé</p>
                    <p className="font-black text-slate-900 tabular-nums">{formatMontant(totalMontantGele)} FCFA</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Palier actif</p>
                    <p className="font-black text-slate-900">{palierActif ? `${palierActif.seuilMin}-${palierActif.seuilMax}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock restant</p>
                    <p className="font-black text-slate-900">{placesRestantes == null ? 'Illimité' : placesRestantes}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Partenaire fournisseur</p>
                  <Package size={15} className="text-violet-500" />
                </div>
                {item.partenaireNom ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {item.partenaireLogoUrl ? <img src={item.partenaireLogoUrl} alt="" className="h-10 w-10 rounded-xl object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 font-black text-violet-700">{item.partenaireNom[0]}</div>}
                      <div><p className="font-black text-slate-900">{item.partenaireNom}</p><p className="text-xs text-slate-400">{item.partenaireContact || 'Contact non renseigné'}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-400">Montant dû</p><p className="mt-1 font-black text-slate-900">{formatMontant(item.montantDuPartenaire)} FCFA</p></div>
                      <div className={`rounded-xl p-3 ${item.statutPaiementPartenaire === 'PAYE' ? 'bg-emerald-50' : 'bg-amber-50'}`}><p className="font-bold text-slate-500">Paiement</p><p className="mt-1 font-black text-slate-900">{STATUT_PAIEMENT_LABEL[item.statutPaiementPartenaire] || 'Non configuré'}</p><p className="mt-1 text-[10px] text-slate-500">Reste {formatMontant(item.montantRestantPartenaire)} FCFA</p></div>
                    </div>
                  </div>
                ) : <p className="text-sm text-slate-400">Aucun partenaire lié. Ajoutez-le depuis la page de modification.</p>}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Suivi des engagements</p>
                  <Truck size={15} className="text-sky-500" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complétion</p>
                    <p className="mt-1 font-black text-slate-900 tabular-nums">{livraisonMoyenne}%</p>
                    <ProgressBar value={livraisonMoyenne} color={livraisonMoyenne >= 90 ? 'emerald' : 'sky'} className="mt-2" />
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Reçus confirmés</p>
                    <p className="mt-1 font-black text-emerald-800 tabular-nums">{livraisonsConfirmees}/{participants.length}</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Prioritaires</p>
                    <p className="mt-1 font-black text-violet-800 tabular-nums">{participants.filter(p => p.prioriteTraitement).length}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">À résoudre</p>
                    <p className="mt-1 font-black text-rose-700 tabular-nums">{livraisonsProblemes}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">OpportuniHub ne prépare ni ne transporte les colis. Nous contrôlons l'engagement du partenaire et la confirmation finale du participant.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <Layers size={14} /> Paliers de prix
                </p>
                {paliers.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun palier défini.</p>
                ) : (
                  <div className="space-y-2">
                    {paliers.map((p, i) => {
                      const actif = item.participantsActuels >= p.seuilMin && item.participantsActuels <= p.seuilMax
                      return (
                        <div key={p.id || i} className={`rounded-xl border px-3 py-2 ${actif ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-bold ${actif ? 'text-emerald-700' : 'text-slate-600'}`}>
                              {p.seuilMin}–{p.seuilMax} participants
                            </span>
                            {actif && <Badge color="emerald">Actuel</Badge>}
                          </div>
                          <p className={`mt-1 text-sm font-black tabular-nums ${actif ? 'text-emerald-800' : 'text-slate-900'}`}>{formatMontant(p.prix)} FCFA</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {(item.description || item.specsPointsForts || images.length > 0) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Fiche opportunité</p>
                  {item.description && <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>}
                  {item.specsPointsForts && (
                    <ul className="mt-3 space-y-1">
                      {item.specsPointsForts.split('\n').filter(Boolean).slice(0, 5).map((line, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-violet-500">•</span>{line}</li>
                      ))}
                    </ul>
                  )}
                  {images.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {images.slice(0, 4).map((img, i) => (
                        <div key={img.id || i} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                          <img src={imgUrl(img.url)} alt={img.legende || ''} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </aside>

            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                      <Users size={17} className="text-violet-600" /> Participants à traiter
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Constituez le lot transmis au partenaire. Les réceptions confirmées quittent automatiquement la file active. {filteredParticipants.length} visible(s), {selectedParticipants.length} sélectionné(s).
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => exportRows(selectedParticipants)} disabled={selectedParticipants.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                      <Download size={14} /> Export Excel (.csv)
                    </button>
                    <button onClick={() => planSelected(todaySlot())} disabled={selectedParticipants.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-40">
                      <UserCheck size={14} /> Lot prioritaire du jour
                    </button>
                    <button onClick={() => planSelected(tomorrowSlot())} disabled={selectedParticipants.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40">
                      <CalendarDays size={14} /> Reporter au prochain lot
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_150px_170px_170px]">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchParticipant} onChange={e => setSearchParticipant(e.target.value)}
                      placeholder="Rechercher nom, téléphone, ID…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white" />
                  </div>
                  <select value={statutFiltre} onChange={e => setStatutFiltre(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400">
                    <option value="TOUS">Tous statuts</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="CONFIRMEE">Confirmée</option>
                    <option value="REMBOURSEE">Remboursée</option>
                  </select>
                  <select value={livraisonFiltre} onChange={e => setLivraisonFiltre(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400">
                    <option value="A_TRAITER">File active à traiter</option>
                    <option value="TERMINES">Terminés / archivés</option>
                    <option value="TOUS">Tous les dossiers</option>
                    <option value="PRIORITAIRES">Prioritaires</option>
                    <option value="EN_ATTENTE_QUOTA">Campagne en cours</option>
                    <option value="A_PREPARER">Paiement validé</option>
                    <option value="PREPARATION">Lot transmis au partenaire</option>
                    <option value="PRET_LIVRAISON">Partenaire confirmé</option>
                    <option value="EN_LIVRAISON">Date annoncée</option>
                    <option value="LIVRE_A_CONFIRMER">Confirmation client attendue</option>
                    <option value="LIVRE_CONFIRME">Reçu confirmé</option>
                    <option value="LITIGE">Litiges</option>
                  </select>
                  <select value={planningFiltre} onChange={e => setPlanningFiltre(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400">
                    <option value="TOUS">Tous créneaux</option>
                    <option value="NON_PLANIFIES">Non planifiés</option>
                    <option value="AUJOURDHUI">Aujourd'hui</option>
                    <option value="DEMAIN">Demain</option>
                    <option value="PLANIFIES">Planifiés</option>
                  </select>
                </div>

              </div>

              {selectedParticipants.length > 0 && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-violet-950">
                        {selectedParticipants.length} participant(s) sélectionné(s)
                      </p>
                      <p className="mt-0.5 text-xs text-violet-700">
                        Ce lot est votre sélection de travail. Les autres participants restent en attente pour plus tard.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => planSelected(todaySlot())}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-800">
                        <UserCheck size={12} /> Aujourd'hui
                      </button>
                      <button onClick={() => planSelected(tomorrowSlot())}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50">
                        <CalendarDays size={12} /> Demain
                      </button>
                      <button onClick={() => updateSelectedLivraison({ prioriteTraitement: true })} disabled={savingLivraison}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50">
                        <Flag size={12} /> Prioriser
                      </button>
                      <button onClick={() => setSelectedIds([])} className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50">
                        Désélectionner
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[210px_190px_1fr_auto]">
                    <select value={bulkLivraison} onChange={e => setBulkLivraison(e.target.value)}
                      className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500">
                      {STATUT_LIVRAISON_OPTIONS.map(status => (
                        <option key={status} value={status}>{STATUT_LIVRAISON_LABEL[status]}</option>
                      ))}
                    </select>
                    <input type="datetime-local" value={bulkDeliveryInfo.dateLivraisonPrevue}
                      onChange={e => setBulkDeliveryInfo(v => ({ ...v, dateLivraisonPrevue: e.target.value }))}
                      title="Date promise par le partenaire"
                      className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
                    <input value={bulkDeliveryInfo.referenceLivraison}
                      onChange={e => setBulkDeliveryInfo(v => ({ ...v, referenceLivraison: e.target.value }))}
                      placeholder="Référence du lot partenaire"
                      className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
                    <button onClick={applyBulkLivraison} disabled={savingLivraison}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-40">
                      {savingLivraison ? <Loader2 size={13} className="animate-spin" /> : <Route size={13} />}
                      Enregistrer l'engagement
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input type="datetime-local" value={bulkSlot} onChange={e => setBulkSlot(e.target.value)}
                      className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-violet-500" />
                    <button onClick={() => planSelected(bulkSlot)} disabled={!bulkSlot}
                      className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-40">
                      Planifier à cette date
                    </button>
                    <button onClick={clearSelectedPlan} className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50">
                      Retirer du planning
                    </button>
                    <button onClick={() => updateSelectedLivraison({ prioriteTraitement: false })} disabled={savingLivraison}
                      className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50">
                      Retirer priorité
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {loadingParticipants ? (
                  <Spinner py="py-16" />
                ) : filteredParticipants.length === 0 ? (
                  <div className="flex min-h-52 flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50 px-6 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Users size={22} />
                    </div>
                    <p className="mt-3 text-sm font-black text-slate-800">
                      {participants.length === 0 ? 'Aucune souscription pour le moment' : 'Aucun résultat avec ces filtres'}
                    </p>
                    <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                      {participants.length === 0
                        ? 'La file apparaîtra ici dès qu’un participant aura payé son dépôt et rejoint cette campagne.'
                        : 'Essayez une autre recherche ou réinitialisez les filtres pour retrouver les participants.'}
                    </p>
                    {participants.length > 0 && (
                      <button onClick={() => { setSearchParticipant(''); setStatutFiltre('TOUS'); setLivraisonFiltre('A_TRAITER'); setPlanningFiltre('TOUS') }}
                        className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredParticipants.map(p => {
                      const pPlan = participantPlan(p.id)
                      const isSelected = selectedIds.includes(p.id)
                      return (
                        <article key={p.id} className={`p-4 ${isSelected ? 'bg-violet-50/70' : 'bg-white'}`}>
                          <div className="flex items-start gap-3">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(p.id)}
                              aria-label={`Sélectionner ${p.nom || p.telephone || p.id}`}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-bold text-slate-900">{p.nom || 'Participant sans nom'}</p>
                                  <p className="text-xs text-slate-400">{p.telephone || 'Téléphone non renseigné'}</p>
                                </div>
                                <Badge color={STATUT_PAIEMENT_COLOR[p.statutPaiement] || STATUT_PARTICIPATION_COLOR[p.statut] || 'gray'}>
                                  {STATUT_PAIEMENT_LABEL[p.statutPaiement] || STATUT_PARTICIPATION_LABEL[p.statut] || p.statut}
                                </Badge>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl bg-slate-50 p-2.5"><span className="text-slate-400">Commande</span><p className="mt-1 font-black text-slate-800">×{p.quantite || 0} · {formatMontant(p.montantGele)} FCFA</p></div>
                                <div className="rounded-xl bg-slate-50 p-2.5"><span className="text-slate-400">Lot prévu</span><p className="mt-1 font-bold text-slate-700">{pPlan.slot ? formatDateTime(pPlan.slot) : 'Non planifié'}</p></div>
                              </div>
                              <div className="mt-3">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                  <Badge color={STATUT_LIVRAISON_COLOR[p.statutLivraison] || 'gray'}>{STATUT_LIVRAISON_LABEL[p.statutLivraison] || 'Campagne en cours'}</Badge>
                                  <span className="text-[10px] font-bold text-slate-400">{p.progressionLivraison || 0}%</span>
                                </div>
                                <ProgressBar value={p.progressionLivraison || 0} color={p.statutLivraison === 'LIVRE_CONFIRME' ? 'emerald' : 'sky'} />
                              </div>
                              {p.dateLivraisonPrevue && <p className="mt-2 text-xs text-slate-500"><span className="font-bold">Date promise :</span> {formatDateTime(p.dateLivraisonPrevue)}</p>}
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <select value={p.statutLivraison || 'EN_ATTENTE_QUOTA'} onChange={e => updateLivraison([p.id], { statutLivraison: e.target.value })}
                                  className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none focus:border-violet-400">
                                  <option value="EN_ATTENTE_QUOTA">Campagne en cours</option>
                                  {STATUT_LIVRAISON_OPTIONS.map(status => <option key={status} value={status}>{STATUT_LIVRAISON_LABEL[status]}</option>)}
                                </select>
                                <button onClick={() => updateLivraison([p.id], { prioriteTraitement: !p.prioriteTraitement })} disabled={savingLivraison}
                                  className="rounded-lg border border-violet-200 bg-white px-2 py-2 text-xs font-bold text-violet-700 disabled:opacity-50">
                                  {p.prioriteTraitement ? 'Retirer priorité' : 'Prioriser'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[980px] border-collapse">
                      <thead>
                        <tr>
                          <Th className="w-10">
                            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible}
                              aria-label="Sélectionner tous les participants visibles"
                              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                          </Th>
                          <Th>Participant</Th>
                          <Th>Commande</Th>
                          <Th>État du dossier</Th>
                          <Th>Lot / créneau</Th>
                          <Th>Engagement partenaire</Th>
                          <Th>Mettre à jour</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredParticipants.map(p => {
                          const pPlan = participantPlan(p.id)
                          const isSelected = selectedIds.includes(p.id)
                          return (
                            <Tr key={p.id} className={isSelected ? 'bg-violet-50/60 hover:bg-violet-50' : ''}>
                              <Td>
                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(p.id)}
                                  aria-label={`Sélectionner ${p.nom || p.telephone || p.id}`}
                                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                              </Td>
                              <Td>
                                <p className="font-bold text-slate-900">{p.nom || 'Participant sans nom'}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{p.telephone || 'Téléphone non renseigné'}</p>
                                <p className="mt-0.5 text-[10px] text-slate-300">Inscrit le {formatDateTime(p.createdAt)}</p>
                              </Td>
                              <Td>
                                <div className="space-y-1">
                                  <p className="font-black text-slate-900 tabular-nums">×{p.quantite || 0}</p>
                                  <p className="text-xs font-bold text-slate-600 tabular-nums">{formatMontant(p.montantGele)} FCFA</p>
                                  <Badge color={STATUT_PAIEMENT_COLOR[p.statutPaiement] || STATUT_PARTICIPATION_COLOR[p.statut] || 'gray'}>{STATUT_PAIEMENT_LABEL[p.statutPaiement] || STATUT_PARTICIPATION_LABEL[p.statut] || p.statut}</Badge>
                                  {Number(p.montantRestant || 0) > 0 && <p className="text-[10px] font-bold text-rose-600">Reste {formatMontant(p.montantRestant)} FCFA</p>}
                                </div>
                              </Td>
                              <Td>
                                <div className="min-w-44 space-y-2">
                                  <Badge color={STATUT_LIVRAISON_COLOR[p.statutLivraison] || 'gray'}>
                                    {STATUT_LIVRAISON_LABEL[p.statutLivraison] || p.statutLivraison || 'Quota non validé'}
                                  </Badge>
                                  {p.prioriteTraitement && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-violet-700">
                                      <Flag size={10} /> Prioritaire
                                    </span>
                                  )}
                                  {p.commentaireParticipantLivraison && (
                                    <span className="text-[10px] text-slate-400">Participant : {p.commentaireParticipantLivraison}</span>
                                  )}
                                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
                                    <span>{p.progressionLivraison || 0}%</span>
                                    {p.statutLivraison === 'LIVRE_CONFIRME' && <PackageCheck size={12} className="text-emerald-600" />}
                                    {(p.statutLivraison === 'LITIGE' || p.statutLivraison === 'ECHEC_LIVRAISON') && <AlertTriangle size={12} className="text-rose-600" />}
                                  </div>
                                  <ProgressBar value={p.progressionLivraison || 0} color={p.statutLivraison === 'LIVRE_CONFIRME' ? 'emerald' : p.statutLivraison === 'LITIGE' ? 'rose' : 'sky'} />
                                </div>
                              </Td>
                              <Td>
                                <div className="space-y-2 text-xs text-slate-600">
                                  <p className="font-bold text-slate-500">{pPlan.slot ? formatDateTime(pPlan.slot) : 'Non planifié'}</p>
                                  <div className="flex items-center gap-2">
                                  <Clock size={13} className={pPlan.slot ? 'text-violet-500' : 'text-slate-300'} />
                                  <input type="datetime-local" value={pPlan.slot || ''}
                                    onChange={e => setParticipantPlan(p.id, { slot: e.target.value })}
                                    className="w-44 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-violet-400 focus:bg-white" />
                                  </div>
                                </div>
                              </Td>
                              <Td>
                                <div className="space-y-1 text-[11px] text-slate-500">
                                  <p><span className="font-bold text-slate-700">Date promise :</span> {formatDateTime(p.dateLivraisonPrevue)}</p>
                                  <p><span className="font-bold text-slate-700">Réf. partenaire :</span> {p.referenceLivraison || '—'}</p>
                                  {p.noteLivraison && <p className="text-slate-400">{p.noteLivraison}</p>}
                                  {p.dateConfirmationParticipant && (
                                    <p className="font-bold text-emerald-700">Confirmé le {formatDateTime(p.dateConfirmationParticipant)}</p>
                                  )}
                                  {p.confirmationEnRetard && <p className="font-bold text-rose-600">Confirmation en retard</p>}
                                </div>
                              </Td>
                              <Td>
                                <div className="flex flex-col gap-1.5">
                                  <select value={p.statutLivraison || 'EN_ATTENTE_QUOTA'}
                                    onChange={e => updateLivraison([p.id], { statutLivraison: e.target.value })}
                                    className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-violet-400">
                                    <option value="EN_ATTENTE_QUOTA">Campagne en cours</option>
                                    {STATUT_LIVRAISON_OPTIONS.map(status => (
                                      <option key={status} value={status}>{STATUT_LIVRAISON_LABEL[status]}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => updateLivraison([p.id], { prioriteTraitement: !p.prioriteTraitement })}
                                    disabled={savingLivraison}
                                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
                                      p.prioriteTraitement
                                        ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}>
                                    {p.prioriteTraitement ? 'Retirer priorité' : 'Marquer prioritaire'}
                                  </button>
                                </div>
                              </Td>
                            </Tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900"><CheckSquare size={16} className="text-emerald-600" /> Traitement conseillé</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">Après la clôture et la validation financière, constituez un lot prioritaire, exportez-le puis transmettez-le au partenaire hors plateforme.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Truck size={16} className="text-sky-600" /> Engagement partenaire</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">Consignez uniquement la date promise et la référence communiquées par le partenaire. Sa préparation et son transport restent hors plateforme.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarClock size={16} className="text-amber-600" /> Décalage</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">Formez un lot aujourd’hui, demain ou à une date précise. Ce créneau organise votre transmission au partenaire ; ce n’est pas un planning de transport.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaliersEditor({ paliers, setPaliers }) {
  const setPalier = (i, k, v) => setPaliers(ps => ps.map((p, idx) => idx === i ? { ...p, [k]: v } : p))
  const addPalier = () => setPaliers(ps => [...ps, { ...PALIER_VIDE }])
  const removePalier = (i) => setPaliers(ps => ps.filter((_, idx) => idx !== i))

  const paliersCalcules = calculerPaliers(paliers)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={labelCls}>Paliers de prix *</label>
        <button type="button" onClick={addPalier}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">
          <Plus size={11} /> Ajouter
        </button>
      </div>
      <div className="space-y-2">
        {paliersCalcules.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div>
              <p className="mb-1 text-[10px] text-slate-400">Seuil min</p>
              {i === 0 ? (
                <input required type="number" min="1" value={p.seuilMin}
                  onChange={e => setPalier(i, 'seuilMin', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-violet-400" />
              ) : (
                <input disabled value={p.seuilMin || '—'}
                  title="Calculé automatiquement : seuil max du palier précédent + 1"
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-500" />
              )}
            </div>
            <div>
              <p className="mb-1 text-[10px] text-slate-400">Seuil max</p>
              <input required type="number" min="1" value={p.seuilMax}
                onChange={e => setPalier(i, 'seuilMax', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-violet-400" />
            </div>
            <div>
              <p className="mb-1 text-[10px] text-slate-400">Prix (FCFA)</p>
              <input required type="number" min="0" value={p.prix}
                onChange={e => setPalier(i, 'prix', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-violet-400" />
            </div>
            <button type="button" onClick={() => removePalier(i)} disabled={paliers.length === 1}
              className="mt-4 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition disabled:opacity-30">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpecsEditor({ titre, description, categorie, specs, setSpecs }) {
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  const handleGenerer = async () => {
    setGenError('')
    setGenerating(true)
    try {
      const res = await genererSpecsOpportunite({ titre, description: description || undefined, categorie: categorie || undefined })
      setSpecs({
        pointsForts: (res.pointsForts || []).join('\n'),
        casUsage: res.casUsage || '',
        finePrint: res.finePrint || '',
      })
    } catch (err) {
      setGenError(err.response?.data?.message || 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Fiche produit enrichie <span className="font-normal normal-case text-slate-400 tracking-normal">(optionnel)</span>
        </p>
        <button type="button" onClick={handleGenerer} disabled={generating || !titre}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 transition disabled:opacity-50">
          {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {generating ? 'Génération…' : "Générer avec l'IA"}
        </button>
      </div>
      {genError && <p className="text-[11px] text-rose-600">{genError}</p>}
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">Points forts (un par ligne)</label>
        <textarea value={specs.pointsForts} onChange={e => setSpecs(s => ({ ...s, pointsForts: e.target.value }))}
          rows={3} className={`${inputCls} resize-none bg-white`} placeholder="Ex : Qualité vérifiée et garantie satisfaction" />
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">Cas d'usage</label>
        <textarea value={specs.casUsage} onChange={e => setSpecs(s => ({ ...s, casUsage: e.target.value }))}
          rows={2} className={`${inputCls} resize-none bg-white`} />
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">Conditions particulières</label>
        <textarea value={specs.finePrint} onChange={e => setSpecs(s => ({ ...s, finePrint: e.target.value }))}
          rows={2} className={`${inputCls} resize-none bg-white`} />
      </div>
    </div>
  )
}

function NouvelleOpportuniteModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    titre: '', description: '', prixNormal: '', seuilMinimum: '', seuilMaximal: '',
    dateExpiration: '', categorie: '', actif: true,
    partenaireNom: '', partenaireLogoUrl: '', partenaireContact: '', partenaireReseauxUrl: '',
    montantDuPartenaire: '', montantPayePartenaire: '', delaiConfirmationReceptionJours: '3', messageNotificationLivraison: '',
  })
  const [paliers, setPaliers]             = useState([{ ...PALIER_VIDE }])
  const [specs, setSpecs]                 = useState({ pointsForts: '', casUsage: '', finePrint: '' })
  const [images, setImages]               = useState([])
  const [loading, setLoading]             = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [error, setError]                 = useState('')

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const created = await creerOpportunite({
        titre: form.titre,
        description: form.description || undefined,
        specsPointsForts: specs.pointsForts || undefined,
        specsCasUsage: specs.casUsage || undefined,
        specsFinePrint: specs.finePrint || undefined,
        prixNormal: Number(form.prixNormal),
        seuilMinimum: Number(form.seuilMinimum),
        seuilMaximal: form.seuilMaximal ? Number(form.seuilMaximal) : undefined,
        dateExpiration: new Date(form.dateExpiration).toISOString(),
        categorie: form.categorie || undefined,
        actif: form.actif,
        partenaireNom: form.partenaireNom || undefined,
        partenaireLogoUrl: form.partenaireLogoUrl || undefined,
        partenaireContact: form.partenaireContact || undefined,
        partenaireReseauxUrl: form.partenaireReseauxUrl || undefined,
        montantDuPartenaire: Number(form.montantDuPartenaire || 0),
        montantPayePartenaire: Number(form.montantPayePartenaire || 0),
        delaiConfirmationReceptionJours: Number(form.delaiConfirmationReceptionJours || 3),
        messageNotificationLivraison: form.messageNotificationLivraison || undefined,
        paliers: calculerPaliers(paliers).map(p => ({
          seuilMin: Number(p.seuilMin), seuilMax: Number(p.seuilMax), prix: Number(p.prix),
        })),
      })
      for (let i = 0; i < images.length; i++) {
        setUploadProgress(`${i + 1}/${images.length}`)
        const fd = new FormData()
        fd.append('file', images[i].file)
        if (images[i].legende) fd.append('legende', images[i].legende)
        await uploadOpportuniteImage(created.id, fd)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Nouvelle opportunité</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Titre *</label>
              <input required value={form.titre} onChange={e => setField('titre', e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                rows={2} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Catégorie</label>
              <select value={form.categorie} onChange={e => setField('categorie', e.target.value)} className={inputCls}>
                <option value="">— Aucune —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className={labelCls}>Publication</label>
              <button type="button" onClick={() => setField('actif', !form.actif)}
                className={`inline-flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.actif ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                <span className={`relative h-4 w-8 rounded-full transition-colors ${form.actif ? 'bg-emerald-400' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${form.actif ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
                {form.actif ? 'Active immédiatement' : 'Brouillon'}
              </button>
            </div>
            <div>
              <label className={labelCls}>Prix normal (FCFA) *</label>
              <input required type="number" min="0" value={form.prixNormal}
                onChange={e => setField('prixNormal', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Seuil minimum *</label>
              <input required type="number" min="1" value={form.seuilMinimum}
                onChange={e => setField('seuilMinimum', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Seuil maximal <span className="font-normal normal-case text-slate-400 tracking-normal">(optionnel — stock limité)</span></label>
              <input type="number" min="1" value={form.seuilMaximal}
                onChange={e => setField('seuilMaximal', e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Date d'expiration *</label>
              <input required type="datetime-local" value={form.dateExpiration}
                onChange={e => setField('dateExpiration', e.target.value)} className={inputCls} />
            </div>
          </div>

          <PaliersEditor paliers={paliers} setPaliers={setPaliers} />

          <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-black text-slate-800">Partenaire fournisseur (optionnel)</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className={labelCls}>Nom</label><input value={form.partenaireNom} onChange={e => setField('partenaireNom', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Logo (URL)</label><input type="url" value={form.partenaireLogoUrl} onChange={e => setField('partenaireLogoUrl', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Contact privé</label><input value={form.partenaireContact} onChange={e => setField('partenaireContact', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Site / réseau social</label><input type="url" value={form.partenaireReseauxUrl} onChange={e => setField('partenaireReseauxUrl', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Montant dû</label><input type="number" min="0" value={form.montantDuPartenaire} onChange={e => setField('montantDuPartenaire', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Montant payé</label><input type="number" min="0" value={form.montantPayePartenaire} onChange={e => setField('montantPayePartenaire', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Alerte après (jours)</label><input type="number" min="1" value={form.delaiConfirmationReceptionJours} onChange={e => setField('delaiConfirmationReceptionJours', e.target.value)} className={inputCls} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Notification de livraison</label><textarea rows={2} maxLength={500} value={form.messageNotificationLivraison} onChange={e => setField('messageNotificationLivraison', e.target.value)} className={`${inputCls} resize-none`} /></div>
            </div>
          </details>

          <SpecsEditor titre={form.titre} description={form.description} categorie={form.categorie}
            specs={specs} setSpecs={setSpecs} />

          <div>
            <label className={`${labelCls} mb-2`}>Images <span className="font-normal normal-case text-slate-400 tracking-normal">(optionnel)</span></label>
            <ImagePicker images={images} onChange={setImages} />
          </div>

          {error && <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">{error}</div>}

          <div className="flex gap-2.5 pt-1">
            <button type="submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? (uploadProgress ? `Envoi image ${uploadProgress}…` : 'Création…') : "Créer l'opportunité"}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ExistingImages ────────────────────────────────────────────────────────────

function ExistingImages({ opportuniteId, images, setImages }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (imageId) => {
    setDeletingId(imageId)
    try {
      await deleteOpportuniteImage(opportuniteId, imageId)
      setImages(prev => prev.filter(img => img.id !== imageId))
    } catch {
      // Silencieux — l'image reste affichée si la suppression échoue
    } finally {
      setDeletingId(null)
    }
  }

  if (images.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {images.map(img => (
        <div key={img.id} className="group relative">
          <div className="aspect-square overflow-hidden rounded-xl border border-slate-100">
            <img src={imgUrl(img.url)} alt={img.legende || ''} className="h-full w-full object-cover" />
          </div>
          <button type="button" onClick={() => handleDelete(img.id)} disabled={deletingId === img.id}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100">
            {deletingId === img.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          </button>
          {img.legende && <p className="mt-1.5 truncate text-[11px] text-slate-400">{img.legende}</p>}
        </div>
      ))}
    </div>
  )
}

// ── ModifierOpportuniteModal ─────────────────────────────────────────────────

function ModifierOpportuniteModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    titre: item.titre || '',
    description: item.description || '',
    prixNormal: String(item.prixNormal ?? ''),
    seuilMinimum: String(item.seuilMinimum ?? ''),
    seuilMaximal: item.seuilMaximal != null ? String(item.seuilMaximal) : '',
    dateExpiration: item.dateExpiration ? item.dateExpiration.slice(0, 16) : '',
    categorie: item.categorie || '',
    partenaireNom: item.partenaireNom || '',
    partenaireLogoUrl: item.partenaireLogoUrl || '',
    partenaireContact: item.partenaireContact || '',
    partenaireReseauxUrl: item.partenaireReseauxUrl || '',
    montantDuPartenaire: String(item.montantDuPartenaire ?? 0),
    montantPayePartenaire: String(item.montantPayePartenaire ?? 0),
    delaiConfirmationReceptionJours: String(item.delaiConfirmationReceptionJours ?? 3),
    messageNotificationLivraison: item.messageNotificationLivraison || '',
  })
  const [paliers, setPaliers] = useState(
    [...(item.paliers || [])]
      .sort((a, b) => a.seuilMin - b.seuilMin)
      .map(p => ({ seuilMin: String(p.seuilMin), seuilMax: String(p.seuilMax), prix: String(p.prix) }))
  )
  const [specs, setSpecs] = useState({
    pointsForts: item.specsPointsForts || '',
    casUsage: item.specsCasUsage || '',
    finePrint: item.specsFinePrint || '',
  })
  const [existingImages, setExistingImages] = useState(item.images || [])
  const [newImages, setNewImages]         = useState([])
  const [loading, setLoading]             = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [error, setError]                 = useState('')

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await modifierOpportunite(item.id, {
        titre: form.titre || undefined,
        description: form.description || undefined,
        specsPointsForts: specs.pointsForts,
        specsCasUsage: specs.casUsage,
        specsFinePrint: specs.finePrint,
        prixNormal: form.prixNormal ? Number(form.prixNormal) : undefined,
        seuilMinimum: form.seuilMinimum ? Number(form.seuilMinimum) : undefined,
        seuilMaximal: form.seuilMaximal ? Number(form.seuilMaximal) : undefined,
        dateExpiration: form.dateExpiration ? new Date(form.dateExpiration).toISOString() : undefined,
        categorie: form.categorie || undefined,
        partenaireNom: form.partenaireNom,
        partenaireLogoUrl: form.partenaireLogoUrl,
        partenaireContact: form.partenaireContact,
        partenaireReseauxUrl: form.partenaireReseauxUrl,
        montantDuPartenaire: Number(form.montantDuPartenaire || 0),
        montantPayePartenaire: Number(form.montantPayePartenaire || 0),
        delaiConfirmationReceptionJours: Number(form.delaiConfirmationReceptionJours || 3),
        messageNotificationLivraison: form.messageNotificationLivraison,
        paliers: calculerPaliers(paliers).map(p => ({
          seuilMin: Number(p.seuilMin), seuilMax: Number(p.seuilMax), prix: Number(p.prix),
        })),
      })
      for (let i = 0; i < newImages.length; i++) {
        setUploadProgress(`${i + 1}/${newImages.length}`)
        const fd = new FormData()
        fd.append('file', newImages[i].file)
        if (newImages[i].legende) fd.append('legende', newImages[i].legende)
        await uploadOpportuniteImage(item.id, fd)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl py-2">
      <div className="w-full rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Modifier l'opportunité</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.titre}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Titre</label>
              <input value={form.titre} onChange={e => setField('titre', e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                rows={2} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Catégorie</label>
              <select value={form.categorie} onChange={e => setField('categorie', e.target.value)} className={inputCls}>
                <option value="">— Aucune —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prix normal (FCFA)</label>
              <input type="number" min="0" value={form.prixNormal}
                onChange={e => setField('prixNormal', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Seuil minimum</label>
              <input type="number" min="1" value={form.seuilMinimum}
                onChange={e => setField('seuilMinimum', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Seuil maximal <span className="font-normal normal-case text-slate-400 tracking-normal">(optionnel — stock limité)</span></label>
              <input type="number" min="1" value={form.seuilMaximal}
                onChange={e => setField('seuilMaximal', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Date d'expiration</label>
              <input type="datetime-local" value={form.dateExpiration}
                onChange={e => setField('dateExpiration', e.target.value)} className={inputCls} />
            </div>
          </div>

          <PaliersEditor paliers={paliers} setPaliers={setPaliers} />

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <h4 className="text-sm font-black text-slate-900">Partenaire et engagement financier</h4>
              <p className="mt-1 text-xs text-slate-500">Le partenaire est facultatif. Son contact reste réservé à l'administration ; son nom, logo et lien public peuvent apparaître côté client.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={labelCls}>Nom du partenaire</label><input value={form.partenaireNom} onChange={e => setField('partenaireNom', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Logo (URL)</label><input type="url" value={form.partenaireLogoUrl} onChange={e => setField('partenaireLogoUrl', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Contact privé</label><input value={form.partenaireContact} onChange={e => setField('partenaireContact', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Réseau social / site public</label><input type="url" value={form.partenaireReseauxUrl} onChange={e => setField('partenaireReseauxUrl', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Montant dû au partenaire</label><input type="number" min="0" value={form.montantDuPartenaire} onChange={e => setField('montantDuPartenaire', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Montant déjà payé</label><input type="number" min="0" value={form.montantPayePartenaire} onChange={e => setField('montantPayePartenaire', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Délai avant alerte (jours)</label><input type="number" min="1" value={form.delaiConfirmationReceptionJours} onChange={e => setField('delaiConfirmationReceptionJours', e.target.value)} className={inputCls} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Message envoyé quand une date est promise</label><textarea rows={3} maxLength={500} value={form.messageNotificationLivraison} onChange={e => setField('messageNotificationLivraison', e.target.value)} placeholder="Votre campagne a été validée. Votre livraison est prévue…" className={`${inputCls} resize-none`} /></div>
            </div>
          </section>

          <SpecsEditor titre={form.titre} description={form.description} categorie={form.categorie}
            specs={specs} setSpecs={setSpecs} />

          <div>
            <label className={`${labelCls} mb-2`}>Images</label>
            <ExistingImages opportuniteId={item.id} images={existingImages} setImages={setExistingImages} />
            <div className={existingImages.length > 0 ? 'mt-3' : ''}>
              <ImagePicker images={newImages} onChange={setNewImages} />
            </div>
          </div>

          {error && <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">{error}</div>}

          <div className="flex gap-2.5 pt-1">
            <button type="submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? (uploadProgress ? `Envoi image ${uploadProgress}…` : 'Enregistrement…') : 'Enregistrer'}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function OpportuniteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const refresh = useCallback(() => {
    setLoading(true)
    getAdminOpportunite(id).then(setItem).finally(() => setLoading(false))
  }, [id])
  useEffect(() => { refresh() }, [refresh])

  const activer = async (opportuniteId) => {
    setActionId(opportuniteId)
    try { await activerOpportunite(opportuniteId); refresh() } finally { setActionId(null) }
  }
  const cloturer = async (opportuniteId) => {
    setActionId(opportuniteId)
    try { await cloturerOpportunite(opportuniteId); refresh() } finally { setActionId(null) }
  }

  if (loading) return <Spinner py="py-24" />
  if (!item) return <EmptyState icon={Package} title="Opportunité introuvable" sub="Revenez à la liste et choisissez une autre campagne." />
  return <DetailDrawer item={item} onClose={() => navigate('/opportunites')} onActiver={activer} onCloturer={cloturer} onModifier={() => navigate(`/opportunites/${id}/modifier`)} actionId={actionId} />
}

export function ModifierOpportunitePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getAdminOpportunite(id).then(setItem).finally(() => setLoading(false))
  }, [id])
  if (loading) return <Spinner py="py-24" />
  if (!item) return <EmptyState icon={Package} title="Opportunité introuvable" />
  return <ModifierOpportuniteModal item={item} onClose={() => navigate(`/opportunites/${id}`)} onSaved={() => navigate(`/opportunites/${id}`)} />
}

export default function Opportunites() {
  const navigate = useNavigate()
  const [opportunites, setOpportunites] = useState([])
  const [loading, setLoading]           = useState(true)
  const [actionId, setActionId]         = useState(null)
  const [showModal, setShowModal]       = useState(false)
  const [categorieFiltre, setCategorieFiltre] = useState('TOUTES')
  const [statutListeFiltre, setStatutListeFiltre] = useState('TOUS')
  const [recherche, setRecherche] = useState('')
  const [triListe, setTriListe] = useState('RECENTES')
  const [filtresOuverts, setFiltresOuverts] = useState(false)

  const fetchData = () => {
    setLoading(true)
    getAdminOpportunites()
      .then(setOpportunites)
      .catch(() => setOpportunites([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  // Compteurs/prix/statut mis à jour en direct
  useSSE('events/opportunites', {
    COMPTEUR: ({ id, participantsActuels, prixActuel }) => {
      setOpportunites(prev => prev.map(op => op.id === id ? { ...op, participantsActuels, prixActuel } : op))
    },
    STATUT: ({ id, statut }) => {
      setOpportunites(prev => prev.map(op => op.id === id ? { ...op, statut } : op))
    },
  })

  const handleActiver  = async (id) => {
    setActionId(id)
    try { await activerOpportunite(id); fetchData() } catch { } finally { setActionId(null) }
  }
  const handleCloturer = async (id) => {
    setActionId(id)
    try { await cloturerOpportunite(id); fetchData() } catch { } finally { setActionId(null) }
  }

  const categories = Array.from(new Set(opportunites.map(o => o.categorie).filter(Boolean))).sort()
  const termesRecherche = normaliserRecherche(recherche).split(/\s+/).filter(Boolean)
  const opportunitesFiltrees = opportunites
    .filter(o => categorieFiltre === 'TOUTES' || o.categorie === categorieFiltre)
    .filter(o => statutListeFiltre === 'TOUS' || o.statut === statutListeFiltre)
    .filter(o => {
      if (termesRecherche.length === 0) return true
      const contenu = normaliserRecherche([
        o.titre, o.description, o.categorie, o.partenaireNom, o.partenaireContact, o.statut,
        o.prixNormal, o.participantsActuels,
      ].filter(Boolean).join(' '))
      return termesRecherche.every(terme => contenu.includes(terme))
    })
    .sort((a, b) => {
      if (triListe === 'EXPIRATION') return new Date(a.dateExpiration || 0) - new Date(b.dateExpiration || 0)
      if (triListe === 'PARTICIPANTS') return Number(b.participantsActuels || 0) - Number(a.participantsActuels || 0)
      if (triListe === 'PRIX_ASC') return Number(a.prixNormal || 0) - Number(b.prixNormal || 0)
      if (triListe === 'PRIX_DESC') return Number(b.prixNormal || 0) - Number(a.prixNormal || 0)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
  const nombreFiltresActifs = (categorieFiltre !== 'TOUTES' ? 1 : 0) + (statutListeFiltre !== 'TOUS' ? 1 : 0) + (recherche.trim() ? 1 : 0)
  const reinitialiserFiltres = () => {
    setCategorieFiltre('TOUTES')
    setStatutListeFiltre('TOUS')
    setRecherche('')
    setTriListe('RECENTES')
  }

  return (
    <div className="space-y-4">
      {showModal && (
        <NouvelleOpportuniteModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData() }}
        />
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[13px] font-bold text-slate-900">Opportunités</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {opportunites.length} opportunité{opportunites.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-800 transition shadow-sm shadow-violet-200"
        >
          <Plus size={15} /> Nouvelle opportunité
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={recherche} onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher par produit, catégorie, partenaire…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-50" />
            {recherche && (
              <button onClick={() => setRecherche('')} aria-label="Effacer la recherche"
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setFiltresOuverts(v => !v)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${filtresOuverts || nombreFiltresActifs > 0 ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
            <SlidersHorizontal size={16} /> Filtres
            {nombreFiltresActifs > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-700 px-1 text-[10px] text-white">{nombreFiltresActifs}</span>}
          </button>
          <div className="text-right lg:min-w-28">
            <p className="text-lg font-black tabular-nums text-slate-900">{opportunitesFiltrees.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">résultat{opportunitesFiltrees.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {filtresOuverts && (
          <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Catégorie</span>
              <select value={categorieFiltre} onChange={e => setCategorieFiltre(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400">
                <option value="TOUTES">Toutes les catégories ({opportunites.length})</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat} ({opportunites.filter(o => o.categorie === cat).length})</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Statut</span>
              <select value={statutListeFiltre} onChange={e => setStatutListeFiltre(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400">
                <option value="TOUS">Tous les statuts</option>
                {Object.entries(STATUT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2 xl:col-span-1">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Trier par</span>
              <select value={triListe} onChange={e => setTriListe(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400">
                <option value="RECENTES">Création la plus récente</option>
                <option value="EXPIRATION">Expiration la plus proche</option>
                <option value="PARTICIPANTS">Plus de participants</option>
                <option value="PRIX_ASC">Prix croissant</option>
                <option value="PRIX_DESC">Prix décroissant</option>
              </select>
            </label>
          </div>
        )}

        {nombreFiltresActifs > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filtres actifs</span>
            {recherche.trim() && <button onClick={() => setRecherche('')} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Recherche : “{recherche.trim()}” <X size={12} /></button>}
            {categorieFiltre !== 'TOUTES' && <button onClick={() => setCategorieFiltre('TOUTES')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100">Catégorie : {categorieFiltre} <X size={12} /></button>}
            {statutListeFiltre !== 'TOUS' && <button onClick={() => setStatutListeFiltre('TOUS')} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100">Statut : {STATUT_LABEL[statutListeFiltre]} <X size={12} /></button>}
            <button onClick={reinitialiserFiltres} className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"><RotateCcw size={12} /> Tout effacer</button>
          </div>
        )}
      </div>

      <Card noPad>
        {loading ? (
          <Spinner py="py-12" />
        ) : opportunitesFiltrees.length === 0 ? (
          <EmptyState icon={Package}
            title={opportunites.length === 0 ? 'Aucune opportunité' : 'Aucun résultat'}
            sub={opportunites.length === 0 ? 'Créez votre première opportunité.' : 'Modifiez la recherche ou retirez certains filtres.'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Produit</Th>
                <Th>Prix normal</Th>
                <Th>Avancement</Th>
                <Th>Expiration</Th>
                <Th>Statut</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {opportunitesFiltrees.map(item => {
                const pct = item.seuilMinimum > 0
                  ? Math.min(100, Math.round((item.participantsActuels / item.seuilMinimum) * 100))
                  : 0
                return (
                  <Tr key={item.id}>
                    <Td>
                      <div className="font-semibold text-slate-900 text-[12.5px]">{item.titre}</div>
                      {item.categorie && <div className="text-[10.5px] font-medium text-violet-500 mt-0.5">{item.categorie}</div>}
                      {item.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-[180px] truncate">{item.description}</div>
                      )}
                    </Td>
                    <Td><span className="font-semibold tabular-nums">{formatMontant(item.prixNormal)} FCFA</span></Td>
                    <Td className="w-44">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-500 tabular-nums">{item.participantsActuels}</span>
                        <span className="text-[10px] text-slate-400">/{item.seuilMinimum}</span>
                      </div>
                      <ProgressBar value={pct} color="indigo" />
                      <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{pct}%</div>
                      {item.seuilMaximal != null && (
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5 tabular-nums">
                          {Math.max(0, item.seuilMaximal - item.participantsActuels)} place{Math.max(0, item.seuilMaximal - item.participantsActuels) > 1 ? 's' : ''} restante{Math.max(0, item.seuilMaximal - item.participantsActuels) > 1 ? 's' : ''} (max {item.seuilMaximal})
                        </div>
                      )}
                    </Td>
                    <Td><span className="text-[12px] text-slate-500">{formatDate(item.dateExpiration)}</span></Td>
                    <Td><Badge color={STATUT_COLOR[item.statut] || 'gray'}>{STATUT_LABEL[item.statut] || item.statut}</Badge></Td>
                    <Td>
                      <div className="flex gap-1.5 items-center">
                        <button onClick={() => navigate(`/opportunites/${item.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition">
                          <Eye size={11} /> Détails
                        </button>
                        <button onClick={() => navigate(`/opportunites/${item.id}/modifier`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition">
                          <Edit2 size={11} /> Modifier
                        </button>
                        {item.statut === 'BROUILLON' && (
                          <button onClick={() => handleActiver(item.id)} disabled={actionId === item.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50">
                            {actionId === item.id ? <Loader2 size={11} className="animate-spin" /> : null}
                            Activer
                          </button>
                        )}
                        {item.statut === 'ACTIVE' && (
                          <button onClick={() => handleCloturer(item.id)} disabled={actionId === item.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 transition disabled:opacity-50">
                            {actionId === item.id ? <Loader2 size={11} className="animate-spin" /> : null}
                            Clôturer
                          </button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
