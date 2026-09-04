import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, Loader2, Calendar, Search, SlidersHorizontal, RotateCcw, ChevronDown, Check, ArrowLeft } from 'lucide-react'
import {
  getAdminBannieres, creerBanniere, modifierBanniere,
  toggleBanniere, supprimerBanniere,
} from '../services/api'

const BASE_URL = `http://${window.location.hostname}:8080`

const PAGE_OPTS = [
  { value: 'ACCUEIL',   label: 'Accueil' },
  { value: 'CATALOGUE', label: 'Catalogue' },
  { value: 'SONDAGES',  label: 'Sondages' },
  { value: 'TOUTES',    label: 'Toutes les pages' },
]

const PAGE_COLORS = {
  ACCUEIL:   'bg-violet-100 text-violet-700',
  CATALOGUE: 'bg-amber-100 text-amber-700',
  SONDAGES:  'bg-sky-100 text-sky-700',
  TOUTES:    'bg-emerald-100 text-emerald-700',
}

const PAGE_LABELS = { ACCUEIL: 'Accueil', CATALOGUE: 'Catalogue', SONDAGES: 'Sondages', TOUTES: 'Toutes' }

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition'
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return BASE_URL + url
}

function FilterDropdown({ label, value, onChange, options, icon: Icon }) {
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
    <div ref={rootRef} className="relative min-w-0" onKeyDown={event => event.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={`group flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-left outline-none transition ${open ? 'border-violet-400 bg-white ring-4 ring-violet-100' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${open ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">{label}</span>
          <span className="block truncate text-[12px] font-bold text-slate-700">{selected?.label}</span>
        </span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-violet-600' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[13rem] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_-16px_rgba(15,23,42,0.35)]"
        >
          {options.map(option => {
            const active = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { onChange(option.value); setOpen(false) }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
              >
                {option.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`} />}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {active && <Check size={14} aria-hidden="true" className="shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Formulaire pleine page ──────────────────────────────────────────────────

function BanniereForm({ banniere, onClose, onSaved }) {
  const isEdit = !!banniere
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    titre: banniere?.titre ?? '',
    description: banniere?.description ?? '',
    tag: banniere?.tag ?? '',
    icone: banniere?.icone ?? '',
    pageCible: banniere?.pageCible ?? 'ACCUEIL',
    lien: banniere?.lien ?? '',
    ordre: banniere?.ordre ?? 0,
    dateDebut: banniere?.dateDebut ? banniere.dateDebut.slice(0, 16) : '',
    dateFin: banniere?.dateFin ? banniere.dateFin.slice(0, 16) : '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(banniere?.imageUrl ? imgSrc(banniere.imageUrl) : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.titre.trim()) return setError('Le titre est requis.')
    if (!isEdit && !imageFile) return setError('Une image est requise.')

    const fd = new FormData()
    if (imageFile) fd.append('image', imageFile)
    fd.append('titre', form.titre)
    if (form.description) fd.append('description', form.description)
    if (form.tag)         fd.append('tag', form.tag)
    if (form.icone)       fd.append('icone', form.icone)
    fd.append('pageCible', form.pageCible)
    if (form.lien)        fd.append('lien', form.lien)
    fd.append('ordre', String(form.ordre))
    if (form.dateDebut)   fd.append('dateDebut', form.dateDebut + ':00')
    if (form.dateFin)     fd.append('dateFin',   form.dateFin   + ':00')

    setLoading(true)
    try {
      if (isEdit) {
        await modifierBanniere(banniere.id, fd)
      } else {
        await creerBanniere(fd)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-8">
      <section
        aria-labelledby="banniere-modal-title"
        className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onClose} disabled={loading} aria-label="Retour aux bannières" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">
              {isEdit ? 'Édition' : 'Création'}
            </p>
            <h3 id="banniere-modal-title" className="mt-0.5 text-lg font-bold text-slate-950">
            {isEdit ? 'Modifier la bannière' : 'Nouvelle bannière'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">Configurez le visuel, sa destination et sa période d'affichage.</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
          {/* Image */}
          <div>
            <label className={labelCls}>Image de fond *</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={preview ? "Changer l'image de fond" : "Choisir une image de fond"}
              className="relative h-32 w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-200 text-left transition-colors hover:border-violet-400 sm:h-40"
            >
              {preview ? (
                <>
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-semibold">Changer l'image</span>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                  <Image size={28} />
                  <span className="text-sm">Cliquez pour choisir une image</span>
                  <span className="text-xs">JPG, PNG, WebP — recommandé 1200×400px</span>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          {/* Titre + Tag */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Titre *</label>
              <input value={form.titre} onChange={e => set('titre', e.target.value)} className={inputCls} placeholder="Ex : L'union fait le prix." />
            </div>
            <div>
              <label className={labelCls}>Tag (petit label)</label>
              <input value={form.tag} onChange={e => set('tag', e.target.value)} className={inputCls} placeholder="Ex : Achat Groupé" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputCls} placeholder="Sous-titre affiché sur la bannière..." />
          </div>

          {/* Page + Icone */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Page cible *</label>
              <select value={form.pageCible} onChange={e => set('pageCible', e.target.value)} className={inputCls}>
                {PAGE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Icône Tabler (optionnel)</label>
              <input value={form.icone} onChange={e => set('icone', e.target.value)} className={inputCls} placeholder="ti-users-group" />
            </div>
          </div>

          {/* Lien + Ordre */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Lien au clic (optionnel)</label>
              <input value={form.lien} onChange={e => set('lien', e.target.value)} className={inputCls} placeholder="/opportunites ou /sondages/uuid" />
            </div>
            <div>
              <label className={labelCls}>Ordre d'affichage</label>
              <input type="number" min={0} value={form.ordre} onChange={e => set('ordre', parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>

          {/* Planification */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Calendar size={13} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Planification (optionnel)</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Date de début</label>
                <input type="datetime-local" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date de fin</label>
                <input type="datetime-local" value={form.dateFin} onChange={e => set('dateFin', e.target.value)} className={inputCls} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Sans dates, la bannière s'affiche tant qu'elle est active.</p>
          </div>

          {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 lg:px-8">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer la bannière'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export function BanniereEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [banniere, setBanniere] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    getAdminBannieres()
      .then(items => {
        if (cancelled) return
        const trouvee = items.find(item => item.id === id)
        if (trouvee) setBanniere(trouvee)
        else setError('Cette bannière est introuvable ou a été supprimée.')
      })
      .catch(() => { if (!cancelled) setError("Impossible de charger la bannière.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 size={28} className="animate-spin text-violet-600" /></div>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <Image size={36} className="mx-auto text-rose-300" />
        <p className="mt-3 font-bold text-slate-900">{error}</p>
        <button type="button" onClick={() => navigate('/bannieres')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
          <ArrowLeft size={16} /> Retour aux bannières
        </button>
      </div>
    )
  }

  return (
    <BanniereForm
      banniere={id ? banniere : null}
      onClose={() => navigate('/bannieres')}
      onSaved={() => navigate('/bannieres', { replace: true })}
    />
  )
}

// ── Carte bannière ────────────────────────────────────────────────────────────

function BanniereCard({ b, onEdit, onToggle, onDelete, pending }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dateLabel = b.dateDebut || b.dateFin
    ? [
        b.dateDebut ? `Du ${new Date(b.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}` : null,
        b.dateFin ? `au ${new Date(b.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}` : null,
      ].filter(Boolean).join(' ')
    : 'Diffusion sans limite de date'

  return (
    <article className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${b.actif ? 'border-slate-200' : 'border-slate-200 bg-slate-50'}`}>
      {/* Image preview */}
      <div className="relative aspect-[16/7] overflow-hidden bg-slate-100">
        {b.imageUrl ? (
          <img src={imgSrc(b.imageUrl)} alt={b.titre} className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] ${b.actif ? '' : 'grayscale'}`} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <Image size={32} />
          </div>
        )}
        {/* Overlay infos */}
        {/* Badge statut */}
        <div className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${b.actif ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${b.actif ? 'bg-white' : 'bg-slate-300'}`} />
          {b.actif ? 'Actif' : 'Inactif'}
        </div>
      </div>

      {/* Infos */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PAGE_COLORS[b.pageCible] || 'bg-slate-100 text-slate-600'}`}>
            {PAGE_LABELS[b.pageCible] || b.pageCible}
          </span>
          <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">Position {b.ordre}</span>
        </div>

        {b.tag && <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-violet-600">{b.tag}</p>}
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-950">{b.titre}</h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
          {b.description || 'Aucune description renseignée.'}
        </p>

        <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <Calendar size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{dateLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-slate-100 bg-slate-50/70 p-3">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <p className="mr-auto text-xs font-semibold text-rose-700">Supprimer cette bannière ?</p>
            <button type="button" onClick={() => setConfirmDelete(false)} disabled={pending} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white">Annuler</button>
            <button type="button" onClick={() => onDelete(b)} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60">
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Supprimer
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
          <button type="button" onClick={() => onEdit(b)} disabled={pending} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-60">
            <Edit2 size={14} /> Modifier
          </button>
          <button type="button" onClick={() => onToggle(b)} disabled={pending} aria-label={b.actif ? `Masquer ${b.titre}` : `Afficher ${b.titre}`} className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:opacity-60 ${b.actif ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : b.actif ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden 2xl:inline">{b.actif ? 'Masquer' : 'Afficher'}</span>
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={pending} aria-label={`Supprimer ${b.titre}`} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60">
            <Trash2 size={14} />
          </button>
          </div>
        )}
        </div>
    </article>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function Bannieres() {
  const navigate = useNavigate()
  const [bannieres, setBannieres] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('TOUS')
  const [statut, setStatut] = useState('TOUS')
  const [recherche, setRecherche] = useState('')
  const [pendingId, setPendingId] = useState(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let cancelled = false
    getAdminBannieres()
      .then(items => { if (!cancelled) setBannieres(items) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleToggle = async (b) => {
    setPendingId(b.id)
    try {
      await toggleBanniere(b.id)
      setBannieres(items => items.map(item => item.id === b.id ? { ...item, actif: !item.actif } : item))
      setFeedback(`La bannière « ${b.titre} » est maintenant ${b.actif ? 'masquée' : 'visible'}.`)
    } catch {
      setFeedback("L'état de la bannière n'a pas pu être modifié.")
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (b) => {
    setPendingId(b.id)
    try {
      await supprimerBanniere(b.id)
      setBannieres(items => items.filter(item => item.id !== b.id))
      setFeedback(`La bannière « ${b.titre} » a été supprimée.`)
    } catch {
      setFeedback("La bannière n'a pas pu être supprimée.")
    } finally {
      setPendingId(null)
    }
  }

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(''), 3500)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const terme = recherche.trim().toLocaleLowerCase('fr')
  const filtrees = bannieres
    .filter(b => filtre === 'TOUS' || b.pageCible === filtre)
    .filter(b => statut === 'TOUS' || (statut === 'ACTIF' ? b.actif : !b.actif))
    .filter(b => !terme || [b.titre, b.description, b.tag].some(value => value?.toLocaleLowerCase('fr').includes(terme)))
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || a.titre.localeCompare(b.titre, 'fr'))

  const counts = bannieres.reduce((acc, b) => {
    acc[b.pageCible] = (acc[b.pageCible] || 0) + 1
    acc.TOUS = (acc.TOUS || 0) + 1
    return acc
  }, {})

  const activeCount = bannieres.filter(b => b.actif).length
  const hasFilters = filtre !== 'TOUS' || statut !== 'TOUS' || recherche.trim()

  const resetFilters = () => {
    setFiltre('TOUS')
    setStatut('TOUS')
    setRecherche('')
  }

  const destinationOptions = [
    { value: 'TOUS', label: `Toutes les destinations (${counts.TOUS || 0})` },
    ...PAGE_OPTS.map(option => ({
      value: option.value,
      label: `${option.value === 'TOUTES' ? 'Globales · toutes les pages' : option.label} (${counts[option.value] || 0})`,
    })),
  ]
  const statusOptions = [
    { value: 'TOUS', label: 'Tous les statuts', dot: 'bg-violet-500' },
    { value: 'ACTIF', label: `Visibles (${activeCount})`, dot: 'bg-emerald-500' },
    { value: 'INACTIF', label: `Masquées (${bannieres.length - activeCount})`, dot: 'bg-slate-400' },
  ]

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Bannières publicitaires</h2>
          <p className="mt-1 text-sm text-slate-500">Créez, planifiez et contrôlez les visuels affichés dans l’application.</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
            <span><strong className="text-slate-950">{bannieres.length}</strong> au total</span>
            <span><strong className="text-emerald-600">{activeCount}</strong> visibles</span>
            <span><strong className="text-slate-600">{bannieres.length - activeCount}</strong> masquées</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/bannieres/nouvelle')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700 sm:w-auto"
        >
          <Plus size={16} /> Nouvelle bannière
        </button>
      </div>

      {/* Recherche et filtres */}
      <section aria-label="Filtres des bannières" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(300px,1fr)_minmax(220px,0.65fr)_minmax(190px,0.5fr)_auto]">
          <label className="relative block">
            <span className="sr-only">Rechercher une bannière</span>
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={recherche} onChange={event => setRecherche(event.target.value)} placeholder="Rechercher par titre, tag ou description…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" />
          </label>
          <FilterDropdown label="Destination" value={filtre} onChange={setFiltre} options={destinationOptions} icon={SlidersHorizontal} />
          <FilterDropdown label="Visibilité" value={statut} onChange={setStatut} options={statusOptions} icon={Eye} />
          <button type="button" onClick={resetFilters} disabled={!hasFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-60 md:col-span-2 xl:col-span-1">
            <RotateCcw size={15} /> Réinitialiser
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500"><strong className="text-slate-800">{filtrees.length}</strong> résultat{filtrees.length !== 1 ? 's' : ''}, classé{filtrees.length !== 1 ? 's' : ''} par position d’affichage.</p>
      </section>

      {/* Grille */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
      ) : filtrees.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 px-4 text-center">
          <Image size={36} className="text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">Aucune bannière trouvée</p>
          <p className="mt-1 max-w-sm text-sm text-slate-400">Modifiez les critères de recherche ou créez une nouvelle bannière.</p>
          {hasFilters && <button type="button" onClick={resetFilters} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Effacer les filtres</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtrees.map(b => (
            <BanniereCard
              key={b.id}
              b={b}
              onEdit={item => navigate(`/bannieres/${item.id}/modifier`)}
              onToggle={handleToggle}
              onDelete={handleDelete}
              pending={pendingId === b.id}
            />
          ))}
        </div>
      )}

      {feedback && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-2xl">
          {feedback}
        </div>
      )}

    </div>
  )
}
