import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, ShieldCheck, ShieldOff, Building2, Plus, Search,
  Users, Clock3, CircleOff, RotateCcw,
} from 'lucide-react'
import {
  Badge, Card, Table, Th, Td, Tr, Spinner, FilterPill, ActionBtn, Pagination,
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

// ── Formulaire dédié : nouveau commanditaire ─────────────────────────────────

function NouveauCommanditaireForm({ onClose, onSaved }) {
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
    <div className="mx-auto w-full max-w-3xl pb-8">
      <div className="w-full rounded-2xl bg-white shadow-sm border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Nouveau commanditaire</h3>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={14} /> Retour</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
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
  const navigate = useNavigate()
  const [commanditaires, setCommanditaires] = useState([])
  const [loading, setLoading]               = useState(true)
  const [filterIdx, setFilterIdx]           = useState(0)
  const [search, setSearch]                 = useState('')
  const [actionId, setActionId]             = useState(null)
  const [confirmId, setConfirmId]           = useState(null)
  const [page, setPage]                     = useState(1)

  const fetchData = () => {
    setLoading(true)
    getAdminCommanditaires()
      .then(setCommanditaires)
      .catch(() => setCommanditaires([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    getAdminCommanditaires()
      .then(data => { if (!cancelled) setCommanditaires(data) })
      .catch(() => { if (!cancelled) setCommanditaires([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleActiver = async (id) => {
    setActionId(id)
    try { await activerCommanditaire(id); fetchData() }
    catch { setActionId(null) }
    finally { setActionId(null) }
  }

  const handleSuspendre = async (id) => {
    setConfirmId(null)
    setActionId(id)
    try { await suspendreCommanditaire(id); fetchData() }
    catch { setActionId(null) }
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
  const hasFilters = filterIdx !== 0 || search.trim()
  useEffect(() => setPage(1), [filterIdx, search])
  const pageItems = filtered.slice((page - 1) * 10, page * 10)

  const statCards = [
    { key: 'TOUS', label: 'Tous', helper: 'Partenaires enregistrés', count: commanditaires.length, icon: Users, tone: 'violet' },
    { key: 'ACTIF', label: 'Actifs', helper: 'Peuvent sponsoriser', count: countByStatut('ACTIF'), icon: ShieldCheck, tone: 'emerald' },
    { key: 'EN_ATTENTE', label: 'En attente', helper: 'À examiner', count: countByStatut('EN_ATTENTE'), icon: Clock3, tone: 'amber' },
    { key: 'SUSPENDU', label: 'Suspendus', helper: 'Accès désactivé', count: countByStatut('SUSPENDU'), icon: CircleOff, tone: 'rose' },
  ]

  const toneClasses = {
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  }

  return (
    <div className="space-y-4">

      {/* ── En-tête et pilotage ── */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 px-5 py-5 text-white sm:px-6">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[28px] border-white/5" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <Building2 size={23} />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">Partenaires de vos sondages</h2>
                <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-slate-300">Enregistrez et gérez ici les commanditaires qui financent ou portent vos enquêtes.</p>
              </div>
            </div>
            <button onClick={() => navigate('/commanditaires/nouveau')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50 sm:w-auto">
              <Plus size={16} /> Ajouter un commanditaire
            </button>
          </div>
        </div>

        <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          {statCards.map(({ key, label, helper, count, icon: Icon, tone }, idx) => {
            const active = filterIdx === idx
            return (
              <button key={key} type="button" onClick={() => setFilterIdx(idx)} aria-pressed={active}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? `${toneClasses[tone]} shadow-sm ring-2 ring-current/10` : 'border-slate-100 bg-slate-50/70 hover:border-slate-200 hover:bg-white'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white/75' : toneClasses[tone]}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-700">{label}</span>
                    <strong className="text-xl leading-none text-slate-950">{count}</strong>
                  </span>
                  <span className="mt-1 block truncate text-[10px] font-medium text-slate-400">{helper}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block min-w-0 flex-1 lg:max-w-xl">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)}
                placeholder="Rechercher un nom, une société, un email…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" />
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTER_LABELS.map((label, idx) => (
                <FilterPill key={label} label={label} active={filterIdx === idx} onClick={() => setFilterIdx(idx)} />
              ))}
              {hasFilters && (
                <button type="button" onClick={() => { setFilterIdx(0); setSearch('') }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                  <RotateCcw size={13} /> Réinitialiser
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-[11px] font-medium text-slate-400">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </section>

      {/* ── Tableau ── */}
      <Card noPad>
        {loading ? (
          <Spinner py="py-12" />
        ) : filtered.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 ring-8 ring-violet-50/50">
              <Building2 size={26} />
            </span>
            <h3 className="mt-5 text-base font-extrabold text-slate-900">{hasFilters ? 'Aucun résultat pour ces critères' : 'Ajoutez votre premier commanditaire'}</h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">
              {hasFilters ? 'Modifiez votre recherche ou réinitialisez les filtres pour afficher les partenaires disponibles.' : 'Les commanditaires sont les entreprises ou personnes qui sponsorisent vos sondages.'}
            </p>
            <button type="button" onClick={hasFilters ? () => { setFilterIdx(0); setSearch('') } : () => navigate('/commanditaires/nouveau')}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-100 transition hover:bg-violet-800">
              {hasFilters ? <RotateCcw size={15} /> : <Plus size={15} />}
              {hasFilters ? 'Réinitialiser la recherche' : 'Créer un commanditaire'}
            </button>
          </div>
        ) : (
          <><Table>
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
              {pageItems.map(c => (
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
          </Table><Pagination page={page} totalItems={filtered.length} onPageChange={setPage} /></>
        )}
      </Card>
    </div>
  )
}

export function NouveauCommanditairePage() {
  const navigate = useNavigate()
  return <NouveauCommanditaireForm onClose={() => navigate('/commanditaires')} onSaved={() => navigate('/commanditaires')} />
}
