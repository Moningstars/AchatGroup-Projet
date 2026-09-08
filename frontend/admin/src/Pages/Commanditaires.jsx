import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Building2, CircleDollarSign, Clock3, Eye, Loader2, Pencil,
  Plus, Search, ShieldCheck, ShieldOff, Users, WalletCards, X,
} from 'lucide-react'
import { Badge, Card, Table, Th, Td, Tr, Spinner, ActionBtn, Pagination } from '../components/ui'
import {
  getAdminCommanditaires, getAdminCommanditaire, creerCommanditaire, modifierCommanditaire,
  activerCommanditaire, suspendreCommanditaire, alimenterCommanditaire, getMouvementsCommanditaire,
} from '../services/api'

const STATUT_COLOR = { ACTIF: 'emerald', SUSPENDU: 'rose', EN_ATTENTE: 'amber' }
const STATUT_LABEL = { ACTIF: 'Actif', SUSPENDU: 'Suspendu', EN_ATTENTE: 'En attente' }
const inputCls = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
const labelCls = 'mb-1.5 block text-[10px] font-black uppercase tracking-[.12em] text-slate-500'
const fmt = value => Number(value || 0).toLocaleString('fr-FR')
const formatDate = value => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const errorMessage = error => error?.response?.data?.message || Object.values(error?.response?.data?.erreurs || {})[0] || 'Une erreur est survenue.'

function initiales(c) {
  return ((c?.nom?.[0] || '') + (c?.prenom?.[0] || '')).toUpperCase() || '?'
}

function IdentityForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial || { nom: '', prenom: '', societe: '', email: '', telephone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const submit = async event => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try { await onSubmit(form) } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <label><span className={labelCls}>Nom *</span><input className={inputCls} required value={form.nom} onChange={e => set('nom', e.target.value)} /></label>
      <label><span className={labelCls}>Prénom *</span><input className={inputCls} required value={form.prenom} onChange={e => set('prenom', e.target.value)} /></label>
    </div>
    <label><span className={labelCls}>Société *</span><input className={inputCls} required value={form.societe} onChange={e => set('societe', e.target.value)} /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label><span className={labelCls}>Email *</span><input className={inputCls} type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></label>
      <label><span className={labelCls}>Téléphone international *</span><input className={inputCls} required placeholder="+228 90 00 00 00" value={form.telephone} onChange={e => set('telephone', e.target.value)} /></label>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {loading && <Loader2 size={15} className="animate-spin" />}{submitLabel}
      </button>
      {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Annuler</button>}
    </div>
  </form>
}

export default function Commanditaires() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('TOUS')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true); setError('')
    getAdminCommanditaires().then(setItems).catch(e => setError(errorMessage(e))).finally(() => setLoading(false))
  }
  useEffect(load, [])
  useEffect(() => setPage(1), [filter, search])

  const filtered = useMemo(() => items.filter(c => filter === 'TOUS' || c.statut === filter).filter(c => {
    const q = search.trim().toLowerCase()
    return !q || [c.nom, c.prenom, c.societe, c.email, c.telephone].some(value => value?.toLowerCase().includes(q))
  }), [items, filter, search])
  const pageItems = filtered.slice((page - 1) * 10, page * 10)
  const count = key => key === 'TOUS' ? items.length : items.filter(c => c.statut === key).length
  const cards = [
    ['TOUS', 'Tous', 'Partenaires enregistrés', Users, 'violet'],
    ['ACTIF', 'Actifs', 'Autorisés à financer', ShieldCheck, 'emerald'],
    ['EN_ATTENTE', 'À examiner', 'Validation requise', Clock3, 'amber'],
    ['SUSPENDU', 'Suspendus', 'Financement bloqué', ShieldOff, 'rose'],
  ]
  const tones = {
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  }

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Building2 /></span>
            <div><h2 className="text-lg font-extrabold">Commanditaires des Miitchs i</h2><p className="mt-1 text-xs text-slate-300">Identité, validation, budgets engagés et historique financier.</p></div>
          </div>
          <button onClick={() => navigate('/commanditaires/nouveau')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-slate-950"><Plus size={16} /> Nouveau commanditaire</button>
        </div>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([key, label, helper, Icon, tone]) => <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key}
          className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${filter === key ? tones[tone] + ' ring-2 ring-current/10' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
          <Icon size={18} /><span className="min-w-0 flex-1"><span className="flex justify-between gap-2 text-xs font-extrabold"><span>{label}</span><strong className="text-xl text-slate-950">{count(key)}</strong></span><span className="block truncate text-[10px] text-slate-400">{helper}</span></span>
        </button>)}
      </div>
      <div className="border-t border-slate-100 p-4">
        <label className="relative block max-w-2xl"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className={inputCls + ' pl-10'} value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un partenaire, une société, un email…" /></label>
        <p className="mt-2 text-[11px] font-semibold text-slate-400">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
      </div>
    </section>

    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error} <button onClick={load} className="font-black underline">Réessayer</button></p>}
    <Card noPad>
      {loading ? <Spinner py="py-16" /> : filtered.length === 0 ? <div className="p-14 text-center"><Building2 className="mx-auto text-slate-300" size={34} /><h3 className="mt-4 font-extrabold">Aucun commanditaire trouvé</h3></div> : <>
        <Table><thead><tr><Th>Commanditaire</Th><Th>Statut</Th><Th>Financement</Th><Th>Miitchs i</Th><Th>Contact</Th><Th>Action</Th></tr></thead>
          <tbody>{pageItems.map(c => <Tr key={c.id}>
            <Td><button onClick={() => navigate(`/commanditaires/${c.id}`)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-xs font-black text-violet-700">{initiales(c)}</span><span><strong className="block text-[12.5px] text-slate-900">{c.nom} {c.prenom}</strong><span className="text-[11px] text-slate-500">{c.societe}</span></span></button></Td>
            <Td><Badge color={STATUT_COLOR[c.statut]}>{STATUT_LABEL[c.statut]}</Badge></Td>
            <Td><strong className="block text-xs text-slate-900">{fmt(c.soldeDisponible)} FCFA</strong><span className="text-[10px] text-slate-400">{fmt(c.soldeReserve)} réservé</span></Td>
            <Td><strong className="text-xs">{c.nombreSondages || 0}</strong><span className="ml-1 text-[10px] text-slate-400">dont {c.sondagesActifs || 0} actif(s)</span></Td>
            <Td><span className="block text-[11px] text-slate-700">{c.email}</span><span className="text-[10px] text-slate-400">{c.telephone}</span></Td>
            <Td><ActionBtn variant="violet" onClick={() => navigate(`/commanditaires/${c.id}`)}><Eye size={13} /> Ouvrir</ActionBtn></Td>
          </Tr>)}</tbody>
        </Table><Pagination page={page} totalItems={filtered.length} onPageChange={setPage} /></>}
    </Card>
  </div>
}

export function NouveauCommanditairePage() {
  const navigate = useNavigate()
  return <div className="mx-auto max-w-3xl"><Card><div className="mb-5 flex items-center gap-3"><button onClick={() => navigate('/commanditaires')} className="rounded-xl border p-2"><ArrowLeft size={18} /></button><div><p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Nouveau partenaire</p><h2 className="text-xl font-extrabold">Créer un commanditaire</h2></div></div>
    <IdentityForm submitLabel="Créer le commanditaire" onCancel={() => navigate('/commanditaires')} onSubmit={async form => { const created = await creerCommanditaire(form); navigate(`/commanditaires/${created.id}`) }} />
  </Card></div>
}

export function CommanditaireDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [edit, setEdit] = useState(false)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [reason, setReason] = useState('')
  const [action, setAction] = useState(null)

  const load = () => {
    setLoading(true); setError('')
    Promise.all([getAdminCommanditaire(id), getMouvementsCommanditaire(id)])
      .then(([data, entries]) => { setItem(data); setMovements(entries) })
      .catch(e => setError(errorMessage(e))).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  const changeStatus = async () => {
    if (!reason.trim()) { setError('Indiquez le motif de la décision.'); return }
    setAction('status'); setError('')
    try {
      if (item.statut === 'ACTIF') await suspendreCommanditaire(id, reason)
      else await activerCommanditaire(id, reason)
      setReason(''); await Promise.all([getAdminCommanditaire(id).then(setItem), getMouvementsCommanditaire(id).then(setMovements)])
    } catch (e) { setError(errorMessage(e)) } finally { setAction(null) }
  }
  const fund = async event => {
    event.preventDefault(); setAction('fund'); setError('')
    try {
      await alimenterCommanditaire(id, { montant: Number(amount), reference: reference || undefined, description: 'Alimentation depuis l’administration' })
      setAmount(''); setReference(''); setAction(null); load()
    } catch (e) { setError(errorMessage(e)); setAction(null) }
  }

  if (loading) return <Spinner py="py-24" />
  if (!item) return <div className="rounded-2xl bg-white p-8 text-center text-rose-700">{error || 'Commanditaire introuvable'}</div>

  return <div className="space-y-4">
    <section className="rounded-3xl bg-gradient-to-r from-slate-950 to-violet-950 p-5 text-white shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><button onClick={() => navigate('/commanditaires')} className="rounded-xl bg-white/10 p-2.5"><ArrowLeft size={19} /></button><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-black text-violet-700">{initiales(item)}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{item.nom} {item.prenom}</h2><Badge color={STATUT_COLOR[item.statut]}>{STATUT_LABEL[item.statut]}</Badge></div><p className="mt-1 text-sm text-slate-300">{item.societe} · {item.email} · {item.telephone}</p></div></div>
        <button onClick={() => setEdit(!edit)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900">{edit ? <X size={16} /> : <Pencil size={16} />}{edit ? 'Fermer' : 'Modifier'}</button>
      </div>
    </section>

    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    {edit && <Card><h3 className="mb-4 font-extrabold">Coordonnées du partenaire</h3><IdentityForm initial={{ nom: item.nom, prenom: item.prenom, societe: item.societe, email: item.email, telephone: item.telephone }} submitLabel="Enregistrer" onCancel={() => setEdit(false)} onSubmit={async form => { const updated = await modifierCommanditaire(id, form); setItem(updated); setEdit(false) }} /></Card>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Disponible', fmt(item.soldeDisponible), WalletCards, 'text-emerald-700 bg-emerald-50'],
        ['Réservé', fmt(item.soldeReserve), CircleDollarSign, 'text-violet-700 bg-violet-50'],
        ['Total alimenté', fmt(item.totalAlimente), Plus, 'text-sky-700 bg-sky-50'],
        ['Total distribué', fmt(item.totalDistribue), Users, 'text-amber-700 bg-amber-50'],
      ].map(([label, value, Icon, tone]) => <Card key={label}><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><strong className="mt-2 block text-xl">{value} <span className="text-xs">FCFA</span></strong></div><span className={`rounded-xl p-3 ${tone}`}><Icon size={20} /></span></div></Card>)}
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
      <Card><h3 className="font-extrabold">Alimenter le budget</h3><p className="mt-1 text-xs text-slate-500">Cette somme pourra être réservée lors de l’activation d’un Miitch i sponsorisé.</p>
        <form onSubmit={fund} className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className={labelCls}>Montant FCFA</span><input className={inputCls} required min="1" type="number" value={amount} onChange={e => setAmount(e.target.value)} /></label><label><span className={labelCls}>Référence</span><input className={inputCls} value={reference} onChange={e => setReference(e.target.value)} placeholder="Virement, facture…" /></label><button disabled={action === 'fund'} className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">{action === 'fund' ? 'Traitement…' : 'Créditer le commanditaire'}</button></form>
      </Card>
      <Card><h3 className="font-extrabold">Décision administrative</h3><p className="mt-1 text-xs text-slate-500">{item.statut === 'ACTIF' ? 'La suspension est refusée tant qu’un Miitch i financé est actif.' : 'L’activation autorise ce partenaire à financer de nouveaux Miitchs i.'}</p>
        <label className="mt-4 block"><span className={labelCls}>Motif obligatoire</span><textarea className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400" value={reason} onChange={e => setReason(e.target.value)} placeholder="Justifiez la décision pour le journal d’audit…" /></label>
        <button onClick={changeStatus} disabled={action === 'status'} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ${item.statut === 'ACTIF' ? 'bg-rose-600' : 'bg-emerald-600'}`}>{item.statut === 'ACTIF' ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}{item.statut === 'ACTIF' ? 'Suspendre' : 'Activer'}</button>
        {item.motifStatut && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><strong className="text-slate-700">Dernier motif :</strong> {item.motifStatut}</p>}
      </Card>
    </div>

    <Card noPad><div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h3 className="font-extrabold">Historique financier</h3><p className="text-xs text-slate-400">50 derniers mouvements traçables</p></div><span className="text-xs font-bold text-slate-500">{item.nombreSondages || 0} Miitch{item.nombreSondages === 1 ? '' : 's'} i, {item.sondagesActifs || 0} actif(s)</span></div>
      {movements.length === 0 ? <div className="p-10 text-center text-sm text-slate-400">Aucun mouvement pour le moment.</div> : <Table><thead><tr><Th>Date</Th><Th>Opération</Th><Th>Montant</Th><Th>Solde disponible</Th><Th>Référence</Th></tr></thead><tbody>{movements.map(m => <Tr key={m.id}><Td>{formatDate(m.createdAt)}</Td><Td><Badge color={{ ALIMENTATION: 'emerald', RESERVATION: 'violet', DISTRIBUTION: 'amber', LIBERATION: 'sky' }[m.type]}>{m.type}</Badge></Td><Td><strong className={m.type === 'ALIMENTATION' || m.type === 'LIBERATION' ? 'text-emerald-700' : 'text-slate-900'}>{fmt(m.montant)} FCFA</strong></Td><Td>{fmt(m.soldeApres)} FCFA</Td><Td>{m.reference || '—'}</Td></Tr>)}</tbody></Table>}
    </Card>
  </div>
}
