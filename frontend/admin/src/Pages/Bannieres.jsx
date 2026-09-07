import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Image, Loader2, Calendar, Search,
  SlidersHorizontal, RotateCcw, ChevronDown, Check, ArrowLeft, UsersRound,
  ShoppingBag, Gift, Megaphone, BadgePercent, Trophy, WalletCards,
  ClipboardList, Package, Heart, Star, Zap, GripVertical, Monitor, Smartphone,
  MousePointerClick, BarChart3, LayoutGrid, List,
} from 'lucide-react'
import {
  getAdminBannieres, creerBanniere, modifierBanniere,
  toggleBanniere, supprimerBanniere, reordonnerBannieres,
} from '../services/api'
import { Pagination } from '../components/ui'

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

const STATUTS = {
  BROUILLON: { label: 'Brouillon', badge: 'bg-slate-700 text-white', dot: 'bg-slate-300', table: 'border-slate-200 bg-slate-50 text-slate-700', accent: 'bg-slate-400' },
  PROGRAMMEE: { label: 'Programmée', badge: 'bg-sky-600 text-white', dot: 'bg-sky-200', table: 'border-sky-200 bg-sky-50 text-sky-700', accent: 'bg-sky-500' },
  EN_LIGNE: { label: 'En ligne', badge: 'bg-emerald-500 text-white', dot: 'bg-white', table: 'border-emerald-200 bg-emerald-50 text-emerald-700', accent: 'bg-emerald-500' },
  EXPIREE: { label: 'Expirée', badge: 'bg-amber-500 text-white', dot: 'bg-amber-100', table: 'border-amber-200 bg-amber-50 text-amber-700', accent: 'bg-amber-500' },
  MASQUEE: { label: 'Masquée', badge: 'bg-rose-600 text-white', dot: 'bg-rose-200', table: 'border-rose-200 bg-rose-50 text-rose-700', accent: 'bg-rose-500' },
}

const BANNER_ICONS = [
  { value: '', label: 'Sans icône', icon: Image },
  { value: 'ti-users-group', label: 'Communauté', icon: UsersRound },
  { value: 'ti-shopping-bag', label: 'Achats', icon: ShoppingBag },
  { value: 'ti-gift', label: 'Cadeau', icon: Gift },
  { value: 'ti-speakerphone', label: 'Annonce', icon: Megaphone },
  { value: 'ti-discount-2', label: 'Promotion', icon: BadgePercent },
  { value: 'ti-trophy', label: 'Récompense', icon: Trophy },
  { value: 'ti-wallet', label: 'Portefeuille', icon: WalletCards },
  { value: 'ti-clipboard-text', label: 'Sondage', icon: ClipboardList },
  { value: 'ti-package', label: 'Opportunité', icon: Package },
  { value: 'ti-heart', label: 'Favori', icon: Heart },
  { value: 'ti-star', label: 'Vedette', icon: Star },
  { value: 'ti-bolt', label: 'Offre flash', icon: Zap },
]

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition'
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return BASE_URL + url
}

function periodeDiffusion(banniere) {
  if (!banniere.dateDebut && !banniere.dateFin) return 'Sans limite'
  const format = value => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  if (banniere.dateDebut && banniere.dateFin) return `${format(banniere.dateDebut)} → ${format(banniere.dateFin)}`
  if (banniere.dateDebut) return `Dès le ${format(banniere.dateDebut)}`
  return `Jusqu'au ${format(banniere.dateFin)}`
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

function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = BANNER_ICONS.find(option => option.value === value) || BANNER_ICONS[0]
  const SelectedIcon = selected.icon

  useEffect(() => {
    const close = event => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  return (
    <div ref={rootRef} className="relative" onKeyDown={event => event.key === 'Escape' && setOpen(false)}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}
        className={`flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-left transition ${open ? 'border-violet-400 bg-white ring-4 ring-violet-100' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><SelectedIcon size={16} /></span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{selected.label}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div role="listbox" aria-label="Choisir une icône" className="absolute right-0 top-full z-50 mt-2 grid w-[min(22rem,calc(100vw-2rem))] grid-cols-4 gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_-16px_rgba(15,23,42,0.35)]">
        {BANNER_ICONS.map(option => {
          const Icon = option.icon
          const active = option.value === selected.value
          return (
            <button key={option.value || 'none'} type="button" role="option" aria-selected={active}
              aria-label={option.label} title={option.label} onClick={() => { onChange(option.value); setOpen(false) }}
              className={`group relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-center transition ${active ? 'border-violet-400 bg-violet-50 text-violet-700 ring-2 ring-violet-100' : 'border-transparent bg-slate-50 text-slate-500 hover:border-violet-200 hover:text-violet-700'}`}>
              {active && <Check size={11} className="absolute right-1 top-1 rounded-full bg-violet-600 p-0.5 text-white" />}
              <Icon size={18} />
              <span className="w-full truncate text-[9px] font-bold">{option.label}</span>
            </button>
          )
        })}
      </div>}
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
    dateDebut: banniere?.dateDebut ? banniere.dateDebut.slice(0, 16) : '',
    dateFin: banniere?.dateFin ? banniere.dateFin.slice(0, 16) : '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(banniere?.imageUrl ? imgSrc(banniere.imageUrl) : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewMode, setPreviewMode] = useState('desktop')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      e.target.value = ''
      return setError('Format refusé. Utilisez une image JPEG, PNG ou GIF.')
    }
    if (file.size > 8 * 1024 * 1024) {
      e.target.value = ''
      return setError("L'image ne doit pas dépasser 8 Mo.")
    }
    setError('')
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.titre.trim()) return setError('Le titre est requis.')
    if (!isEdit && !imageFile) return setError('Une image est requise.')
    if (form.dateDebut && form.dateFin && new Date(form.dateFin) < new Date(form.dateDebut)) {
      return setError('La date de fin doit être postérieure à la date de début.')
    }
    if (form.lien && !form.lien.startsWith('/') && !/^https?:\/\//i.test(form.lien)) {
      return setError('Le lien doit commencer par / ou par http(s)://.')
    }
    const publier = e.nativeEvent.submitter?.value !== 'brouillon'

    const fd = new FormData()
    if (imageFile) fd.append('image', imageFile)
    fd.append('titre', form.titre)
    fd.append('description', form.description)
    fd.append('tag', form.tag)
    fd.append('icone', form.icone)
    fd.append('pageCible', form.pageCible)
    fd.append('lien', form.lien)
    if (form.dateDebut)   fd.append('dateDebut', form.dateDebut + ':00')
    if (form.dateFin)     fd.append('dateFin',   form.dateFin   + ':00')
    if (!isEdit) fd.append('publier', String(publier))

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
                  <span className="text-xs">JPG, PNG ou GIF · 8 Mo max · recommandé 1200×400px</span>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif" onChange={handleFile} className="hidden" />
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
              <label className={labelCls}>Icône de la bannière (optionnel)</label>
              <IconPicker value={form.icone} onChange={value => set('icone', value)} />
            </div>
          </div>

          {/* Lien */}
          <div>
            <div>
              <label className={labelCls}>Lien au clic (optionnel)</label>
              <input value={form.lien} onChange={e => set('lien', e.target.value)} className={inputCls} placeholder="/opportunites ou /sondages/uuid" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Le classement se règle par glisser-déposer depuis la liste des campagnes.</p>
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

          <section aria-label="Prévisualisation de la bannière" className="rounded-2xl border border-slate-200 bg-slate-100 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-700">Aperçu avant publication</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Rendu indicatif avec le texte et l’image saisis.</p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                <button type="button" onClick={() => setPreviewMode('desktop')} aria-label="Aperçu ordinateur" className={`rounded-lg p-2 ${previewMode === 'desktop' ? 'bg-violet-100 text-violet-700' : 'text-slate-400'}`}><Monitor size={16} /></button>
                <button type="button" onClick={() => setPreviewMode('mobile')} aria-label="Aperçu mobile" className={`rounded-lg p-2 ${previewMode === 'mobile' ? 'bg-violet-100 text-violet-700' : 'text-slate-400'}`}><Smartphone size={16} /></button>
              </div>
            </div>
            <div className={`mx-auto overflow-hidden rounded-2xl bg-slate-900 shadow-lg transition-all ${previewMode === 'mobile' ? 'max-w-[320px]' : 'w-full'}`}>
              <div className={`relative overflow-hidden ${previewMode === 'mobile' ? 'h-72' : 'h-56'}`}>
                {preview ? <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-violet-900 to-slate-950" />}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/20" />
                <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-8">
                  {form.tag && <span className="mb-3 w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/80">{form.tag}</span>}
                  <h4 className="max-w-lg text-xl font-black text-white sm:text-2xl">{form.titre || 'Titre de votre campagne'}</h4>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-white/70">{form.description || 'La description apparaîtra ici pour présenter clairement votre message.'}</p>
                  {form.lien && <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-violet-800">En savoir plus <span>→</span></span>}
                </div>
              </div>
            </div>
          </section>

          {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 lg:px-8">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              Annuler
            </button>
            {!isEdit && <button type="submit" value="brouillon" disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60">
              Enregistrer en brouillon
            </button>}
            <button type="submit" value="publier" disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Publier la bannière'}
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

function BanniereCard({ b, onEdit, onToggle, onDelete, pending, organisable, dragging, onDragStart, onDragEnd, onDrop }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const statut = STATUTS[b.statutDiffusion] || STATUTS.MASQUEE

  const dateLabel = b.dateDebut || b.dateFin
    ? [
        b.dateDebut ? `Du ${new Date(b.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}` : null,
        b.dateFin ? `au ${new Date(b.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}` : null,
      ].filter(Boolean).join(' ')
    : 'Diffusion sans limite de date'

  return (
    <article
      draggable={organisable}
      onDragStart={event => onDragStart?.(event, b.id)}
      onDragEnd={onDragEnd}
      onDragOver={event => organisable && event.preventDefault()}
      onDrop={event => { event.preventDefault(); onDrop?.(b.id) }}
      className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:shadow-md ${organisable ? 'cursor-grab border-violet-200 active:cursor-grabbing' : 'border-slate-200 hover:-translate-y-0.5'} ${dragging ? 'scale-[0.98] opacity-40' : ''}`}
    >
      {/* Image preview */}
      <div className="relative aspect-[16/7] overflow-hidden bg-slate-100">
        {b.imageUrl ? (
          <img src={imgSrc(b.imageUrl)} alt={b.titre} className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] ${b.statutDiffusion === 'EN_LIGNE' ? '' : 'grayscale-[35%]'}`} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <Image size={32} />
          </div>
        )}
        {/* Overlay infos */}
        {/* Badge statut */}
        <div className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${statut.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statut.dot}`} />
          {statut.label}
        </div>
        {organisable && <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-black text-violet-700 shadow"><GripVertical size={13} /> Déplacer</div>}
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
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-2"><BarChart3 size={13} className="text-sky-500" /><strong className="mt-1 block text-sm text-slate-900">{Number(b.impressions || 0).toLocaleString('fr-FR')}</strong><span className="text-[9px] font-bold uppercase text-slate-400">Vues</span></div>
          <div className="rounded-xl bg-slate-50 p-2"><MousePointerClick size={13} className="text-violet-500" /><strong className="mt-1 block text-sm text-slate-900">{Number(b.clics || 0).toLocaleString('fr-FR')}</strong><span className="text-[9px] font-bold uppercase text-slate-400">Clics</span></div>
          <div className="rounded-xl bg-slate-50 p-2"><BadgePercent size={13} className="text-emerald-500" /><strong className="mt-1 block text-sm text-slate-900">{Number(b.tauxClic || 0).toLocaleString('fr-FR')} %</strong><span className="text-[9px] font-bold uppercase text-slate-400">CTR</span></div>
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
            <span className="hidden 2xl:inline">{b.actif ? 'Masquer' : b.brouillon ? 'Publier' : 'Afficher'}</span>
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

function BanniereTable({ bannieres, onEdit, onToggle, onDelete, pendingId }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
              <th className="px-4 py-3">Campagne</th>
              <th className="px-3 py-3">Destination</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Diffusion</th>
              <th className="px-3 py-3 text-center">Position</th>
              <th className="px-3 py-3 text-right">Performance</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bannieres.map(b => {
              const statut = STATUTS[b.statutDiffusion] || STATUTS.MASQUEE
              const pending = pendingId === b.id
              return (
                <tr key={b.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex min-w-[250px] items-center gap-3">
                      <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {b.imageUrl ? <img src={imgSrc(b.imageUrl)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Image size={20} /></div>}
                      </div>
                      <div className="min-w-0">
                        {b.tag && <p className="truncate text-[9px] font-black uppercase tracking-wider text-violet-600">{b.tag}</p>}
                        <p className="max-w-[260px] truncate text-sm font-bold text-slate-950" title={b.titre}>{b.titre}</p>
                        <p className="mt-0.5 max-w-[260px] truncate text-[11px] text-slate-400" title={b.description}>{b.description || 'Sans description'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${PAGE_COLORS[b.pageCible] || 'bg-slate-100 text-slate-600'}`}>{PAGE_LABELS[b.pageCible] || b.pageCible}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex min-w-[96px] items-center gap-2 whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-[11px] font-bold ${statut.table}`}>
                      <span className="relative flex h-2 w-2 shrink-0">
                        {b.statutDiffusion === 'EN_LIGNE' && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-40" />}
                        <span className={`relative h-2 w-2 rounded-full ${statut.accent}`} />
                      </span>
                      {statut.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[11px] font-medium text-slate-500">{periodeDiffusion(b)}</td>
                  <td className="px-3 py-3 text-center"><span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-black text-slate-700">{b.ordre}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-3 whitespace-nowrap">
                      <span title="Impressions"><strong className="block text-xs text-slate-900">{Number(b.impressions || 0).toLocaleString('fr-FR')}</strong><small className="text-[9px] font-bold uppercase text-slate-400">vues</small></span>
                      <span title="Clics"><strong className="block text-xs text-slate-900">{Number(b.clics || 0).toLocaleString('fr-FR')}</strong><small className="text-[9px] font-bold uppercase text-slate-400">clics</small></span>
                      <span title="Taux de clic"><strong className="block text-xs text-emerald-700">{Number(b.tauxClic || 0).toLocaleString('fr-FR')} %</strong><small className="text-[9px] font-bold uppercase text-slate-400">CTR</small></span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" onClick={() => onEdit(b)} disabled={pending} title="Modifier" aria-label={`Modifier ${b.titre}`} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:border-violet-300 hover:text-violet-700 disabled:opacity-50"><Edit2 size={14} /></button>
                      <button type="button" onClick={() => onToggle(b)} disabled={pending} title={b.actif ? 'Masquer' : b.brouillon ? 'Publier' : 'Afficher'} aria-label={`${b.actif ? 'Masquer' : 'Afficher'} ${b.titre}`} className={`rounded-lg border p-2 disabled:opacity-50 ${b.actif ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{pending ? <Loader2 size={14} className="animate-spin" /> : b.actif ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      <button type="button" onClick={() => window.confirm(`Supprimer définitivement « ${b.titre} » ?`) && onDelete(b)} disabled={pending} title="Supprimer" aria-label={`Supprimer ${b.titre}`} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
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
  const [page, setPage] = useState(1)
  const [organisation, setOrganisation] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [modeAffichage, setModeAffichage] = useState(() => window.localStorage.getItem('bannieres-mode-affichage') === 'tableau' ? 'tableau' : 'cartes')

  useEffect(() => {
    window.localStorage.setItem('bannieres-mode-affichage', modeAffichage)
  }, [modeAffichage])

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
      const miseAJour = await toggleBanniere(b.id)
      setBannieres(items => items.map(item => item.id === b.id ? miseAJour : item))
      setFeedback(`La campagne « ${b.titre} » est maintenant ${STATUTS[miseAJour.statutDiffusion]?.label.toLocaleLowerCase('fr') || 'mise à jour'}.`)
    } catch {
      setFeedback("L'état de la bannière n'a pas pu être modifié.")
    } finally {
      setPendingId(null)
    }
  }

  const activerOrganisation = () => {
    setOrganisation(active => {
      if (!active) {
        setFiltre('TOUS')
        setStatut('TOUS')
        setRecherche('')
        setPage(1)
      }
      return !active
    })
  }

  const handleDrop = async (targetId) => {
    if (!draggedId || draggedId === targetId) return setDraggedId(null)
    const avant = bannieres
    const ordonnees = [...bannieres].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
    const sourceIndex = ordonnees.findIndex(item => item.id === draggedId)
    const cibleIndex = ordonnees.findIndex(item => item.id === targetId)
    if (sourceIndex < 0 || cibleIndex < 0) return setDraggedId(null)
    const [deplacee] = ordonnees.splice(sourceIndex, 1)
    ordonnees.splice(cibleIndex, 0, deplacee)
    const optimistes = ordonnees.map((item, index) => ({ ...item, ordre: index }))
    setBannieres(optimistes)
    setDraggedId(null)
    try {
      const sauvegardees = await reordonnerBannieres(optimistes.map(item => item.id))
      setBannieres(sauvegardees)
      setFeedback('Le nouvel ordre de diffusion a été enregistré.')
    } catch {
      setBannieres(avant)
      setFeedback("Le classement n'a pas pu être enregistré.")
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
    .filter(b => statut === 'TOUS' || b.statutDiffusion === statut)
    .filter(b => !terme || [b.titre, b.description, b.tag].some(value => value?.toLocaleLowerCase('fr').includes(terme)))
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || a.titre.localeCompare(b.titre, 'fr'))

  const counts = bannieres.reduce((acc, b) => {
    acc[b.pageCible] = (acc[b.pageCible] || 0) + 1
    acc.TOUS = (acc.TOUS || 0) + 1
    return acc
  }, {})

  const statusCounts = bannieres.reduce((acc, b) => {
    acc[b.statutDiffusion] = (acc[b.statutDiffusion] || 0) + 1
    return acc
  }, {})
  const activeCount = statusCounts.EN_LIGNE || 0
  const hasFilters = filtre !== 'TOUS' || statut !== 'TOUS' || recherche.trim()
  useEffect(() => setPage(1), [filtre, statut, recherche])
  const bannieresPage = organisation ? filtrees : filtrees.slice((page - 1) * 10, page * 10)

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
    { value: 'BROUILLON', label: `Brouillons (${statusCounts.BROUILLON || 0})`, dot: 'bg-slate-500' },
    { value: 'PROGRAMMEE', label: `Programmées (${statusCounts.PROGRAMMEE || 0})`, dot: 'bg-sky-500' },
    { value: 'EN_LIGNE', label: `En ligne (${activeCount})`, dot: 'bg-emerald-500' },
    { value: 'EXPIREE', label: `Expirées (${statusCounts.EXPIREE || 0})`, dot: 'bg-amber-500' },
    { value: 'MASQUEE', label: `Masquées (${statusCounts.MASQUEE || 0})`, dot: 'bg-rose-500' },
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
            <span><strong className="text-emerald-600">{activeCount}</strong> en ligne</span>
            <span><strong className="text-sky-600">{statusCounts.PROGRAMMEE || 0}</strong> programmées</span>
            <span><strong className="text-slate-600">{statusCounts.BROUILLON || 0}</strong> brouillons</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button type="button" onClick={activerOrganisation} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${organisation ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200'}`}>
            <GripVertical size={16} /> {organisation ? 'Terminer le classement' : 'Réorganiser'}
          </button>
          <button
            onClick={() => navigate('/bannieres/nouvelle')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
          >
            <Plus size={16} /> Nouvelle bannière
          </button>
        </div>
      </div>

      {organisation && <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800"><GripVertical size={18} className="shrink-0" /><p><strong>Mode classement :</strong> faites glisser une carte à la position souhaitée. Chaque déplacement est enregistré immédiatement.</p></div>}

      {/* Recherche et filtres */}
      {!organisation && <section aria-label="Filtres des bannières" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500"><strong className="text-slate-800">{filtrees.length}</strong> résultat{filtrees.length !== 1 ? 's' : ''}, classé{filtrees.length !== 1 ? 's' : ''} par position d’affichage.</p>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Mode d'affichage">
            <button type="button" onClick={() => setModeAffichage('cartes')} aria-pressed={modeAffichage === 'cartes'} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${modeAffichage === 'cartes' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><LayoutGrid size={14} /> Cartes</button>
            <button type="button" onClick={() => setModeAffichage('tableau')} aria-pressed={modeAffichage === 'tableau'} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${modeAffichage === 'tableau' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><List size={15} /> Tableau</button>
          </div>
        </div>
      </section>}

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
        <>{!organisation && modeAffichage === 'tableau' ? (
          <BanniereTable
            bannieres={bannieresPage}
            onEdit={item => navigate(`/bannieres/${item.id}/modifier`)}
            onToggle={handleToggle}
            onDelete={handleDelete}
            pendingId={pendingId}
          />
        ) : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bannieresPage.map(b => (
            <BanniereCard
              key={b.id}
              b={b}
              onEdit={item => navigate(`/bannieres/${item.id}/modifier`)}
              onToggle={handleToggle}
              onDelete={handleDelete}
              pending={pendingId === b.id}
              organisable={organisation}
              dragging={draggedId === b.id}
              onDragStart={(event, id) => {
                event.dataTransfer.effectAllowed = 'move'
                setDraggedId(id)
              }}
              onDragEnd={() => setDraggedId(null)}
              onDrop={handleDrop}
            />
          ))}
        </div>}{!organisation && <Pagination page={page} totalItems={filtrees.length} onPageChange={setPage} />}</>
      )}

      {feedback && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-2xl">
          {feedback}
        </div>
      )}

    </div>
  )
}
