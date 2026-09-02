import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff, Building2, Plus, X } from 'lucide-react'
import {
  Badge, Card, Table, Th, Td, Tr, Spinner, EmptyState,
  SearchInput, FilterPill, ActionBtn,
} from '../components/ui'
import {
  getAdminCommanditaires, creerCommanditaire,
  activerCommanditaire, suspendreCommanditaire,
} from '../services/api'

const STATUT_COLOR = { ACTIF: 'emerald', SUSPENDU: 'rose', EN_ATTENTE: 'amber' }
const STATUT_LABEL = { ACTIF: 'Actif', SUSPENDU: 'Suspendu', EN_ATTENTE: 'En attente' }
const FILTERS       = ['TOUS', 'ACTIF', 'EN_ATTENTE', 'SUSPENDU']
const FILTER_LABELS = ['Tous', 'Actifs', 'En attente', 'Suspendus']

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 transition'
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1'

function initiales(nom, prenom) {
  return ((nom?.[0] || '') + (prenom?.[0] || '')).toUpperCase() || '?'
}

// ── Modal : nouveau commanditaire ────────────────────────────────────────────

function NouveauCommanditaireModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ nom: '', prenom: '', societe: '', email: '', telephone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await creerCommanditaire(form)
      onSaved()
    } catch (err) {
      if (err.response?.status === 409) setError('Un commanditaire avec cet email existe déjà.')
      else setError(err.response?.data?.message || 'Erreur lors de la création.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Nouveau commanditaire</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nom *</label>
              <input required value={form.nom} onChange={e => set('nom', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prénom *</label>
              <input required value={form.prenom} onChange={e => set('prenom', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Société *</label>
            <input required value={form.societe} onChange={e => set('societe', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Téléphone *</label>
            <input required value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+228 90 00 00 00" className={inputCls} />
          </div>
          {error && <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">{error}</div>}
          <div className="flex gap-2.5 pt-1">
            <button type="submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-700 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Créer le commanditaire
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

// ── Page principale ───────────────────────────────────────────────────────────

export default function Commanditaires() {
  const [commanditaires, setCommanditaires] = useState([])
  const [loading, setLoading]               = useState(true)
  const [filterIdx, setFilterIdx]           = useState(0)
  const [search, setSearch]                 = useState('')
  const [actionId, setActionId]             = useState(null)
  const [confirmId, setConfirmId]           = useState(null)
  const [showNouveauModal, setShowNouveauModal] = useState(false)

  const fetchData = () => {
    setLoading(true)
    getAdminCommanditaires()
      .then(setCommanditaires)
      .catch(() => setCommanditaires([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleActiver = async (id) => {
    setActionId(id)
    try { await activerCommanditaire(id); fetchData() }
    catch { }
    finally { setActionId(null) }
  }

  const handleSuspendre = async (id) => {
    setConfirmId(null)
    setActionId(id)
    try { await suspendreCommanditaire(id); fetchData() }
    catch { }
    finally { setActionId(null) }
  }

  const filtre   = FILTERS[filterIdx]
  const filtered = commanditaires
    .filter(c => filtre === 'TOUS' || c.statut === filtre)
    .filter(c => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.nom?.toLowerCase().includes(q) ||
        c.prenom?.toLowerCase().includes(q) ||
        c.societe?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telephone?.toLowerCase().includes(q)
      )
    })

  const countByStatut = key => commanditaires.filter(c => c.statut === key).length

  return (
    <div className="space-y-4">

      {showNouveauModal && (
        <NouveauCommanditaireModal
          onClose={() => setShowNouveauModal(false)}
          onSaved={() => { setShowNouveauModal(false); fetchData() }}
        />
      )}

      {/* ── En-tête ── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold text-slate-900">Commanditaires</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {commanditaires.length} commanditaire{commanditaires.length !== 1 ? 's' : ''} enregistré{commanditaires.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {[
              { key: 'ACTIF',      label: 'Actifs',     cls: 'bg-emerald-50 text-emerald-700' },
              { key: 'EN_ATTENTE', label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
              { key: 'SUSPENDU',   label: 'Suspendus',  cls: 'bg-rose-50 text-rose-600' },
            ].map(({ key, label, cls }) => (
              <span key={key} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${cls}`}>
                {countByStatut(key)} {label}
              </span>
            ))}
            <button
              onClick={() => setShowNouveauModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-800 transition shadow-sm shadow-violet-200"
            >
              <Plus size={15} /> Nouveau
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Nom, société, email, téléphone…" />
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_LABELS.map((label, idx) => (
              <FilterPill key={label} label={label} active={filterIdx === idx} onClick={() => setFilterIdx(idx)} />
            ))}
          </div>
        </div>
      </Card>

      {/* ── Tableau ── */}
      <Card noPad>
        {loading ? (
          <Spinner py="py-12" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Aucun commanditaire trouvé" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Commanditaire</Th>
                <Th>Société</Th>
                <Th>Email</Th>
                <Th>Téléphone</Th>
                <Th>Statut</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <Tr key={c.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold">
                        {initiales(c.nom, c.prenom)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-[12.5px]">{c.nom} {c.prenom}</p>
                        <p className="text-[10.5px] font-mono text-slate-400">{c.id?.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-[12.5px] text-slate-700">{c.societe || '—'}</span></Td>
                  <Td><span className="text-[12.5px] text-slate-700">{c.email || '—'}</span></Td>
                  <Td><span className="text-[12px] font-mono text-slate-500">{c.telephone || '—'}</span></Td>
                  <Td>
                    <Badge color={STATUT_COLOR[c.statut] || 'gray'}>
                      {STATUT_LABEL[c.statut] || c.statut}
                    </Badge>
                  </Td>
                  <Td>
                    {actionId === c.id ? (
                      <Loader2 size={15} className="animate-spin text-violet-500" />
                    ) : confirmId === c.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-rose-600 font-semibold">Confirmer ?</span>
                        <ActionBtn variant="red" onClick={() => handleSuspendre(c.id)}>Oui</ActionBtn>
                        <ActionBtn onClick={() => setConfirmId(null)}>Non</ActionBtn>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        {(c.statut === 'EN_ATTENTE' || c.statut === 'SUSPENDU') && (
                          <ActionBtn variant="green" onClick={() => handleActiver(c.id)}>
                            <ShieldCheck size={12} /> Activer
                          </ActionBtn>
                        )}
                        {c.statut === 'ACTIF' && (
                          <ActionBtn variant="red" onClick={() => setConfirmId(c.id)}>
                            <ShieldOff size={12} /> Suspendre
                          </ActionBtn>
                        )}
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
