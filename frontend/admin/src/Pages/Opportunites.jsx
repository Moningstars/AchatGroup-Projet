import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2, Plus, Trash2, X, Upload, Package, Eye, Users, CalendarClock, Layers, Image, Edit2, Sparkles } from 'lucide-react'
import { Badge, Card, Table, Th, Td, Tr, Spinner, EmptyState, ProgressBar, FilterPill } from '../components/ui'
import { useSSE } from '../hooks/useSSE'
import {
  getAdminOpportunites, activerOpportunite, cloturerOpportunite,
  creerOpportunite, modifierOpportunite, uploadOpportuniteImage, deleteOpportuniteImage,
  genererSpecsOpportunite, getParticipantsOpportunite,
} from '../services/api'

const BACKEND = `http://${window.location.hostname}:8080`
const imgUrl = (url) => url ? (url.startsWith('http') ? url : BACKEND + url) : null

const CATEGORIES = ['Mode', 'Électronique', 'Véhicules', 'Maison', 'Alimentaire', 'Informatique', 'Beauté', 'Mobilier', 'Sport']

function formatMontant(val) { return Number(val || 0).toLocaleString('fr-FR') }
function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUT_COLOR = { BROUILLON: 'gray', ACTIVE: 'sky', CLOTUREE: 'emerald', ANNULEE: 'rose' }
const STATUT_LABEL = { BROUILLON: 'Brouillon', ACTIVE: 'Active', CLOTUREE: 'Clôturée', ANNULEE: 'Annulée' }
const STATUT_PARTICIPATION_COLOR = { EN_ATTENTE: 'gray', CONFIRMEE: 'emerald', REMBOURSEE: 'sky' }
const STATUT_PARTICIPATION_LABEL = { EN_ATTENTE: 'En attente', CONFIRMEE: 'Confirmée', REMBOURSEE: 'Remboursée' }

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

  useEffect(() => {
    if (!item) return
    setLoadingParticipants(true)
    getParticipantsOpportunite(item.id)
      .then(setParticipants)
      .catch(() => setParticipants([]))
      .finally(() => setLoadingParticipants(false))
  }, [item?.id])

  if (!item) return null
  const pct = item.seuilMinimum > 0
    ? Math.min(100, Math.round((item.participantsActuels / item.seuilMinimum) * 100)) : 0
  const paliers = [...(item.paliers || [])].sort((a, b) => a.seuilMin - b.seuilMin)
  const images  = item.images || []

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panneau */}
      <div className="relative z-10 w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight">{item.titre}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {item.categorie && (
                <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{item.categorie}</span>
              )}
              <Badge color={STATUT_COLOR[item.statut] || 'gray'}>{STATUT_LABEL[item.statut] || item.statut}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-6">

          {/* Stats clés */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Prix normal</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">{formatMontant(item.prixNormal)}</p>
              <p className="text-[10px] text-slate-400">FCFA</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Participants</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">{item.participantsActuels} / {item.seuilMinimum}</p>
              <p className="text-[10px] text-slate-400">{pct}%</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Expire</p>
              <p className="text-sm font-bold text-slate-900">{formatDate(item.dateExpiration)}</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
              <span className="flex items-center gap-1"><Users size={10} /> Avancement</span>
              <span>{item.participantsActuels} sur {item.seuilMinimum} requis</span>
            </div>
            <ProgressBar value={pct} color="indigo" />
            {item.seuilMaximal != null && (
              <p className="text-[11px] text-amber-600 font-semibold mt-1.5">
                Plafond : {item.participantsActuels} / {item.seuilMaximal} — {Math.max(0, item.seuilMaximal - item.participantsActuels)} place(s) restante(s)
              </p>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Description</p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.description}</p>
            </div>
          )}

          {/* Fiche produit IA */}
          {(item.specsPointsForts || item.specsCasUsage || item.specsFinePrint) && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={11} /> Fiche produit enrichie
              </p>
              {item.specsPointsForts && (
                <ul className="space-y-1">
                  {item.specsPointsForts.split('\n').filter(Boolean).map((line, i) => (
                    <li key={i} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-violet-400">•</span>{line}
                    </li>
                  ))}
                </ul>
              )}
              {item.specsCasUsage && <p className="text-sm text-slate-600 leading-relaxed">{item.specsCasUsage}</p>}
              {item.specsFinePrint && <p className="text-[11px] text-slate-400 italic">{item.specsFinePrint}</p>}
            </div>
          )}

          {/* Paliers */}
          {paliers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers size={11} /> Paliers de prix
              </p>
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                {paliers.map((p, i) => {
                  const dernier = i === paliers.length - 1
                  const actif = item.participantsActuels >= p.seuilMin &&
                    (!p.seuilMax || item.participantsActuels <= p.seuilMax)
                  return (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                      actif ? 'bg-emerald-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    } ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                      <span className={`text-[12px] font-medium ${actif ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {p.seuilMin}{dernier ? ' et plus' : ` – ${p.seuilMax}`} participants
                        {actif && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">Actif</span>}
                      </span>
                      <span className={`font-bold tabular-nums text-[12px] ${actif ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {formatMontant(p.prix)} FCFA
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Participants */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Users size={11} /> Participants ({participants.length})
            </p>
            {loadingParticipants ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-violet-500" />
              </div>
            ) : participants.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun participant pour l'instant.</p>
            ) : (
              <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.nom || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{p.telephone || '—'} · {formatDate(p.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold text-slate-600 tabular-nums">×{p.quantite}</span>
                      <Badge color={STATUT_PARTICIPATION_COLOR[p.statut] || 'gray'}>{STATUT_PARTICIPATION_LABEL[p.statut] || p.statut}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Images */}
          {images.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Image size={11} /> Images ({images.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img src={imgUrl(img.url)} alt={img.legende || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions en bas */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-2">
          {item.statut === 'BROUILLON' && (
            <button onClick={() => onActiver(item.id)} disabled={actionId === item.id}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50">
              {actionId === item.id ? <Loader2 size={14} className="animate-spin" /> : null}
              Activer l'opportunité
            </button>
          )}
          {item.statut === 'ACTIVE' && (
            <button onClick={() => onCloturer(item.id)} disabled={actionId === item.id}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50">
              {actionId === item.id ? <Loader2 size={14} className="animate-spin" /> : null}
              Clôturer l'opportunité
            </button>
          )}
          <button onClick={() => onModifier(item)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            <Edit2 size={14} /> Modifier
          </button>
          <button onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Fermer
          </button>
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
