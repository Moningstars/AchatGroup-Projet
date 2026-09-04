import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, ExternalLink, Loader2, Plus, ShieldCheck, ShieldOff } from 'lucide-react'
import { ActionBtn, Badge, Card, EmptyState, FilterPill, Pagination, SearchInput, Spinner, Table, Td, Th, Tr } from '../components/ui'
import { activerFournisseur, creerFournisseur, getAdminFournisseurs, suspendreFournisseur } from '../services/api'

const STATUT_COLOR = { ACTIF: 'emerald', SUSPENDU: 'rose', EN_ATTENTE: 'amber' }
const STATUT_LABEL = { ACTIF: 'Actif', SUSPENDU: 'Suspendu', EN_ATTENTE: 'En attente' }
const FILTERS = ['TOUS', 'ACTIF', 'EN_ATTENTE', 'SUSPENDU']
const FILTER_LABELS = ['Tous', 'Actifs', 'En attente', 'Suspendus']
const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400'
const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500'

function NouveauFournisseur({ onClose, onSaved }) {
  const [form, setForm] = useState({ nom: '', societe: '', email: '', telephone: '', logoUrl: '', reseauxUrl: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const submit = async event => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await creerFournisseur(form)
      onSaved()
    } catch (err) {
      setError(err.response?.status === 409
        ? 'Un fournisseur avec cet email existe déjà.'
        : err.response?.data?.message || 'Impossible de créer le fournisseur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Nouveau fournisseur</h2>
            <p className="mt-0.5 text-xs text-slate-400">Entreprise ou professionnel qui fournit les produits des opportunités.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={14} /> Retour</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Nom du contact *</label><input required value={form.nom} onChange={e => set('nom', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Entreprise</label><input value={form.societe} onChange={e => set('societe', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Email *</label><input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Téléphone *</label><input required value={form.telephone} onChange={e => set('telephone', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Logo (URL)</label><input type="url" value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Site ou réseau social</label><input type="url" value={form.reseauxUrl} onChange={e => set('reseauxUrl', e.target.value)} className={inputCls} /></div>
          </div>
          {error && <p className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Annuler</button>
            <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />} Enregistrer le fournisseur
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Fournisseurs() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterIdx, setFilterIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    getAdminFournisseurs().then(setItems).catch(() => setItems([])).finally(() => setLoading(false))
  }
  useEffect(() => {
    let cancelled = false
    getAdminFournisseurs()
      .then(data => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => items.filter(item => {
    const statusOk = FILTERS[filterIdx] === 'TOUS' || item.statut === FILTERS[filterIdx]
    const query = search.trim().toLowerCase()
    const searchOk = !query || [item.nom, item.societe, item.email, item.telephone].some(value => value?.toLowerCase().includes(query))
    return statusOk && searchOk
  }), [items, filterIdx, search])
  useEffect(() => setPage(1), [filterIdx, search])
  const pageItems = filtered.slice((page - 1) * 10, page * 10)

  const updateStatus = async (item, activate) => {
    setActionId(item.id)
    try {
      await (activate ? activerFournisseur(item.id) : suspendreFournisseur(item.id))
      load()
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold text-slate-900">Fournisseurs de produits</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Réservés aux opportunités d’achat groupé — distincts des commanditaires de sondages.</p>
          </div>
          <button onClick={() => navigate('/fournisseurs/nouveau')} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white sm:w-auto"><Plus size={15} /> Nouveau fournisseur</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Nom, entreprise, email, téléphone…" />
          <div className="flex flex-wrap gap-1.5">{FILTER_LABELS.map((label, index) => <FilterPill key={label} label={label} active={filterIdx === index} onClick={() => setFilterIdx(index)} />)}</div>
        </div>
      </Card>
      <Card noPad>
        {loading ? <Spinner py="py-12" /> : filtered.length === 0 ? <EmptyState icon={Building2} title="Aucun fournisseur trouvé" /> : (
          <><Table>
            <thead><tr><Th>Fournisseur</Th><Th>Contact</Th><Th>Présence publique</Th><Th>Statut</Th><Th>Actions</Th></tr></thead>
            <tbody>{pageItems.map(item => (
              <Tr key={item.id}>
                <Td><div className="flex items-center gap-2.5">{item.logoUrl ? <img src={item.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain ring-1 ring-slate-200" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 font-black text-violet-700">{(item.societe || item.nom)?.[0]?.toUpperCase()}</span>}<div><p className="font-semibold text-slate-900">{item.societe || item.nom}</p>{item.societe && <p className="text-[11px] text-slate-400">Contact : {item.nom}</p>}</div></div></Td>
                <Td><p className="text-xs text-slate-700">{item.telephone}</p><p className="text-[11px] text-slate-400">{item.email}</p></Td>
                <Td>{item.reseauxUrl ? <a href={item.reseauxUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700">Voir le lien <ExternalLink size={12} /></a> : <span className="text-xs text-slate-400">Non renseignée</span>}</Td>
                <Td><Badge color={STATUT_COLOR[item.statut] || 'gray'}>{STATUT_LABEL[item.statut] || item.statut}</Badge></Td>
                <Td>{actionId === item.id ? <Loader2 size={15} className="animate-spin text-violet-500" /> : item.statut === 'ACTIF' ? <ActionBtn variant="red" onClick={() => updateStatus(item, false)}><ShieldOff size={12} /> Suspendre</ActionBtn> : <ActionBtn variant="green" onClick={() => updateStatus(item, true)}><ShieldCheck size={12} /> Activer</ActionBtn>}</Td>
              </Tr>
            ))}</tbody>
          </Table><Pagination page={page} totalItems={filtered.length} onPageChange={setPage} /></>
        )}
      </Card>
    </div>
  )
}

export function NouveauFournisseurPage() {
  const navigate = useNavigate()
  return <NouveauFournisseur onClose={() => navigate('/fournisseurs')} onSaved={() => navigate('/fournisseurs')} />
}
