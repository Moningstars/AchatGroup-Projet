import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, Plus, Trash2, X, Upload, Package, Eye, Users, CalendarClock, Layers, Edit2, Sparkles, Search, Download, Clock, CheckSquare, CalendarDays, UserCheck, ArrowLeft, ArrowRight, ClipboardList, Truck, PackageCheck, AlertTriangle, Flag, Route, SlidersHorizontal, RotateCcw, ChevronDown, Check, FileText, BadgeDollarSign, Building2, ImagePlus, CircleCheck } from 'lucide-react'
import { Badge, Card, Table, Th, Td, Tr, Spinner, EmptyState, ProgressBar, Pagination } from '../components/ui'
import { useSSE } from '../hooks/useSSE'
import {
  getAdminOpportunites, getAdminOpportunite, activerOpportunite, cloturerOpportunite,
  creerOpportunite, modifierOpportunite, uploadOpportuniteImage, deleteOpportuniteImage,
  genererSpecsOpportunite, getParticipantsOpportunite, planifierParticipantsOpportunite, mettreAJourLivraisonParticipants,
  getAdminFournisseurs, getTentativesSouscriptionEchouees,
} from '../services/api'
import { calculerProgression } from '../utils/progression'

const BACKEND = `http://${window.location.hostname}:8080`
const imgUrl = (url) => url ? (url.startsWith('http') ? url : BACKEND + url) : null

function useFournisseursDisponibles() {
  const [fournisseurs, setFournisseurs] = useState([])

  useEffect(() => {
    let cancelled = false
    getAdminFournisseurs()
      .then(items => {
        if (!cancelled) setFournisseurs(items.filter(item => item.statut !== 'SUSPENDU'))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return fournisseurs
}

function nomPublicFournisseur(fournisseur) {
  return fournisseur?.societe?.trim() || fournisseur?.nom?.trim()
}

function contactFournisseur(fournisseur) {
  return [fournisseur?.telephone, fournisseur?.email].filter(Boolean).join(' · ')
}

function ParticipantLink({ participant, compact = false }) {
  const nom = participant.nom || 'Participant sans nom'
  return (
    <span className="group relative inline-flex max-w-full">
      <Link
        to={`/utilisateurs?focus=${encodeURIComponent(participant.utilisateurId || '')}`}
        className="inline-flex max-w-full items-center gap-1 font-bold text-slate-900 decoration-violet-300 underline-offset-4 hover:text-violet-700 hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span className="truncate">{nom}</span>
        <ArrowRight size={12} className="shrink-0 text-violet-500" />
      </Link>
      <span className={`pointer-events-none absolute left-0 z-30 hidden w-56 rounded-xl border border-slate-200 bg-slate-950 px-3 py-2.5 text-left shadow-xl group-hover:block group-focus-within:block ${compact ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
        <span className="block text-xs font-black text-white">{nom}</span>
        <span className="mt-1 block text-[10px] text-slate-300">{participant.telephone || 'Téléphone non renseigné'}</span>
        <span className="mt-0.5 block text-[10px] text-slate-400">Inscription : {formatDateTime(participant.createdAt)}</span>
        <span className="mt-1.5 block text-[10px] font-bold text-violet-300">Ouvrir la fiche utilisateur →</span>
      </span>
    </span>
  )
}

const CATEGORIES = ['Mode', 'Électronique', 'Véhicules', 'Maison', 'Alimentaire', 'Informatique', 'Beauté', 'Mobilier', 'Sport']
const MESSAGE_PARTAGE_DEFAUT = "🔥 Bon plan OpportuniHub !\n\nDécouvrez « {titre} » à partir de {prix} FCFA grâce à l’achat groupé.\n⏳ Rejoignez l’offre avant sa clôture et profitez du meilleur tarif.\n\n👉 Voir l’offre et participer :"
const CREATION_STEPS = [
  { label: 'Présentation', short: 'Opportunité', icon: FileText },
  { label: 'Tarification', short: 'Prix', icon: BadgeDollarSign },
  { label: 'Fournisseur', short: 'Fournisseur', icon: Building2 },
  { label: 'Contenu', short: 'Médias', icon: ImagePlus },
  { label: 'Vérification', short: 'Validation', icon: CircleCheck },
]

function FilterSelect({ label, value, onChange, options, className = '', compact = false, icon: Icon }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = options.find(option => option.value === value) || options[0]

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={event => event.key === 'Escape' && setOpen(false)}>
      {!compact && <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</span>}
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 text-left font-semibold outline-none transition ${compact ? 'h-10 text-[11px]' : 'h-10 text-[12px]'} ${open ? 'border-violet-300 bg-white ring-4 ring-violet-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}>
        <span className="flex min-w-0 items-center gap-2 text-slate-700">{Icon && <Icon size={13} className="shrink-0 text-violet-500" />}<span className="truncate">{selected?.label}</span></span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-violet-600' : ''}`} />
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lift">
          {options.map(option => {
            const active = option.value === value
            return (
              <button key={option.value} type="button" role="option" aria-selected={active}
                onClick={() => { onChange(option.value); setOpen(false) }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[12px] font-semibold transition ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                <span>{option.label}</span>
                {active && <Check size={13} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
  PREPARATION: 'Lot transmis au fournisseur',
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
const STATUT_LIVRAISON_MANUEL_OPTIONS = [
  'PREPARATION',
  'PRET_LIVRAISON',
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
  const [participantsPage, setParticipantsPage] = useState(1)
  const [dateDebutFiltre, setDateDebutFiltre] = useState('')
  const [dateFinFiltre, setDateFinFiltre] = useState('')

  useEffect(() => setParticipantsPage(1), [searchParticipant, statutFiltre, planningFiltre, livraisonFiltre, dateDebutFiltre, dateFinFiltre])

  useEffect(() => {
    if (!item) return
    let cancelled = false
    getParticipantsOpportunite(item.id)
      .then(data => {
        if (cancelled) return
        setParticipants(data)
        setPlan(Object.fromEntries(
          data
            .filter(p => p.creneauTraitement || p.noteTraitement)
            .map(p => [p.id, { slot: p.creneauTraitement ? p.creneauTraitement.slice(0, 16) : '', note: p.noteTraitement || '' }])
        ))
      })
      .catch(() => { if (!cancelled) setParticipants([]) })
      .finally(() => { if (!cancelled) setLoadingParticipants(false) })
    return () => { cancelled = true }
  }, [item])

  if (!item) return null
  const { pct, valide: seuilValide, phase: phaseProgression, placesRestantes: placesRestantesCalc } = calculerProgression(item)
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
  const placesRestantes = phaseProgression === 'plafond' ? placesRestantesCalc : null
  const joursRestants = item.dateExpiration ? Math.ceil((new Date(item.dateExpiration) - new Date()) / 86400000) : null
  const couvertureUrl = images[0]?.url ? imgUrl(images[0].url) : null
  const prochaineAction = livraisonsProblemes > 0
    ? { icon: AlertTriangle, title: 'Traiter les problèmes', text: `${livraisonsProblemes} livraison(s) en échec ou litige demandent une action humaine.`, color: 'rose' }
    : livraisonEnAttenteConfirmation > 0
      ? { icon: PackageCheck, title: 'Relancer les confirmations', text: `${livraisonEnAttenteConfirmation} participant(s) doivent confirmer la réception.`, color: 'amber' }
      : (livraisonCounts.EN_LIVRAISON || 0) > 0
        ? { icon: Truck, title: 'Contrôler les dates promises', text: `${livraisonCounts.EN_LIVRAISON} participant(s) ont une livraison annoncée par le fournisseur.`, color: 'sky' }
        : (livraisonCounts.A_PREPARER || 0) + (livraisonCounts.PREPARATION || 0) + (livraisonCounts.PRET_LIVRAISON || 0) > 0
          ? { icon: ClipboardList, title: 'Transmettre le prochain lot', text: 'Sélectionnez les participants, exportez la liste et consignez la réponse du fournisseur.', color: 'violet' }
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
        || (livraisonFiltre === 'PROBLEMES' && (['ECHEC_LIVRAISON', 'LITIGE'].includes(p.statutLivraison) || p.confirmationEnRetard))
        || (livraisonFiltre === 'CONFIRMATIONS' && p.statutLivraison === 'LIVRE_A_CONFIRMER')
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
      const inscriptionDate = p.createdAt ? new Date(p.createdAt) : null
      const debutOk = !dateDebutFiltre || (inscriptionDate && inscriptionDate >= new Date(`${dateDebutFiltre}T00:00:00`))
      const finOk = !dateFinFiltre || (inscriptionDate && inscriptionDate <= new Date(`${dateFinFiltre}T23:59:59`))
      return matchesSearch && matchesStatut && matchesLivraison && matchesPlanning && debutOk && finOk
    }).sort((a, b) => {
      const quantiteDiff = Number(b.quantite || 0) - Number(a.quantite || 0)
      if (quantiteDiff !== 0) return quantiteDiff

      const montantDiff = Number(b.montantGele || 0) - Number(a.montantGele || 0)
      if (montantDiff !== 0) return montantDiff

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
  })()

  const participantsPageItems = filteredParticipants.slice((participantsPage - 1) * 10, participantsPage * 10)
  const selectedParticipants = filteredParticipants.filter(p => selectedIds.includes(p.id))
  const allVisibleSelected = participantsPageItems.length > 0 && participantsPageItems.every(p => selectedIds.includes(p.id))
  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(ids => ids.filter(id => !participantsPageItems.some(p => p.id === id)))
    } else {
      setSelectedIds(ids => Array.from(new Set([...ids, ...participantsPageItems.map(p => p.id)])))
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
    const header = ['Nom', 'Téléphone', 'Quantité', 'Montant gelé', 'Statut paiement', 'État du dossier', 'Avancement', 'Priorité', 'Inscription', 'Lot prévu', 'Date promise par le fournisseur', 'Référence fournisseur', 'Note admin', 'Note fournisseur', 'Confirmation participant', 'ID participant', 'ID utilisateur']
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
        <div className="border-b border-slate-200 bg-white p-4 sm:px-5">
          <button onClick={onClose} className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-violet-700">
            <ArrowLeft size={14} /> Retour aux opportunités
          </button>
          <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)_auto] md:items-center xl:grid-cols-[210px_minmax(0,1fr)_auto]">
            <div className="relative h-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-36 md:h-28">
              {couvertureUrl ? (
                <img src={couvertureUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400">
                  <ImagePlus size={21} />
                  <span className="text-[11px] font-bold">Aucune photo</span>
                </div>
              )}
              <button onClick={() => onModifier(item)}
                className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-black text-slate-700 shadow-sm backdrop-blur hover:bg-white">
                <ImagePlus size={13} /> {couvertureUrl ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{item.titre}</h2>
                <Badge color={STATUT_COLOR[item.statut] || 'gray'}>{STATUT_LABEL[item.statut] || item.statut}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                {item.categorie && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 font-black text-violet-700">{item.categorie}</span>
                )}
                <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> Créée le {formatDate(item.createdAt)}</span>
                <span className="inline-flex items-center gap-1"><Clock size={12} /> Échéance {formatDate(item.dateExpiration)}</span>
              </div>
              {item.description && <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-slate-500">{item.description}</p>}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 md:self-start sm:w-auto">
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
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid items-center gap-3 xl:grid-cols-[minmax(220px,1fr)_170px_minmax(390px,1.35fr)]">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  prochaineAction.color === 'rose' ? 'bg-rose-50 text-rose-600'
                    : prochaineAction.color === 'amber' ? 'bg-amber-50 text-amber-600'
                    : prochaineAction.color === 'sky' ? 'bg-sky-50 text-sky-600'
                    : prochaineAction.color === 'violet' ? 'bg-violet-50 text-violet-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <prochaineAction.icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black leading-5 text-slate-950">{prochaineAction.title}</p>
                  <p className="truncate text-[11px] text-slate-500" title={prochaineAction.text}>{prochaineAction.text}</p>
                </div>
              </div>
              <div className="w-full">
                <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
                  <span>Avancement</span>
                  <span className="text-slate-700">{livraisonMoyenne}%</span>
                </div>
                <ProgressBar value={livraisonMoyenne} color={livraisonMoyenne >= 90 ? 'emerald' : livraisonMoyenne >= 50 ? 'sky' : 'amber'} />
              </div>
              <div className="grid grid-cols-3 gap-2">
              {ETAPES_LIVRAISON.map((step, index) => {
                const count = step.statuses.reduce((sum, status) => sum + (livraisonCounts[status] || 0), 0)
                const active = count > 0
                return (
                  <button key={step.key} onClick={() => setLivraisonFiltre(step.key)}
                    title={step.hint}
                    className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                      active ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                        active ? 'bg-violet-700 text-white' : 'bg-white text-slate-400'
                      }`}>{index + 1}</span>
                    <span className="min-w-0">
                      <span className={`block truncate text-[11px] font-black ${active ? 'text-violet-900' : 'text-slate-600'}`}>{step.label}</span>
                      <span className={`block text-[10px] font-bold tabular-nums ${active ? 'text-violet-600' : 'text-slate-400'}`}>{count} dossier{count > 1 ? 's' : ''}</span>
                    </span>
                  </button>
                )
              })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section aria-label="Indicateurs clés" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Prix de base</p><BadgeDollarSign size={14} className="text-slate-300" /></div>
                  <p className="mt-1.5 text-lg font-black text-slate-950 tabular-nums">{formatMontant(item.prixNormal)} <span className="text-[9px] font-bold text-slate-400">FCFA</span></p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Prix actuel</p><Sparkles size={14} className="text-emerald-500" /></div>
                  <p className="mt-1.5 text-lg font-black text-emerald-800 tabular-nums">{formatMontant(prixActuel)} <span className="text-[9px] font-bold text-emerald-600">FCFA</span></p>
                  <p className="text-[9px] font-bold text-emerald-600">Économie {formatMontant(economies)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Participants</p><Users size={14} className="text-violet-400" /></div>
                  <p className="mt-1.5 text-lg font-black text-slate-950 tabular-nums">
                    {seuilValide
                      ? phaseProgression === 'plafond' ? `${item.participantsActuels} / ${item.seuilMaximal}` : `${item.participantsActuels} — validé`
                      : `${item.participantsActuels} / ${item.seuilMinimum}`}
                  </p>
                  <ProgressBar value={pct} color="indigo" className="mt-1.5" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Quantités</p><Package size={14} className="text-sky-400" /></div>
                  <p className="mt-1.5 text-lg font-black text-slate-950 tabular-nums">{totalQuantites}</p>
                  <p className="text-[9px] text-slate-400">unités réservées</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Montant gelé</p><ClipboardList size={14} className="text-amber-400" /></div>
                  <p className="mt-1.5 truncate text-lg font-black text-slate-950 tabular-nums" title={`${formatMontant(totalMontantGele)} FCFA`}>{formatMontant(totalMontantGele)} <span className="text-[9px] font-bold text-slate-400">FCFA</span></p>
                  <p className="text-[9px] text-slate-400">dépôts validés</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Temps restant</p><Clock size={14} className="text-rose-400" /></div>
                  <p className="mt-1.5 text-lg font-black text-slate-950">{joursRestants == null ? '—' : `${Math.max(0, joursRestants)} j`}</p>
                  <p className="text-[9px] text-slate-400">jusqu’au {formatDate(item.dateExpiration)}</p>
                </div>
            </section>

            <aside className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fournisseur</p>
                {item.partenaireNom ? (
                  <div className="mt-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-violet-50 text-lg font-black text-violet-700 shadow ring-1 ring-slate-200">
                      {item.partenaireLogoUrl ? <img src={imgUrl(item.partenaireLogoUrl)} alt="" className="h-full w-full object-cover" /> : item.partenaireNom[0]}
                    </div>
                    <p className="mt-2 truncate text-sm font-black text-slate-900">{item.partenaireNom}</p>
                    <p className="truncate text-[11px] text-slate-400">{item.partenaireContact || 'Contact non renseigné'}</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px] font-bold">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Dû : {formatMontant(item.montantDuPartenaire)} FCFA</span>
                      <span className={`rounded-full px-2.5 py-1 ${item.statutPaiementPartenaire === 'PAYE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{STATUT_PAIEMENT_LABEL[item.statutPaiementPartenaire] || 'Paiement à définir'}</span>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => onModifier(item)} className="group mt-3 w-full rounded-xl border border-dashed border-slate-200 px-3 py-3 hover:border-violet-300 hover:bg-violet-50/50">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600"><Package size={19} /></span>
                    <span className="mt-2 block text-xs font-bold text-slate-600">Aucun fournisseur lié</span>
                    <span className="block text-[10px] text-violet-600">Cliquer pour en ajouter un</span>
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Suivi des engagements</p>
                  <Truck size={15} className="text-sky-500" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm xl:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complétion</p>
                    <p className="mt-1 font-black text-slate-900 tabular-nums">{livraisonMoyenne}%</p>
                    <ProgressBar value={livraisonMoyenne} color={livraisonMoyenne >= 90 ? 'emerald' : 'sky'} className="mt-2" />
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Reçus confirmés</p>
                    <p className="mt-1 font-black text-emerald-800 tabular-nums">{livraisonsConfirmees}/{participants.length}</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Prioritaires</p>
                    <p className="mt-1 font-black text-violet-800 tabular-nums">{participants.filter(p => p.prioriteTraitement).length}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">À résoudre</p>
                    <p className="mt-1 font-black text-rose-700 tabular-nums">{livraisonsProblemes}</p>
                  </div>
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
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                      <Users size={17} className="text-violet-600" /> Participants à traiter
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {filteredParticipants.length} dossier{filteredParticipants.length > 1 ? 's' : ''} visible{filteredParticipants.length > 1 ? 's' : ''} · {selectedParticipants.length} sélectionné{selectedParticipants.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => exportRows(selectedParticipants.length > 0 ? selectedParticipants : filteredParticipants)}
                      disabled={filteredParticipants.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                      <Download size={14} /> Exporter {selectedParticipants.length > 0 ? 'la sélection' : 'la liste'}
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

                <div className="mt-4 grid min-w-0 items-end gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_150px_140px_135px_135px]">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchParticipant} onChange={e => setSearchParticipant(e.target.value)}
                      placeholder="Rechercher nom, téléphone, ID…"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-violet-400 focus:bg-white" />
                  </div>
                  <FilterSelect compact icon={ClipboardList} label="État des dossiers" value={livraisonFiltre} onChange={setLivraisonFiltre} options={[
                    { value: 'A_TRAITER', label: 'File active' },
                    { value: 'PRIORITAIRES', label: 'Prioritaires' },
                    { value: 'PROBLEMES', label: 'Problèmes' },
                    { value: 'CONFIRMATIONS', label: 'Confirmations' },
                    { value: 'TERMINES', label: 'Terminés' },
                    { value: 'TOUS', label: 'Tous les dossiers' },
                  ]} />
                  <FilterSelect compact icon={CalendarClock} label="Créneau" value={planningFiltre} onChange={setPlanningFiltre} options={[
                    { value: 'TOUS', label: 'Tous' },
                    { value: 'NON_PLANIFIES', label: 'À planifier' },
                    { value: 'AUJOURDHUI', label: "Aujourd'hui" },
                    { value: 'DEMAIN', label: 'Demain' },
                    { value: 'PLANIFIES', label: 'Planifiés' },
                  ]} />
                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Du</span>
                    <input type="date" value={dateDebutFiltre} onChange={e => setDateDebutFiltre(e.target.value)}
                      title="Inscrits à partir du"
                      className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs outline-none focus:border-violet-400" />
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Au</span>
                    <input type="date" value={dateFinFiltre} onChange={e => setDateFinFiltre(e.target.value)}
                      title="Inscrits jusqu'au"
                      className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs outline-none focus:border-violet-400" />
                  </label>
                </div>
                {(dateDebutFiltre || dateFinFiltre) && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                    <span>Période d'inscription active : {dateDebutFiltre || 'début'} → {dateFinFiltre || 'aujourd’hui'}</span>
                    <button type="button" onClick={() => { setDateDebutFiltre(''); setDateFinFiltre('') }}
                      className="rounded-lg bg-white px-2 py-1 text-[11px] font-black text-sky-700 hover:bg-sky-100">
                      Effacer
                    </button>
                  </div>
                )}

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
                      {STATUT_LIVRAISON_MANUEL_OPTIONS.map(status => (
                        <option key={status} value={status}>{STATUT_LIVRAISON_LABEL[status]}</option>
                      ))}
                    </select>
                    <input type="datetime-local" value={bulkDeliveryInfo.dateLivraisonPrevue}
                      onChange={e => setBulkDeliveryInfo(v => ({ ...v, dateLivraisonPrevue: e.target.value }))}
                      title="Date promise par le fournisseur"
                      className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
                    <input value={bulkDeliveryInfo.referenceLivraison}
                      onChange={e => setBulkDeliveryInfo(v => ({ ...v, referenceLivraison: e.target.value }))}
                      placeholder="Référence du lot fournisseur"
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
                      <button onClick={() => { setSearchParticipant(''); setStatutFiltre('TOUS'); setLivraisonFiltre('A_TRAITER'); setPlanningFiltre('TOUS'); setDateDebutFiltre(''); setDateFinFiltre('') }}
                        className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                  <div className="divide-y divide-slate-100 lg:hidden">
                    {participantsPageItems.map(p => {
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
                                <ParticipantLink participant={p} compact />
                                <Badge color={STATUT_PAIEMENT_COLOR[p.statutPaiement] || STATUT_PARTICIPATION_COLOR[p.statut] || 'gray'}>
                                  {STATUT_PAIEMENT_LABEL[p.statutPaiement] || STATUT_PARTICIPATION_LABEL[p.statut] || p.statut}
                                </Badge>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl bg-slate-50 p-2.5"><span className="text-slate-400">Commande</span><p className="mt-1 font-black text-slate-800">Quantité ×{p.quantite || 0}</p></div>
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
                                <select value={STATUT_LIVRAISON_MANUEL_OPTIONS.includes(p.statutLivraison) ? p.statutLivraison : ''} onChange={e => e.target.value && updateLivraison([p.id], { statutLivraison: e.target.value })}
                                  className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none focus:border-violet-400">
                                  <option value="">Action admin</option>
                                  {STATUT_LIVRAISON_MANUEL_OPTIONS.map(status => <option key={status} value={status}>{STATUT_LIVRAISON_LABEL[status]}</option>)}
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
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[780px] table-fixed border-collapse">
                      <thead>
                        <tr>
                          <Th className="w-12">
                            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible}
                              aria-label="Sélectionner tous les participants visibles"
                              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                          </Th>
                          <Th className="w-[18%]">Participant</Th>
                          <Th className="w-[25%]">État du dossier</Th>
                          <Th className="w-[34%]">Planification et fournisseur</Th>
                          <Th className="w-[18%]">Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantsPageItems.map(p => {
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
                                <div className="space-y-2">
                                  <ParticipantLink participant={p} />
                                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">×{p.quantite || 0} unité{Number(p.quantite || 0) > 1 ? 's' : ''}</span>
                                </div>
                              </Td>
                              <Td>
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge color={STATUT_LIVRAISON_COLOR[p.statutLivraison] || 'gray'}>
                                      {STATUT_LIVRAISON_LABEL[p.statutLivraison] || p.statutLivraison || 'Quota non validé'}
                                    </Badge>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{STATUT_PAIEMENT_LABEL[p.statutPaiement] || STATUT_PARTICIPATION_LABEL[p.statut] || p.statut}</span>
                                    {p.prioriteTraitement && (
                                      <span title="Dossier prioritaire" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                                        <Flag size={10} />
                                      </span>
                                    )}
                                  </div>
                                  {p.commentaireParticipantLivraison && (
                                    <p title={p.commentaireParticipantLivraison} className="flex items-center gap-1 truncate text-[10px] font-bold text-rose-600"><AlertTriangle size={11} className="shrink-0" /> Message participant</p>
                                  )}
                                  <div>
                                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
                                      <span>Avancement</span>
                                      <span className="inline-flex items-center gap-1">
                                        {p.progressionLivraison || 0}%
                                        {p.statutLivraison === 'LIVRE_CONFIRME' && <PackageCheck size={12} className="text-emerald-600" />}
                                        {(p.statutLivraison === 'LITIGE' || p.statutLivraison === 'ECHEC_LIVRAISON') && <AlertTriangle size={12} className="text-rose-600" />}
                                      </span>
                                    </div>
                                    <ProgressBar value={p.progressionLivraison || 0} color={p.statutLivraison === 'LIVRE_CONFIRME' ? 'emerald' : p.statutLivraison === 'LITIGE' ? 'rose' : 'sky'} />
                                  </div>
                                </div>
                              </Td>
                              <Td>
                                <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(150px,1fr)_minmax(120px,0.8fr)]">
                                  <div className="min-w-0">
                                    <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Créneau du lot</p>
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <Clock size={12} className={pPlan.slot ? 'shrink-0 text-violet-500' : 'shrink-0 text-slate-300'} />
                                      <input type="datetime-local" value={pPlan.slot || ''}
                                        onChange={e => setParticipantPlan(p.id, { slot: e.target.value })}
                                        aria-label={`Créneau de ${p.nom || 'ce participant'}`}
                                        className="h-8 min-w-0 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] outline-none focus:border-violet-400 focus:bg-white" />
                                    </div>
                                  </div>
                                  <div className="min-w-0 text-[10px] text-slate-500">
                                    <p className="font-black uppercase tracking-wider text-slate-400">Promesse</p>
                                    <p className="mt-1 truncate font-bold text-slate-700">{p.dateLivraisonPrevue ? formatDateTime(p.dateLivraisonPrevue) : 'Non renseignée'}</p>
                                    {p.referenceLivraison && <p className="mt-0.5 truncate text-slate-400" title={p.referenceLivraison}>Réf. {p.referenceLivraison}</p>}
                                    {p.confirmationEnRetard && <p className="mt-1 font-bold text-rose-600">En retard</p>}
                                  </div>
                                </div>
                              </Td>
                              <Td>
                                <div className="flex min-w-0 flex-col gap-1.5">
                                  <select value={STATUT_LIVRAISON_MANUEL_OPTIONS.includes(p.statutLivraison) ? p.statutLivraison : ''}
                                    onChange={e => e.target.value && updateLivraison([p.id], { statutLivraison: e.target.value })}
                                    aria-label={`Action pour ${p.nom || 'ce participant'}`}
                                    className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] outline-none focus:border-violet-400">
                                    <option value="">Mettre à jour</option>
                                    {STATUT_LIVRAISON_MANUEL_OPTIONS.map(status => (
                                      <option key={status} value={status}>{STATUT_LIVRAISON_LABEL[status]}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => updateLivraison([p.id], { prioriteTraitement: !p.prioriteTraitement })}
                                    disabled={savingLivraison}
                                    className={`h-8 rounded-lg border px-2 text-[10px] font-bold transition disabled:opacity-50 ${
                                      p.prioriteTraitement
                                        ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}>
                                    {p.prioriteTraitement ? 'Retirer priorité' : 'Prioriser'}
                                  </button>
                                </div>
                              </Td>
                            </Tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={participantsPage} totalItems={filteredParticipants.length} onPageChange={setParticipantsPage} />
                  </>
                )}
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
      <p className="mt-2 text-[10px] text-slate-400">
        Au-delà du seuil max du dernier palier, le prix reste à ce dernier tarif — il ne remonte jamais.
        Pas besoin de couvrir tout le seuil maximal (ni une valeur énorme pour une offre illimitée) : les paliers
        peuvent s'arrêter avant, le dernier prix défini continue de s'appliquer pour le reste.
      </p>
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
          Fiche opportunité enrichie <span className="font-normal normal-case text-slate-400 tracking-normal">(optionnel)</span>
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

function NouvelleOpportuniteWizard({ onClose, onSaved }) {
  const fournisseurs = useFournisseursDisponibles()
  const [form, setForm] = useState({
    titre: '', description: '', prixNormal: '', seuilMinimum: '', modePlafond: 'ILLIMITE', seuilMaximal: '',
    dateExpiration: '', categorie: '', actif: true,
    fournisseurId: '',
    messagePartage: MESSAGE_PARTAGE_DEFAUT,
    partenaireNom: '', partenaireLogoUrl: '', partenaireContact: '', partenaireReseauxUrl: '',
    montantDuPartenaire: '', montantPayePartenaire: '', delaiConfirmationReceptionJours: '3', messageNotificationLivraison: '',
  })
  const [paliers, setPaliers]             = useState([{ ...PALIER_VIDE }])
  const [specs, setSpecs]                 = useState({ pointsForts: '', casUsage: '', finePrint: '' })
  const [images, setImages]               = useState([])
  const [loading, setLoading]             = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [error, setError]                 = useState('')
  const [step, setStep]                   = useState(0)
  const [aiGenerating, setAiGenerating]   = useState(false)
  const [aiError, setAiError]             = useState('')
  const [aiNotice, setAiNotice]           = useState('')

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handlePresentationAi = async () => {
    if (!form.titre.trim()) {
      setAiError('Saisissez d’abord un titre pour guider la génération.')
      return
    }
    setAiError('')
    setAiNotice('')
    setAiGenerating(true)
    try {
      const res = await genererSpecsOpportunite({
        titre: form.titre.trim(),
        description: form.description.trim() || undefined,
        categorie: form.categorie || undefined,
      })
      setForm(current => ({
        ...current,
        description: res.description?.trim() || current.description,
        categorie: !current.categorie && CATEGORIES.includes(res.categorieSuggestion) ? res.categorieSuggestion : current.categorie,
        messagePartage: current.messagePartage === MESSAGE_PARTAGE_DEFAUT && res.messagePartage?.trim()
          ? res.messagePartage.trim()
          : current.messagePartage,
      }))
      setSpecs(current => ({
        pointsForts: (res.pointsForts || []).length ? res.pointsForts.join('\n') : current.pointsForts,
        casUsage: res.casUsage?.trim() || current.casUsage,
        finePrint: res.finePrint?.trim() || current.finePrint,
      }))
      setAiNotice('Description complétée. La catégorie et le contenu enrichi ont aussi été préparés lorsque nécessaire.')
    } catch (err) {
      setAiError(err.response?.data?.message || 'L’assistant IA est momentanément indisponible. Vos champs ont été conservés.')
    } finally {
      setAiGenerating(false)
    }
  }
  const handleFournisseurChange = (fournisseurId) => {
    const fournisseur = fournisseurs.find(item => item.id === fournisseurId)
    setForm(current => fournisseur ? {
      ...current,
      fournisseurId,
      partenaireNom: nomPublicFournisseur(fournisseur),
      partenaireContact: contactFournisseur(fournisseur),
      partenaireLogoUrl: fournisseur.logoUrl || current.partenaireLogoUrl,
      partenaireReseauxUrl: fournisseur.reseauxUrl || current.partenaireReseauxUrl,
    } : { ...current, fournisseurId: '' })
  }

  const validateStep = (index) => {
    if (index === 0 && !form.titre.trim()) return 'Renseignez le titre de l’opportunité.'
    if (index === 1) {
      if (!form.prixNormal || Number(form.prixNormal) <= 0) return 'Renseignez un prix normal supérieur à zéro.'
      if (form.modePlafond === 'PLAFONNE' && (!form.seuilMaximal || Number(form.seuilMaximal) < 1)) return 'Renseignez le stock maximal pour une opportunité plafonnée.'
      if (!form.dateExpiration) return 'Choisissez une date d’expiration.'
      if (new Date(form.dateExpiration) <= new Date()) return 'La date d’expiration doit être située dans le futur.'
      const paliersCalcules = calculerPaliers(paliers)
      if (paliersCalcules.some(p => !p.seuilMin || !p.seuilMax || !p.prix || Number(p.prix) <= 0)) return 'Complétez tous les paliers de prix.'
      if (!form.seuilMinimum || Number(form.seuilMinimum) < 1) return 'Choisissez le seuil minimum après avoir défini les paliers.'
      if (form.modePlafond === 'PLAFONNE' && !paliersCalcules.some(p => Number(p.seuilMax) === Number(form.seuilMinimum))) return 'Le seuil minimum doit être le seuil max d’un palier.'
      if (form.modePlafond === 'PLAFONNE' && Number(form.seuilMaximal) < Math.max(...paliersCalcules.map(p => Number(p.seuilMax)))) {
        return 'Le stock maximal doit être supérieur ou égal au seuil max du dernier palier.'
      }
    }
    return ''
  }

  const goNext = () => {
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setStep(current => Math.min(CREATION_STEPS.length - 1, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setError('')
    setStep(current => Math.max(0, current - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validateStep(0) || validateStep(1)
    if (validationError) {
      setError(validationError)
      return
    }
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
        modePlafond: form.modePlafond,
        seuilMaximal: form.seuilMaximal ? Number(form.seuilMaximal) : undefined,
        dateExpiration: new Date(form.dateExpiration).toISOString(),
        categorie: form.categorie || undefined,
        actif: form.actif,
        messagePartage: form.messagePartage || undefined,
        fournisseurId: form.fournisseurId || undefined,
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

  const StepIcon = CREATION_STEPS[step].icon
  const prixLisible = form.prixNormal ? `${Number(form.prixNormal).toLocaleString('fr-FR')} FCFA` : 'Non renseigné'

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onClose} disabled={loading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50" aria-label="Retour aux opportunités">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">Création guidée</p>
              <h2 className="mt-0.5 text-xl font-black text-slate-950">Nouvelle opportunité</h2>
              <p className="mt-1 text-xs text-slate-500">Étape {step + 1} sur {CREATION_STEPS.length} · {CREATION_STEPS[step].label}</p>
            </div>
            <div className="hidden rounded-xl bg-violet-50 px-3 py-2 text-right sm:block">
              <p className="text-[9px] font-black uppercase tracking-wider text-violet-500">Progression</p>
              <p className="text-sm font-black text-violet-700">{Math.round(((step + 1) / CREATION_STEPS.length) * 100)}%</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-1.5">
            {CREATION_STEPS.map((item, index) => {
              const Icon = item.icon
              const active = index === step
              const completed = index < step
              return (
                <button key={item.label} type="button" disabled={index > step} onClick={() => { setError(''); setStep(index) }} className={`group flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition ${active ? 'bg-violet-700 text-white shadow-md shadow-violet-200' : completed ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 text-slate-300'}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${active ? 'bg-white/15' : completed ? 'bg-emerald-100' : 'bg-white'}`}>
                    {completed ? <Check size={14} /> : <Icon size={14} />}
                  </span>
                  <span className="hidden truncate text-[9px] font-black uppercase tracking-wide sm:block">{item.short}</span>
                </button>
              )
            })}
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="min-h-[420px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><StepIcon size={19} /></span>
              <div>
                <h3 className="text-base font-black text-slate-900">{CREATION_STEPS[step].label}</h3>
                <p className="text-xs text-slate-500">{
                  ['Présentez clairement l’opportunité aux futurs participants.', 'Définissez le prix, les objectifs et les remises de groupe.', 'Identifiez le fournisseur de l’opportunité et préparez le suivi de livraison.', 'Enrichissez la fiche avec des arguments et des visuels.', 'Relisez les informations avant de publier.'][step]
                }</p>
              </div>
            </div>

            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className={labelCls}>Titre de l’opportunité *</label><input autoFocus value={form.titre} onChange={e => setField('titre', e.target.value)} className={inputCls} placeholder="Ex. Table pliante de marché renforcée" /></div>
                <div className="sm:col-span-2 flex flex-col gap-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white"><Sparkles size={15} /></span>
                    <div>
                      <p className="text-xs font-black text-slate-900">Assistant de rédaction</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Génère une description ou améliore votre brouillon, puis prépare les champs de contenu.</p>
                    </div>
                  </div>
                  <button type="button" onClick={handlePresentationAi} disabled={aiGenerating || !form.titre.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {aiGenerating ? 'Rédaction…' : (form.description.trim() ? 'Améliorer avec l’IA' : 'Générer avec l’IA')}
                  </button>
                </div>
                {aiError && <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{aiError}</p>}
                {aiNotice && <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">{aiNotice}</p>}
                <div><label className={labelCls}>Catégorie <span className="font-normal normal-case tracking-normal text-slate-400">(suggérée si vide)</span></label><select value={form.categorie} onChange={e => setField('categorie', e.target.value)} className={inputCls}><option value="">— Sélectionner —</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="sm:col-span-2"><label className={labelCls}>Description de l’opportunité</label><textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder="Décrivez l’opportunité, ses caractéristiques et ses avantages…" /></div>
                <div className="sm:col-span-2 rounded-xl border border-violet-100 bg-violet-50/60 p-4"><label className={labelCls}>Message de partage</label><textarea value={form.messagePartage} onChange={e => setField('messagePartage', e.target.value)} rows={6} maxLength={500} className={`${inputCls} resize-none bg-white`} /><p className="mt-1.5 text-[10px] leading-4 text-slate-500">Ajouté automatiquement au lien partagé. Utilisez <strong>{'{titre}'}</strong> et <strong>{'{prix}'}</strong> pour insérer les informations de l’offre.</p></div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div><label className={labelCls}>Prix normal (FCFA) *</label><input type="number" min="1" value={form.prixNormal} onChange={e => setField('prixNormal', e.target.value)} className={inputCls} placeholder="22000" /></div>
                  <div><label className={labelCls}>Type de stock *</label><select value={form.modePlafond} onChange={e => setField('modePlafond', e.target.value)} className={inputCls}><option value="ILLIMITE">Sans plafond</option><option value="PLAFONNE">Avec plafond</option></select><p className="mt-1 text-[10px] text-slate-400">Sans plafond : le seuil minimum reste libre et l'offre continue après validation.</p></div>
                  {form.modePlafond === 'PLAFONNE' && <div><label className={labelCls}>Stock maximal *</label><input type="number" min="1" value={form.seuilMaximal} onChange={e => setField('seuilMaximal', e.target.value)} className={inputCls} placeholder="100" /></div>}
                  <div className="sm:col-span-2 lg:col-span-3"><label className={labelCls}>Fin des souscriptions *</label><input type="datetime-local" value={form.dateExpiration} onChange={e => setField('dateExpiration', e.target.value)} className={inputCls} /></div>
                </div>
                <PaliersEditor paliers={paliers} setPaliers={setPaliers} />
                <div>
                  <label className={labelCls}>Objectif minimum *</label>
                  {form.modePlafond === 'PLAFONNE' ? (
                    <select value={form.seuilMinimum} onChange={e => setField('seuilMinimum', e.target.value)} className={inputCls}>
                      <option value="">Choisissez un seuil max de palier</option>
                      {[...new Set(calculerPaliers(paliers).map(p => Number(p.seuilMax)).filter(Number.isFinite))].sort((a, b) => a - b).map(seuil => (
                        <option key={seuil} value={seuil}>{seuil} participants</option>
                      ))}
                    </select>
                  ) : (
                    <input type="number" min="1" value={form.seuilMinimum} onChange={e => setField('seuilMinimum', e.target.value)} className={inputCls} placeholder="20" />
                  )}
                  <p className="mt-1 text-[10px] text-slate-400">Avec plafond, ce seuil doit correspondre au seuil max d’un palier.</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <FilterSelect label="Fournisseur enregistré" value={form.fournisseurId} onChange={handleFournisseurChange} options={[{ value: '', label: '— Sélectionner un fournisseur —' }, ...fournisseurs.map(item => ({ value: item.id, label: nomPublicFournisseur(item) || item.email }))]} />
                  <p className="mt-2 text-[10px] text-slate-500">Les fournisseurs sont liés aux opportunités. Les commanditaires restent exclusivement liés aux sondages.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className={labelCls}>Nom public du fournisseur</label><input value={form.partenaireNom} onChange={e => setField('partenaireNom', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Logo du fournisseur (URL)</label><input type="url" value={form.partenaireLogoUrl} onChange={e => setField('partenaireLogoUrl', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Contact privé</label><input value={form.partenaireContact} onChange={e => setField('partenaireContact', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Site ou réseau social public</label><input type="url" value={form.partenaireReseauxUrl} onChange={e => setField('partenaireReseauxUrl', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Montant dû au fournisseur</label><input type="number" min="0" value={form.montantDuPartenaire} onChange={e => setField('montantDuPartenaire', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Montant déjà payé</label><input type="number" min="0" value={form.montantPayePartenaire} onChange={e => setField('montantPayePartenaire', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Alerte de réception après (jours)</label><input type="number" min="1" value={form.delaiConfirmationReceptionJours} onChange={e => setField('delaiConfirmationReceptionJours', e.target.value)} className={inputCls} /></div>
                  <div className="sm:col-span-2"><label className={labelCls}>Message de notification de livraison</label><textarea rows={3} maxLength={500} value={form.messageNotificationLivraison} onChange={e => setField('messageNotificationLivraison', e.target.value)} className={`${inputCls} resize-none`} placeholder="Votre commande est prête. La livraison est prévue…" /></div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <SpecsEditor titre={form.titre} description={form.description} categorie={form.categorie} specs={specs} setSpecs={setSpecs} />
                <div className="rounded-xl border border-slate-200 p-4"><label className={`${labelCls} mb-2`}>Galerie de l’opportunité <span className="font-normal normal-case text-slate-400 tracking-normal">(optionnel)</span></label><ImagePicker images={images} onChange={setImages} /></div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Opportunité</p><p className="mt-2 text-sm font-black text-slate-900">{form.titre}</p><p className="mt-1 text-xs text-slate-500">{form.categorie || 'Sans catégorie'}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Prix normal</p><p className="mt-2 text-sm font-black text-slate-900">{prixLisible}</p><p className="mt-1 text-xs text-slate-500">Objectif : {form.seuilMinimum || '—'} participant(s)</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Fournisseur</p><p className="mt-2 text-sm font-black text-slate-900">{form.partenaireNom || 'À confirmer'}</p><p className="mt-1 text-xs text-slate-500">{form.fournisseurId ? 'Fiche fournisseur liée' : 'Aucune fiche liée'}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Contenu</p><p className="mt-2 text-sm font-black text-slate-900">{images.length} image{images.length !== 1 ? 's' : ''}</p><p className="mt-1 text-xs text-slate-500">{paliers.length} palier{paliers.length !== 1 ? 's' : ''} de prix</p></div>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm font-black text-slate-900">Mode de publication</p><p className="mt-1 text-xs text-slate-500">Vous pourrez modifier et activer un brouillon plus tard.</p></div>
                    <button type="button" onClick={() => setField('actif', !form.actif)} className={`inline-flex items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-black transition ${form.actif ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                      <span className={`relative h-5 w-9 rounded-full transition-colors ${form.actif ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form.actif ? 'left-[18px]' : 'left-0.5'}`} /></span>
                      {form.actif ? 'Publier immédiatement' : 'Enregistrer comme brouillon'}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">Vérifiez le prix, la date d’expiration et l’identité du fournisseur. Après création, toutes ces informations resteront modifiables depuis la fiche de l’opportunité.</div>
              </div>
            )}

            {error && <div role="alert" className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <button type="button" onClick={step === 0 ? onClose : goBack} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">
              <ArrowLeft size={15} /> {step === 0 ? 'Annuler' : 'Étape précédente'}
            </button>
            {step < CREATION_STEPS.length - 1 ? (
              <button type="button" onClick={goNext} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800">Continuer <ArrowRight size={15} /></button>
            ) : (
              <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800 disabled:opacity-60">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <CircleCheck size={16} />}
                {loading ? (uploadProgress ? `Envoi image ${uploadProgress}…` : 'Création…') : (form.actif ? "Créer et publier" : 'Enregistrer le brouillon')}
              </button>
            )}
          </footer>
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

// ── Formulaire dédié de modification ─────────────────────────────────────────

function ModifierOpportuniteForm({ item, onClose, onSaved }) {
  const fournisseurs = useFournisseursDisponibles()
  const [form, setForm] = useState({
    titre: item.titre || '',
    description: item.description || '',
    prixNormal: String(item.prixNormal ?? ''),
    seuilMinimum: String(item.seuilMinimum ?? ''),
    modePlafond: item.modePlafond || (item.seuilMaximal != null ? 'PLAFONNE' : 'ILLIMITE'),
    seuilMaximal: item.seuilMaximal != null ? String(item.seuilMaximal) : '',
    dateExpiration: item.dateExpiration ? item.dateExpiration.slice(0, 16) : '',
    categorie: item.categorie || '',
    fournisseurId: item.fournisseurId || '',
    messagePartage: item.messagePartage || MESSAGE_PARTAGE_DEFAUT,
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
  const handleFournisseurChange = (fournisseurId) => {
    const fournisseur = fournisseurs.find(candidate => candidate.id === fournisseurId)
    setForm(current => fournisseur ? {
      ...current,
      fournisseurId,
      partenaireNom: nomPublicFournisseur(fournisseur),
      partenaireContact: contactFournisseur(fournisseur),
      partenaireLogoUrl: fournisseur.logoUrl || current.partenaireLogoUrl,
      partenaireReseauxUrl: fournisseur.reseauxUrl || current.partenaireReseauxUrl,
    } : { ...current, fournisseurId: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const paliersCalcules = calculerPaliers(paliers)
    if (form.modePlafond === 'PLAFONNE' && (!form.seuilMaximal || Number(form.seuilMaximal) < Math.max(...paliersCalcules.map(p => Number(p.seuilMax)))) ) {
      setError('Le stock maximal doit être supérieur ou égal au seuil max du dernier palier.')
      return
    }
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
        modePlafond: form.modePlafond,
        seuilMaximal: form.seuilMaximal ? Number(form.seuilMaximal) : undefined,
        dateExpiration: form.dateExpiration ? new Date(form.dateExpiration).toISOString() : undefined,
        categorie: form.categorie || undefined,
        messagePartage: form.messagePartage,
        fournisseurId: form.fournisseurId || undefined,
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
            <div className="sm:col-span-2">
              <label className={labelCls}>Message de partage</label>
              <textarea value={form.messagePartage} onChange={e => setField('messagePartage', e.target.value)}
                rows={5} maxLength={500} className={`${inputCls} resize-none`} />
              <p className="mt-1 text-[10px] leading-4 text-slate-400">Ce texte accompagne automatiquement le lien partagé. Variables disponibles : <strong>{'{titre}'}</strong> et <strong>{'{prix}'}</strong>.</p>
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
              <label className={labelCls}>Type de stock</label>
              <select value={form.modePlafond} onChange={e => setField('modePlafond', e.target.value)} className={inputCls}>
                <option value="ILLIMITE">Sans plafond</option>
                <option value="PLAFONNE">Avec plafond</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-400">Sans plafond : le seuil minimum peut être choisi librement.</p>
            </div>
            {form.modePlafond === 'PLAFONNE' && <div>
              <label className={labelCls}>Seuil maximal *</label>
              <input type="number" min="1" value={form.seuilMaximal}
                onChange={e => setField('seuilMaximal', e.target.value)} className={inputCls} />
            </div>}
            <div>
              <label className={labelCls}>Date d'expiration</label>
              <input type="datetime-local" value={form.dateExpiration}
                onChange={e => setField('dateExpiration', e.target.value)} className={inputCls} />
            </div>
          </div>

          <PaliersEditor paliers={paliers} setPaliers={setPaliers} />

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <h4 className="text-sm font-black text-slate-900">Fournisseur et engagement financier</h4>
              <p className="mt-1 text-xs text-slate-500">Le fournisseur approvisionne l’opportunité. Son contact reste privé ; son nom, logo et lien public peuvent apparaître côté client.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FilterSelect
                  label="Fournisseur enregistré"
                  value={form.fournisseurId}
                  onChange={handleFournisseurChange}
                  options={[
                    { value: '', label: '— Sélectionner un fournisseur —' },
                    ...fournisseurs.map(fournisseur => ({
                      value: fournisseur.id,
                      label: nomPublicFournisseur(fournisseur) || fournisseur.email,
                    })),
                  ]}
                />
                <p className="mt-1.5 text-[10px] leading-4 text-slate-400">Vous pouvez changer le fournisseur lié. Les commanditaires sont gérés séparément pour les sondages.</p>
              </div>
              <div><label className={labelCls}>Nom public du fournisseur</label><input value={form.partenaireNom} onChange={e => setField('partenaireNom', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Logo (URL)</label><input type="url" value={form.partenaireLogoUrl} onChange={e => setField('partenaireLogoUrl', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Contact privé</label><input value={form.partenaireContact} onChange={e => setField('partenaireContact', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Réseau social / site public</label><input type="url" value={form.partenaireReseauxUrl} onChange={e => setField('partenaireReseauxUrl', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Montant dû au fournisseur</label><input type="number" min="0" value={form.montantDuPartenaire} onChange={e => setField('montantDuPartenaire', e.target.value)} className={inputCls} /></div>
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

  const refresh = useCallback((showLoader = true) => {
    if (showLoader) setLoading(true)
    getAdminOpportunite(id).then(setItem).finally(() => setLoading(false))
  }, [id])
  useEffect(() => {
    let cancelled = false
    getAdminOpportunite(id)
      .then(data => { if (!cancelled) setItem(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

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
  return <DetailDrawer key={item.id} item={item} onClose={() => navigate('/opportunites')} onActiver={activer} onCloturer={cloturer} onModifier={() => navigate(`/opportunites/${id}/modifier`)} actionId={actionId} />
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
  return <ModifierOpportuniteForm item={item} onClose={() => navigate(`/opportunites/${id}`)} onSaved={() => navigate(`/opportunites/${id}`)} />
}

export function NouvelleOpportunitePage() {
  const navigate = useNavigate()
  return <NouvelleOpportuniteWizard onClose={() => navigate('/opportunites')} onSaved={() => navigate('/opportunites', { replace: true })} />
}

const MOTIF_TENTATIVE_LABEL = {
  SOLDE_INSUFFISANT: 'Solde insuffisant',
  OFFRE_INDISPONIBLE: 'Offre indisponible',
  VALIDATION: 'Données invalides',
  ERREUR_TECHNIQUE: 'Erreur technique',
}
const MOTIF_TENTATIVE_COLOR = {
  SOLDE_INSUFFISANT: '#f59e0b',
  OFFRE_INDISPONIBLE: '#8b5cf6',
  VALIDATION: '#0ea5e9',
  ERREUR_TECHNIQUE: '#f43f5e',
}

const TRAITEMENT_LABEL = { A_TRAITER: 'À traiter', EN_COURS: 'Traitement en cours', TERMINE: 'Traité' }
const TRAITEMENT_COLOR = { A_TRAITER: 'rose', EN_COURS: 'amber', TERMINE: 'emerald' }

export default function Opportunites({ mode = 'encours' }) {
  const navigate = useNavigate()
  const [opportunites, setOpportunites] = useState([])
  const [loading, setLoading]           = useState(true)
  const [actionId, setActionId]         = useState(null)
  const [categorieFiltre, setCategorieFiltre] = useState('TOUTES')
  const [statutListeFiltre, setStatutListeFiltre] = useState('TOUS')
  const [recherche, setRecherche] = useState('')
  const [triListe, setTriListe] = useState('RECENTES')
  const [filtresOuverts, setFiltresOuverts] = useState(false)
  const [tentatives, setTentatives] = useState([])
  const [page, setPage] = useState(1)
  const [tentativesPage, setTentativesPage] = useState(1)
  const traitementMode = mode === 'traitement'
  const tentativesMode = mode === 'tentatives'

  const fetchData = () => {
    setLoading(true)
    getAdminOpportunites()
      .then(setOpportunites)
      .catch(() => setOpportunites([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    getAdminOpportunites()
      .then(data => { if (!cancelled) setOpportunites(data) })
      .catch(() => { if (!cancelled) setOpportunites([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (traitementMode) return
    getTentativesSouscriptionEchouees()
      .then(setTentatives)
      .catch(() => setTentatives([]))
  }, [traitementMode])

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
    try { await activerOpportunite(id); fetchData() } catch { setActionId(null) } finally { setActionId(null) }
  }
  const handleCloturer = async (id) => {
    setActionId(id)
    try { await cloturerOpportunite(id); fetchData() } catch { setActionId(null) } finally { setActionId(null) }
  }

  const estTerminee = o => o.statut === 'CLOTUREE' || o.statut === 'ANNULEE'
  const opportunitesDuParcours = opportunites.filter(o => traitementMode ? estTerminee(o) : !estTerminee(o))
  const categories = Array.from(new Set(opportunitesDuParcours.map(o => o.categorie).filter(Boolean))).sort()
  const termesRecherche = normaliserRecherche(recherche).split(/\s+/).filter(Boolean)
  const opportunitesFiltrees = opportunitesDuParcours
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
  const echecsSolde = tentatives.filter(item => item.motif === 'SOLDE_INSUFFISANT').length
  const echecsTechniques = tentatives.filter(item => item.motif === 'ERREUR_TECHNIQUE').length
  const montantEchecs = tentatives.reduce((sum, item) => sum + Number(item.montantTransaction || 0), 0)
  const quantitesEchouees = tentatives.reduce((sum, item) => sum + Number(item.quantite || 0), 0)
  const clientsTouches = new Set(tentatives.map(item => item.utilisateurId).filter(Boolean)).size
  const repartitionEchecs = useMemo(() => Object.keys(MOTIF_TENTATIVE_LABEL).map(motif => ({
    motif,
    name: MOTIF_TENTATIVE_LABEL[motif],
    value: tentatives.filter(item => item.motif === motif).length,
    color: MOTIF_TENTATIVE_COLOR[motif],
  })).filter(item => item.value > 0), [tentatives])
  const evolutionEchecs = useMemo(() => {
    const jours = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = date.toISOString().slice(0, 10)
      return { key, jour: date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''), tentatives: 0, montant: 0 }
    })
    const parJour = Object.fromEntries(jours.map(item => [item.key, item]))
    tentatives.forEach(item => {
      const jour = parJour[String(item.createdAt || '').slice(0, 10)]
      if (!jour) return
      jour.tentatives += 1
      jour.montant += Number(item.montantTransaction || 0)
    })
    return jours
  }, [tentatives])
  const opportunitesImpactees = useMemo(() => {
    const groupes = new Map()
    tentatives.forEach(item => {
      const cle = item.opportuniteId || item.opportuniteTitre
      const courant = groupes.get(cle) || { name: item.opportuniteTitre || 'Opportunité', tentatives: 0, montant: 0 }
      courant.tentatives += 1
      courant.montant += Number(item.montantTransaction || 0)
      groupes.set(cle, courant)
    })
    return [...groupes.values()].sort((a, b) => b.tentatives - a.tentatives).slice(0, 5).map(item => ({ ...item, name: item.name.length > 22 ? `${item.name.slice(0, 22)}…` : item.name }))
  }, [tentatives])
  const totalRepartition = repartitionEchecs.reduce((sum, item) => sum + item.value, 0)
  let angleRepartition = 0
  const gradientRepartition = repartitionEchecs.length === 0 ? '#e2e8f0 0deg 360deg' : repartitionEchecs.map(item => {
    const debut = angleRepartition
    angleRepartition += (item.value / totalRepartition) * 360
    return `${item.color} ${debut}deg ${angleRepartition}deg`
  }).join(', ')
  const maximumJournalier = Math.max(1, ...evolutionEchecs.map(item => item.tentatives))
  const pointsEvolution = evolutionEchecs.map((item, index) => `${index * 50},${92 - (item.tentatives / maximumJournalier) * 72}`).join(' ')
  const maximumOpportunite = Math.max(1, ...opportunitesImpactees.map(item => item.tentatives))
  useEffect(() => setPage(1), [categorieFiltre, statutListeFiltre, recherche, triListe, mode])
  const opportunitesPage = opportunitesFiltrees.slice((page - 1) * 10, page * 10)
  const tentativesPageItems = tentatives.slice((tentativesPage - 1) * 10, tentativesPage * 10)

  if (tentativesMode) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[13px] font-bold text-slate-900">Souscriptions non abouties</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Analysez les essais sans dépôt gelé pour détecter les problèmes de solde, d’offre ou de technique.</p>
          </div>
          <button onClick={() => navigate('/opportunites')}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto">
            <ArrowLeft size={15} /> Retour aux opportunités
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{tentatives.length}</p>
            <p className="mt-1 text-[10px] text-slate-400">{clientsTouches} client{clientsTouches > 1 ? 's' : ''} concerné{clientsTouches > 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Solde insuffisant</p>
            <p className="mt-2 text-2xl font-black text-amber-800">{echecsSolde}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Erreurs techniques</p>
            <p className="mt-2 text-2xl font-black text-rose-800">{echecsTechniques}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">Valeur non convertie</p>
            <p className="mt-2 text-2xl font-black text-violet-900">{formatMontant(montantEchecs)} <span className="text-[10px]">FCFA</span></p>
            <p className="mt-1 text-[10px] text-violet-600">{quantitesEchouees} unité{quantitesEchouees > 1 ? 's' : ''} non achetée{quantitesEchouees > 1 ? 's' : ''}</p>
          </div>
        </div>

        <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3"><p className="text-sm font-black text-slate-900">Causes des échecs</p><p className="text-[10px] text-slate-400">Répartition des tentatives par origine</p></div>
            {repartitionEchecs.length === 0 ? <div className="flex h-44 items-center justify-center text-xs text-slate-400">Aucune donnée à analyser</div> : (
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <div className="flex h-44 items-center justify-center"><div className="relative h-32 w-32 rounded-full" style={{ background: `conic-gradient(${gradientRepartition})` }}><div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-xl text-slate-900">{tentatives.length}</strong><span className="text-[9px] text-slate-400">tentatives</span></div></div></div>
                <div className="space-y-2">{repartitionEchecs.map(item => <div key={item.motif} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.name}</span></span><strong className="text-slate-900">{item.value}</strong></div>)}</div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3"><p className="text-sm font-black text-slate-900">Évolution sur 7 jours</p><p className="text-[10px] text-slate-400">Détectez rapidement une hausse anormale</p></div>
            <div className="h-44">
              <svg viewBox="0 0 300 105" className="h-36 w-full overflow-visible" preserveAspectRatio="none" aria-label="Courbe des tentatives sur sept jours">
                {[20, 44, 68, 92].map(y => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />)}
                <polygon points={`0,100 ${pointsEvolution} 300,100`} fill="#ede9fe" opacity="0.8" />
                <polyline points={pointsEvolution} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {evolutionEchecs.map((item, index) => <circle key={item.key} cx={index * 50} cy={92 - (item.tentatives / maximumJournalier) * 72} r="3.5" fill="#7c3aed"><title>{item.tentatives} tentative(s)</title></circle>)}
              </svg>
              <div className="grid grid-cols-7 text-center text-[9px] font-bold text-slate-400">{evolutionEchecs.map(item => <span key={item.key}>{item.jour}</span>)}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2 xl:col-span-1">
            <div className="mb-3"><p className="text-sm font-black text-slate-900">Opportunités à surveiller</p><p className="text-[10px] text-slate-400">Classement par nombre d’échecs</p></div>
            {opportunitesImpactees.length === 0 ? <div className="flex h-44 items-center justify-center text-xs text-slate-400">Aucune opportunité impactée</div> : <div className="space-y-3 py-1">{opportunitesImpactees.map(item => <div key={item.name}><div className="mb-1 flex items-center justify-between gap-3 text-[10px]"><span className="truncate font-bold text-slate-600" title={item.name}>{item.name}</span><span className="shrink-0 font-black text-slate-900">{item.tentatives}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(8, (item.tentatives / maximumOpportunite) * 100)}%` }} /></div></div>)}</div>}
          </div>
        </section>

        <Card noPad>
          {tentatives.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Aucune tentative échouée enregistrée" sub="Les souscriptions non abouties apparaîtront ici sans encombrer la liste principale." />
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">{tentativesPageItems.map(item => <article key={item.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><Link to={`/utilisateurs?focus=${item.utilisateurId}`} className="font-black text-slate-900 hover:text-violet-700">{item.utilisateurNom || 'Client'} →</Link><Badge color={item.motif === 'ERREUR_TECHNIQUE' ? 'rose' : item.motif === 'SOLDE_INSUFFISANT' ? 'amber' : 'gray'}>{MOTIF_TENTATIVE_LABEL[item.motif] || item.motif}</Badge></div><p className="text-[10px] text-slate-400">ID : {item.utilisateurId}</p><button onClick={() => navigate(`/opportunites/${item.opportuniteId}`)} className="text-left text-xs font-bold text-violet-700 hover:underline">{item.opportuniteTitre}</button><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-2.5 text-xs"><span className="text-slate-400">Montant</span><p className="font-black">{formatMontant(item.montantTransaction)} FCFA</p></div><div className="rounded-xl bg-slate-50 p-2.5 text-xs"><span className="text-slate-400">Quantité</span><p className="font-black">×{item.quantite || 0}</p></div></div><p className="text-[11px] text-slate-500">{item.detail}</p></article>)}</div>
              <div className="hidden overflow-x-auto lg:block"><Table>
                <thead><tr><Th>Client / identifiant</Th><Th>Opportunité</Th><Th>Cause</Th><Th>Montant</Th><Th>Quantité</Th><Th>Date</Th><Th>Action conseillée</Th></tr></thead>
                <tbody>{tentativesPageItems.map(item => <Tr key={item.id}>
                  <Td><Link to={`/utilisateurs?focus=${item.utilisateurId}`} className="font-bold text-slate-800 hover:text-violet-700 hover:underline">{item.utilisateurNom || 'Client'}</Link><p title={item.utilisateurId} className="mt-0.5 max-w-40 truncate font-mono text-[9px] text-slate-400">{item.utilisateurId}</p></Td>
                  <Td><button onClick={() => navigate(`/opportunites/${item.opportuniteId}`)} className="max-w-48 truncate text-left text-xs font-bold text-violet-700 hover:underline">{item.opportuniteTitre}</button></Td>
                  <Td><Badge color={item.motif === 'ERREUR_TECHNIQUE' ? 'rose' : item.motif === 'SOLDE_INSUFFISANT' ? 'amber' : 'gray'}>{MOTIF_TENTATIVE_LABEL[item.motif] || item.motif}</Badge><p title={item.detail} className="mt-1 max-w-52 truncate text-[10px] text-slate-400">{item.detail}</p></Td>
                  <Td><span className="whitespace-nowrap text-xs font-black text-slate-800">{formatMontant(item.montantTransaction)} FCFA</span></Td>
                  <Td><span className="font-black text-slate-800">×{item.quantite || 0}</span></Td>
                  <Td><span className="whitespace-nowrap text-[11px] text-slate-500">{formatDateTime(item.createdAt)}</span></Td>
                  <Td><span className="text-[10px] font-semibold text-slate-500">{item.motif === 'SOLDE_INSUFFISANT' ? 'Relancer pour recharge' : item.motif === 'ERREUR_TECHNIQUE' ? 'Vérifier l’incident' : 'Informer le client'}</span></Td>
                </Tr>)}</tbody>
              </Table></div>
              <Pagination page={tentativesPage} totalItems={tentatives.length} onPageChange={setTentativesPage} />
            </>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-[13px] font-bold text-slate-900">{traitementMode ? 'Traitement et livraisons' : 'Opportunités en cours'}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {traitementMode
              ? 'Campagnes clôturées à préparer, livrer ou finaliser'
              : 'Campagnes actives ou en préparation, visibles après activation'}
          </p>
        </div>
        {!traitementMode && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button onClick={() => navigate('/opportunites/tentatives')}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 sm:w-auto">
              <AlertTriangle size={15} /> Tentatives non abouties
              {tentatives.length > 0 && <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] text-white">{tentatives.length}</span>}
            </button>
            <button
              onClick={() => navigate('/opportunites/nouvelle')}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-800 sm:w-auto"
            >
              <Plus size={15} /> Nouvelle opportunité
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={recherche} onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher par opportunité, catégorie, fournisseur…"
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
            <FilterSelect label="Catégorie" value={categorieFiltre} onChange={setCategorieFiltre}
              options={[{ value: 'TOUTES', label: `Toutes les catégories (${opportunitesDuParcours.length})` }, ...categories.map(cat => ({ value: cat, label: `${cat} (${opportunitesDuParcours.filter(o => o.categorie === cat).length})` }))]} />
            <FilterSelect label="Statut" value={statutListeFiltre} onChange={setStatutListeFiltre}
              options={[{ value: 'TOUS', label: 'Tous les statuts' }, ...Object.entries(STATUT_LABEL).map(([optionValue, optionLabel]) => ({ value: optionValue, label: optionLabel }))]} />
            <FilterSelect label="Trier par" value={triListe} onChange={setTriListe} className="sm:col-span-2 xl:col-span-1"
              options={[
                { value: 'RECENTES', label: 'Création la plus récente' },
                { value: 'EXPIRATION', label: 'Expiration la plus proche' },
                { value: 'PARTICIPANTS', label: 'Plus de participants' },
                { value: 'PRIX_ASC', label: 'Prix croissant' },
                { value: 'PRIX_DESC', label: 'Prix décroissant' },
              ]} />
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
            title={opportunitesDuParcours.length === 0 ? (traitementMode ? 'Aucune campagne à traiter' : 'Aucune opportunité en cours') : 'Aucun résultat'}
            sub={opportunitesDuParcours.length === 0 ? (traitementMode ? 'Les campagnes clôturées apparaîtront ici avec leur état de traitement.' : 'Créez votre première opportunité.') : 'Modifiez la recherche ou retirez certains filtres.'} />
        ) : (
          <><Table>
            <thead>
              <tr>
                <Th>Opportunité</Th>
                <Th>Prix normal</Th>
                <Th>Avancement</Th>
                <Th>Expiration</Th>
                <Th>{traitementMode ? 'Traitement' : 'Statut'}</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {opportunitesPage.map(item => {
                const { pct, valide: seuilValide, phase: phaseProgression, placesRestantes } = calculerProgression(item)
                const couverture = item.images?.[0]?.url
                return (
                  <Tr key={item.id}>
                    <Td>
                      <div className="flex min-w-64 items-center gap-3">
                        <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {couverture ? (
                            <img src={imgUrl(couverture)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <ImagePlus size={18} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="line-clamp-2 font-semibold text-slate-900 text-[12.5px]">{item.titre}</div>
                          {item.categorie && <div className="text-[10.5px] font-medium text-violet-500 mt-0.5">{item.categorie}</div>}
                          {item.description && (
                            <div className="text-[11px] text-slate-400 mt-0.5 max-w-[220px] truncate">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td><span className="font-semibold tabular-nums">{formatMontant(item.prixNormal)} FCFA</span></Td>
                    <Td className="w-44">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-500 tabular-nums">{item.participantsActuels}</span>
                        <span className="text-[10px] text-slate-400">
                          {seuilValide ? (phaseProgression === 'plafond' ? `/${item.seuilMaximal}` : 'validé') : `/${item.seuilMinimum}`}
                        </span>
                      </div>
                      <ProgressBar value={pct} color="indigo" />
                      <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{pct}%</div>
                      {phaseProgression === 'plafond' && (
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5 tabular-nums">
                          {placesRestantes} place{placesRestantes > 1 ? 's' : ''} restante{placesRestantes > 1 ? 's' : ''} (max {item.seuilMaximal})
                        </div>
                      )}
                    </Td>
                    <Td><span className="text-[12px] text-slate-500">{formatDate(item.dateExpiration)}</span></Td>
                    <Td>{traitementMode ? <div className="space-y-1"><Badge color={TRAITEMENT_COLOR[item.statutTraitement] || 'red'}>{TRAITEMENT_LABEL[item.statutTraitement] || 'À traiter'}</Badge><p className="text-[10px] text-slate-400">{item.dossiersATraiter || 0} à traiter · {item.dossiersEnCours || 0} en cours · {item.dossiersTermines || 0} terminés</p></div> : <Badge color={STATUT_COLOR[item.statut] || 'gray'}>{STATUT_LABEL[item.statut] || item.statut}</Badge>}</Td>
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
          <Pagination page={page} totalItems={opportunitesFiltrees.length} onPageChange={setPage} /></>
        )}
      </Card>
    </div>
  )
}
