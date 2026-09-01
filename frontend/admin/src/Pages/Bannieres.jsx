import { useEffect, useRef, useState } from 'react'
import { Plus, X, Edit2, Trash2, Eye, EyeOff, Image, Loader2, Calendar } from 'lucide-react'
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

// ── Modal formulaire ─────────────────────────────────────────────────────────

function BanniereModal({ banniere, onClose, onSaved }) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">
            {isEdit ? 'Modifier la bannière' : 'Nouvelle bannière'}
          </h3>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image */}
          <div>
            <label className={labelCls}>Image de fond *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-200 hover:border-violet-400 transition-colors"
              style={{ height: 160 }}
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
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          {/* Titre + Tag */}
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer la bannière'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Carte bannière ────────────────────────────────────────────────────────────

function BanniereCard({ b, onEdit, onToggle, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className={`rounded-xl border bg-white overflow-hidden transition-opacity ${b.actif ? '' : 'opacity-60'}`}>
      {/* Image preview */}
      <div className="relative h-36 bg-slate-100">
        {b.imageUrl ? (
          <img src={imgSrc(b.imageUrl)} alt={b.titre} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <Image size={32} />
          </div>
        )}
        {/* Overlay infos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {b.tag && (
            <span className="mb-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {b.tag}
            </span>
          )}
          <p className="text-sm font-bold text-white line-clamp-1">{b.titre}</p>
        </div>
        {/* Badge statut */}
        <div className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${b.actif ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
          {b.actif ? 'Actif' : 'Inactif'}
        </div>
      </div>

      {/* Infos */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PAGE_COLORS[b.pageCible] || 'bg-slate-100 text-slate-600'}`}>
            {PAGE_LABELS[b.pageCible] || b.pageCible}
          </span>
          <span className="text-[11px] text-slate-400">Ordre {b.ordre}</span>
        </div>

        {b.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{b.description}</p>
        )}

        {(b.dateDebut || b.dateFin) && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-2">
            <Calendar size={11} />
            {b.dateDebut && <span>Dès {new Date(b.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>}
            {b.dateFin   && <span>→ {new Date(b.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <button onClick={() => onEdit(b)} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Edit2 size={12} /> Modifier
          </button>
          <button onClick={() => onToggle(b)} className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 px-2.5 text-xs font-semibold transition ${b.actif ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
            {b.actif ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          {confirmDelete ? (
            <button onClick={() => onDelete(b)} className="flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700">
              Confirmer
            </button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:text-rose-500">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function Bannieres() {
  const [bannieres, setBannieres] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('TOUS')
  const [modal, setModal] = useState(null) // null | 'new' | <banniere>

  const fetchData = () => {
    setLoading(true)
    getAdminBannieres()
      .then(setBannieres)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleToggle = async (b) => {
    await toggleBanniere(b.id)
    fetchData()
  }

  const handleDelete = async (b) => {
    await supprimerBanniere(b.id)
    fetchData()
  }

  const filtrees = filtre === 'TOUS' ? bannieres : bannieres.filter(b => b.pageCible === filtre)

  const counts = bannieres.reduce((acc, b) => {
    acc[b.pageCible] = (acc[b.pageCible] || 0) + 1
    acc.TOUS = (acc.TOUS || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Bannières publicitaires</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gérez les carousels affichés sur l'application</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition"
        >
          <Plus size={16} /> Nouvelle bannière
        </button>
      </div>

      {/* Filtres par page */}
      <div className="flex flex-wrap gap-2">
        {[{ key: 'TOUS', label: 'Toutes' }, ...PAGE_OPTS].map(({ key, value, label }) => {
          const k = key || value
          return (
            <button
              key={k}
              onClick={() => setFiltre(k)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${filtre === k ? 'bg-violet-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}
            >
              {label} {counts[k] ? <span className="ml-1 opacity-70">({counts[k]})</span> : null}
            </button>
          )
        })}
      </div>

      {/* Grille */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
      ) : filtrees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Image size={36} className="text-slate-300 mb-3" />
          <p className="font-semibold text-slate-500">Aucune bannière</p>
          <p className="text-sm text-slate-400 mt-1">Créez votre première bannière avec le bouton ci-dessus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrees.map(b => (
            <BanniereCard
              key={b.id}
              b={b}
              onEdit={setModal}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <BanniereModal
          banniere={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchData() }}
        />
      )}
    </div>
  )
}
