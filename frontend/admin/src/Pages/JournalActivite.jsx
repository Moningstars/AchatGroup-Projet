import { Fragment, useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock3, FileClock, RotateCcw, Search } from 'lucide-react'
import { getAuditLogs, getAuditStats } from '../services/api'
import { Badge, Card, EmptyState, Pagination, Spinner, Table, Td, Th, Tr } from '../components/ui'

const MODULES = [
  'AUTHENTIFICATION', 'OPPORTUNITES', 'SONDAGES', 'UTILISATEURS', 'FINANCES',
  'FOURNISSEURS', 'COMMANDITAIRES', 'BANNIERES', 'KYC', 'STATISTIQUES',
]

const ACTIONS = [
  'CONSULTATION', 'CREATION', 'MODIFICATION', 'SUPPRESSION', 'CONNEXION', 'DECONNEXION',
  'SOUSCRIPTION', 'APPROBATION', 'REJET', 'REMBOURSEMENT', 'CLOTURE', 'ACTIVATION',
  'SUSPENSION', 'DISTRIBUTION', 'GESTION_IMAGE',
]

const MODULE_LABELS = {
  AUTHENTIFICATION: 'Authentification', OPPORTUNITES: 'Miitchs', SONDAGES: 'Miitchs i',
  UTILISATEURS: 'Utilisateurs', FINANCES: 'Finances', FOURNISSEURS: 'Fournisseurs',
  COMMANDITAIRES: 'Commanditaires', BANNIERES: 'Bannières', KYC: 'KYC', STATISTIQUES: 'Statistiques',
}

const ACTION_LABELS = {
  CONSULTATION: 'Consultation', CREATION: 'Création', MODIFICATION: 'Modification', SUPPRESSION: 'Suppression',
  CONNEXION: 'Connexion', DECONNEXION: 'Déconnexion', SOUSCRIPTION: 'Souscription', APPROBATION: 'Approbation',
  REJET: 'Rejet', REMBOURSEMENT: 'Remboursement', CLOTURE: 'Clôture', ACTIVATION: 'Activation',
  SUSPENSION: 'Suspension', DISTRIBUTION: 'Distribution', GESTION_IMAGE: 'Gestion d’image',
}

const EMPTY_FILTERS = { search: '', module: '', action: '', result: '', from: '', to: '' }

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium', timeStyle: 'medium',
  }).format(new Date(value))
}

function shortId(value) {
  if (!value || value === 'ANONYME') return 'Anonyme'
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function Stat({ icon: Icon, label, value, tone = 'violet' }) {
  const tones = {
    violet: 'bg-violet-50 text-violet-700', emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700', sky: 'bg-sky-50 text-sky-700',
  }
  return (
    <Card className="flex min-h-24 items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={18} /></span>
      <div><p className="text-xl font-black tabular-nums text-slate-950">{Number(value || 0).toLocaleString('fr-FR')}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p></div>
    </Card>
  )
}

export default function JournalActivite() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ content: [], totalElements: 0 })
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: page - 1, size: 10 }
      if (filters.search.trim()) params.search = filters.search.trim()
      if (filters.module) params.module = filters.module
      if (filters.action) params.action = filters.action
      if (filters.result) params.success = filters.result === 'success'
      if (filters.from) params.from = new Date(`${filters.from}T00:00:00`).toISOString()
      if (filters.to) params.to = new Date(`${filters.to}T23:59:59.999`).toISOString()
      const [logs, summary] = await Promise.all([getAuditLogs(params), getAuditStats()])
      setData(logs)
      setStats(summary)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de charger le journal d’activité.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  // Le chargement distant est précisément la synchronisation assurée par cet effet.
  useEffect(() => { load() }, [load])

  const setFilter = (name, value) => {
    setFilters(current => ({ ...current, [name]: value }))
    setPage(1)
  }

  const reset = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Journal d’activité</h2>
            <p className="mt-1 text-xs text-slate-500">Retrouvez les actions effectuées par les administrateurs et les participants, sans contenu sensible.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={14} /> Traçabilité active</div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={FileClock} label="Événements" value={stats.total} />
        <Stat icon={Clock3} label="Dernières 24 h" value={stats.last24Hours} tone="sky" />
        <Stat icon={Activity} label="Actions d’écriture" value={stats.writeActions} tone="emerald" />
        <Stat icon={AlertTriangle} label="Échecs" value={stats.failures} tone="rose" />
      </div>

      <Card className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.6fr)_1fr_1fr_0.8fr]">
          <label className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={filters.search} onChange={event => setFilter('search', event.target.value)} placeholder="Acteur, ressource, identifiant…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" />
          </label>
          <select value={filters.module} onChange={event => setFilter('module', event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-violet-400">
            <option value="">Tous les modules</option>{MODULES.map(module => <option key={module} value={module}>{MODULE_LABELS[module]}</option>)}
          </select>
          <select value={filters.action} onChange={event => setFilter('action', event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-violet-400">
            <option value="">Toutes les actions</option>{ACTIONS.map(action => <option key={action} value={action}>{ACTION_LABELS[action]}</option>)}
          </select>
          <select value={filters.result} onChange={event => setFilter('result', event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-violet-400">
            <option value="">Tous les résultats</option><option value="success">Réussies</option><option value="failure">Échouées</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Du<input type="date" value={filters.from} onChange={event => setFilter('from', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-violet-400" /></label>
          <label className="flex-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Au<input type="date" value={filters.to} onChange={event => setFilter('to', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-violet-400" /></label>
          <button type="button" onClick={reset} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-violet-700"><RotateCcw size={13} /> Réinitialiser</button>
        </div>
      </Card>

      <Card noPad>
        {loading ? <Spinner /> : error ? (
          <div className="px-4 py-12 text-center"><p className="text-sm font-bold text-rose-600">{error}</p><button onClick={load} className="mt-3 text-xs font-bold text-violet-700">Réessayer</button></div>
        ) : data.content.length === 0 ? (
          <EmptyState icon={FileClock} title="Aucune activité trouvée" sub="Modifiez les filtres ou effectuez une action dans l’application." />
        ) : (
          <>
            <Table>
              <thead><tr><Th>Date</Th><Th>Acteur</Th><Th>Action</Th><Th>Module</Th><Th>Résultat</Th><Th>Durée</Th><Th className="w-12">Détail</Th></tr></thead>
              <tbody>{data.content.map(log => (
                <Fragment key={log.id}>
                  <Tr>
                    <Td><span className="whitespace-nowrap font-semibold text-slate-700">{formatDateTime(log.occurredAt)}</span></Td>
                    <Td><p className="font-bold text-slate-900" title={log.actorId}>{shortId(log.actorId)}</p><p className="mt-0.5 text-[10px] text-slate-400">{log.actorType}</p></Td>
                    <Td><p className="font-bold text-slate-800">{ACTION_LABELS[log.action] || log.action}</p><p className="mt-0.5 max-w-56 truncate text-[10px] text-slate-400">{log.description}</p></Td>
                    <Td><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{MODULE_LABELS[log.module] || log.module}</span></Td>
                    <Td><Badge color={log.success ? 'emerald' : 'rose'}>{log.success ? 'Réussie' : `Échec ${log.statusCode}`}</Badge></Td>
                    <Td><span className="tabular-nums text-slate-500">{log.durationMs} ms</span></Td>
                    <Td><button type="button" onClick={() => setExpanded(current => current === log.id ? null : log.id)} aria-label="Afficher le détail" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-violet-700">{expanded === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></Td>
                  </Tr>
                  {expanded === log.id && <tr key={`${log.id}-detail`}><td colSpan="7" className="border-b border-slate-100 bg-slate-50 px-4 py-3"><div className="grid gap-3 text-[11px] sm:grid-cols-2 lg:grid-cols-4"><div><p className="font-black uppercase tracking-wider text-slate-400">Route</p><p className="mt-1 break-all font-semibold text-slate-700">{log.httpMethod} {log.path}</p></div><div><p className="font-black uppercase tracking-wider text-slate-400">Ressource</p><p className="mt-1 break-all font-semibold text-slate-700">{log.resourceId || 'Non applicable'}</p></div><div><p className="font-black uppercase tracking-wider text-slate-400">Adresse IP</p><p className="mt-1 font-semibold text-slate-700">{log.ipAddress || 'Non disponible'}</p></div><div><p className="font-black uppercase tracking-wider text-slate-400">Corrélation</p><p className="mt-1 break-all font-semibold text-slate-700">{log.correlationId}</p></div><div className="sm:col-span-2 lg:col-span-4"><p className="font-black uppercase tracking-wider text-slate-400">Navigateur / appareil</p><p className="mt-1 break-all text-slate-600">{log.userAgent || 'Non disponible'}</p></div></div></td></tr>}
                </Fragment>
              ))}</tbody>
            </Table>
            <Pagination page={page} totalItems={data.totalElements || 0} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
