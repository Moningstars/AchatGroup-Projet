import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2, Plus, Trash2, X, Upload, Package, Eye, Users, CalendarClock, Layers, Image, Edit2, Sparkles, Search, Download, Clock, CheckSquare, CalendarDays, UserCheck, ArrowLeft, ClipboardList, Truck, PackageCheck, AlertTriangle, Flag, Route } from 'lucide-react'
import { Badge, Card, Table, Th, Td, Tr, Spinner, EmptyState, ProgressBar, FilterPill } from '../components/ui'
import { useSSE } from '../hooks/useSSE'
import {
  getAdminOpportunites, activerOpportunite, cloturerOpportunite,
  creerOpportunite, modifierOpportunite, uploadOpportuniteImage, deleteOpportuniteImage,
  genererSpecsOpportunite, getParticipantsOpportunite, planifierParticipantsOpportunite, mettreAJourLivraisonParticipants,
} from '../services/api'

const BACKEND = `http://${window.location.hostname}:8080`
const imgUrl = (url) => url ? (url.startsWith('http') ? url : BACKEND + url) : null

const CATEGORIES = ['Mode', 'Électronique', 'Véhicules', 'Maison', 'Alimentaire', 'Informatique', 'Beauté', 'Mobilier', 'Sport']

function formatMontant(val) { return Number(val || 0).toLocaleString('fr-FR') }
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
  EN_ATTENTE_QUOTA: 'Quota non validé',
  A_PREPARER: 'À préparer',
  PREPARATION: 'Préparation',
  PRET_LIVRAISON: 'Prêt',
  EN_LIVRAISON: 'En livraison',
  LIVRE_A_CONFIRMER: 'Remis — à confirmer',
  LIVRE_CONFIRME: 'Reçu confirmé',
  ECHEC_LIVRAISON: 'Échec livraison',
  LITIGE: 'Litige',
  ANNULE: 'Annulé',
}
const STATUT_LIVRAISON_OPTIONS = [
  'A_PREPARER',
  'PREPARATION',
  'PRET_LIVRAISON',
  'EN_LIVRAISON',
  'LIVRE_A_CONFIRMER',
  'LIVRE_CONFIRME',
  'ECHEC_LIVRAISON',
  'LITIGE',
  'ANNULE',
]
const ETAPES_LIVRAISON = [
  { key: 'A_PREPARER', label: 'À préparer', hint: 'Créer le lot' },
  { key: 'PREPARATION', label: 'Préparation', hint: 'Colis en cours' },
  { key: 'PRET_LIVRAISON', label: 'Prêt', hint: 'Remise livreur' },
  { key: 'EN_LIVRAISON', label: 'En route', hint: 'Suivi terrain' },
  { key: 'LIVRE_A_CONFIRMER', label: 'À confirmer', hint: 'Attente client' },
  { key: 'LIVRE_CONFIRME', label: 'Terminé', hint: 'Reçu confirmé' },
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
  const [livraisonFiltre, setLivraisonFiltre] = useState('TOUS')
  const [bulkLivraison, setBulkLivraison] = useState('PREPARATION')
  const [bulkDeliveryInfo, setBulkDeliveryInfo] = useState({ transporteur: '', referenceLivraison: '', dateLivraisonPrevue: '', noteLivraison: '' })
  const [savingLivraison, setSavingLivraison] = useState(false)

  useEffect(() => {
    if (!item) return
    setSelectedIds([])
    setSearchParticipant('')
    setStatutFiltre('TOUS')
    setPlanningFiltre('TOUS')
    setLivraisonFiltre('TOUS')
    setBulkSlot(todaySlot())
    setBulkLivraison('PREPARATION')
    setBulkDeliveryInfo({ transporteur: '', referenceLivraison: '', dateLivraisonPrevue: '', noteLivraison: '' })
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
        ? { icon: Truck, title: 'Suivre les livreurs', text: `${livraisonCounts.EN_LIVRAISON} livraison(s) sont actuellement en route.`, color: 'sky' }
        : (livraisonCounts.A_PREPARER || 0) + (livraisonCounts.PREPARATION || 0) + (livraisonCounts.PRET_LIVRAISON || 0) > 0
          ? { icon: ClipboardList, title: 'Préparer le prochain lot', text: 'Sélectionnez les participants à traiter aujourd’hui puis avancez le statut du lot.', color: 'violet' }
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
      const matchesLivraison = livraisonFiltre === 'TOUS' || p.statutLivraison === livraisonFiltre || (livraisonFiltre === 'PRIORITAIRES' && p.prioriteTraitement)
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
      transporteur: bulkDeliveryInfo.transporteur || undefined,
      referenceLivraison: bulkDeliveryInfo.referenceLivraison || undefined,
      dateLivraisonPrevue: bulkDeliveryInfo.dateLivraisonPrevue ? new Date(bulkDeliveryInfo.dateLivraisonPrevue).toISOString() : undefined,
      noteLivraison: bulkDeliveryInfo.noteLivraison || undefined,
    })
  }
  const exportRows = (rows) => {
    const header = ['Nom', 'Téléphone', 'Quantité', 'Montant gelé', 'Statut paiement', 'Statut livraison', 'Progression livraison', 'Priorité', 'Inscription', 'Créneau traitement', 'Livraison prévue', 'Transporteur', 'Référence', 'Note admin', 'Note livraison', 'Commentaire participant', 'ID participant', 'ID utilisateur']
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
        p.transporteur || '',
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
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-3 sm:p-5">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
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
            <div className="flex flex-wrap gap-2">
              <button onClick={() => exportRows(filteredParticipants)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Download size={15} /> Exporter filtrés
              </button>
              <button onClick={() => onModifier(item)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
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
              <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                <X size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              <div className="min-w-[220px]">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Complétion livraison</span>
                  <span>{livraisonMoyenne}%</span>
                </div>
                <ProgressBar value={livraisonMoyenne} color={livraisonMoyenne >= 90 ? 'emerald' : livraisonMoyenne >= 50 ? 'sky' : 'amber'} />
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-6">
              {ETAPES_LIVRAISON.map((step, index) => {
                const count = livraisonCounts[step.key] || 0
                const active = count > 0
                return (
                  <button key={step.key} onClick={() => setLivraisonFiltre(step.key)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      active ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
                        active ? 'bg-violet-700 text-white' : 'bg-white text-slate-400'
                      }`}>{index + 1}</span>
                      <span className={`text-xs font-black tabular-nums ${active ? 'text-violet-800' : 'text-slate-400'}`}>{count}</span>
                    </div>
                    <p className={`mt-2 text-xs font-black ${active ? 'text-violet-900' : 'text-slate-600'}`}>{step.label}</p>
                    <p className="text-[10px] text-slate-400">{step.hint}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <aside className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Suivi livraison</p>
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
                <div className="mt-3 space-y-2">
                  {['EN_ATTENTE_QUOTA', 'A_PREPARER', 'PREPARATION', 'PRET_LIVRAISON', 'EN_LIVRAISON', 'LIVRE_A_CONFIRMER', 'LIVRE_CONFIRME', 'LITIGE'].map(status => (
                    <div key={status} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-slate-500">{STATUT_LIVRAISON_LABEL[status]}</span>
                      <span className="font-black tabular-nums text-slate-900">{livraisonCounts[status] || 0}</span>
                    </div>
                  ))}
                </div>
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
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                      <Users size={17} className="text-violet-600" /> Participants à traiter
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Filtrez, cochez les personnes du lot du jour, puis appliquez une action. {filteredParticipants.length} visible(s), {selectedParticipants.length} sélectionné(s).
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => exportRows(selectedParticipants)} disabled={selectedParticipants.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                      <Download size={14} /> Export sélection
                    </button>
                    <button onClick={() => planSelected(todaySlot())} disabled={selectedParticipants.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-40">
                      <UserCheck size={14} /> Traiter aujourd'hui
                    </button>
                    <button onClick={() => planSelected(tomorrowSlot())} disabled={selectedParticipants.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40">
                      <CalendarDays size={14} /> Décaler demain
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
                    <option value="TOUS">Toute livraison</option>
                    <option value="PRIORITAIRES">Prioritaires</option>
                    <option value="EN_ATTENTE_QUOTA">Quota non validé</option>
                    <option value="A_PREPARER">À préparer</option>
                    <option value="PREPARATION">Préparation</option>
                    <option value="PRET_LIVRAISON">Prêt</option>
                    <option value="EN_LIVRAISON">En livraison</option>
                    <option value="LIVRE_A_CONFIRMER">À confirmer</option>
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
                  <div className="mt-4 grid gap-3 lg:grid-cols-[180px_180px_1fr_1fr_auto]">
                    <select value={bulkLivraison} onChange={e => setBulkLivraison(e.target.value)}
                      className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500">
                      {STATUT_LIVRAISON_OPTIONS.map(status => (
                        <option key={status} value={status}>{STATUT_LIVRAISON_LABEL[status]}</option>
                      ))}
                    </select>
                    <input type="datetime-local" value={bulkDeliveryInfo.dateLivraisonPrevue}
                      onChange={e => setBulkDeliveryInfo(v => ({ ...v, dateLivraisonPrevue: e.target.value }))}
                      title="Date de livraison prévue"
                      className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
                    <input value={bulkDeliveryInfo.transporteur}
                      onChange={e => setBulkDeliveryInfo(v => ({ ...v, transporteur: e.target.value }))}
                      placeholder="Livreur ou transporteur"
                      className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
                    <input value={bulkDeliveryInfo.referenceLivraison}
                      onChange={e => setBulkDeliveryInfo(v => ({ ...v, referenceLivraison: e.target.value }))}
                      placeholder="Référence colis"
                      className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
                    <button onClick={applyBulkLivraison} disabled={savingLivraison}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-40">
                      {savingLivraison ? <Loader2 size={13} className="animate-spin" /> : <Route size={13} />}
                      Appliquer au lot
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
                  <EmptyState icon={Users} title="Aucun participant dans cette vue" sub="Modifiez les filtres ou attendez les nouvelles participations." />
                ) : (
                  <div className="overflow-x-auto">
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
                          <Th>Suivi</Th>
                          <Th>Planning</Th>
                          <Th>Livraison</Th>
                          <Th>Action rapide</Th>
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
                                  <Badge color={STATUT_PARTICIPATION_COLOR[p.statut] || 'gray'}>{STATUT_PARTICIPATION_LABEL[p.statut] || p.statut}</Badge>
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
                                  <p><span className="font-bold text-slate-700">Prévue :</span> {formatDateTime(p.dateLivraisonPrevue)}</p>
                                  <p><span className="font-bold text-slate-700">Livreur :</span> {p.transporteur || '—'}</p>
                                  <p><span className="font-bold text-slate-700">Réf. :</span> {p.referenceLivraison || '—'}</p>
                                  {p.noteLivraison && <p className="text-slate-400">{p.noteLivraison}</p>}
                                  {p.dateConfirmationParticipant && (
                                    <p className="font-bold text-emerald-700">Confirmé le {formatDateTime(p.dateConfirmationParticipant)}</p>
                                  )}
                                </div>
                              </Td>
                              <Td>
                                <div className="flex flex-col gap-1.5">
                                  <select value={p.statutLivraison || 'EN_ATTENTE_QUOTA'}
                                    onChange={e => updateLivraison([p.id], { statutLivraison: e.target.value })}
                                    className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-violet-400">
                                    <option value="EN_ATTENTE_QUOTA">Quota non validé</option>
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
                )}
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900"><CheckSquare size={16} className="text-emerald-600" /> Traitement conseillé</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">Une fois le quota validé, passez les participants en préparation, traitez d'abord les prioritaires, puis avancez les statuts jusqu'à “Remis — à confirmer”.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Truck size={16} className="text-sky-600" /> Livraison suivie</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">Chaque participant a son statut logistique, une progression, un livreur, une référence et une confirmation finale côté participant.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarClock size={16} className="text-amber-600" /> Décalage</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">Planifiez aujourd’hui, demain ou un créneau précis ; les autres restent non planifiés pour un autre horaire, sans perdre leur suivi.</p>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
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

export default function Opportunites() {
  const [opportunites, setOpportunites] = useState([])
  const [loading, setLoading]           = useState(true)
  const [actionId, setActionId]         = useState(null)
  const [showModal, setShowModal]       = useState(false)
  const [detailItem, setDetailItem]     = useState(null)
  const [editItem, setEditItem]         = useState(null)
  const [categorieFiltre, setCategorieFiltre] = useState('TOUTES')

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
    setDetailItem(prev => prev?.id === id ? { ...prev, statut: 'ACTIVE' } : prev)
  }
  const handleCloturer = async (id) => {
    setActionId(id)
    try { await cloturerOpportunite(id); fetchData() } catch { } finally { setActionId(null) }
    setDetailItem(prev => prev?.id === id ? { ...prev, statut: 'CLOTUREE' } : prev)
  }

  const categories = Array.from(new Set(opportunites.map(o => o.categorie).filter(Boolean))).sort()
  const opportunitesFiltrees = categorieFiltre === 'TOUTES'
    ? opportunites
    : opportunites.filter(o => o.categorie === categorieFiltre)

  return (
    <div className="space-y-4">
      {showModal && (
        <NouvelleOpportuniteModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData() }}
        />
      )}
      {editItem && (
        <ModifierOpportuniteModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); fetchData() }}
        />
      )}
      <DetailDrawer
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onActiver={handleActiver}
        onCloturer={handleCloturer}
        onModifier={(item) => { setDetailItem(null); setEditItem(item) }}
        actionId={actionId}
      />

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

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill label={`Toutes (${opportunites.length})`} active={categorieFiltre === 'TOUTES'}
            onClick={() => setCategorieFiltre('TOUTES')} />
          {categories.map(cat => (
            <FilterPill key={cat}
              label={`${cat} (${opportunites.filter(o => o.categorie === cat).length})`}
              active={categorieFiltre === cat}
              onClick={() => setCategorieFiltre(cat)} />
          ))}
        </div>
      )}

      <Card noPad>
        {loading ? (
          <Spinner py="py-12" />
        ) : opportunitesFiltrees.length === 0 ? (
          <EmptyState icon={Package}
            title={categorieFiltre === 'TOUTES' ? 'Aucune opportunité' : 'Aucune opportunité dans cette catégorie'}
            sub={categorieFiltre === 'TOUTES' ? 'Créez votre première opportunité.' : undefined} />
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
                        <button onClick={() => setDetailItem(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition">
                          <Eye size={11} /> Détails
                        </button>
                        <button onClick={() => setEditItem(item)}
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
