import { useEffect, useState } from 'react'
import { Activity, RefreshCw, Search } from 'lucide-react'
import { getAuditLogs, getAuditStats } from '../services/api'

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '-'
}

export default function JournalActivite() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [logsResponse, statsResponse] = await Promise.all([getAuditLogs({ search: search || undefined }), getAuditStats()])
      setLogs(logsResponse?.content || [])
      setStats(statsResponse || null)
    } catch {
      setError('Impossible de charger le journal d’activité')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Sécurité</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Journal d’activité</h1>
          <p className="mt-1 text-sm text-slate-500">Traçabilité des actions administratives.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-violet-300">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {stats && <div className="grid gap-3 sm:grid-cols-4">
        {[['Total', stats.total], ['Dernières 24 h', stats.last24Hours], ['Échecs', stats.failures], ['Écritures', stats.writeActions]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value ?? 0}</p>
          </div>
        ))}
      </div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <form onSubmit={(event) => { event.preventDefault(); load() }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une action, une route ou un identifiant" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400" />
          </div>
          <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Rechercher</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {error && <p className="p-5 text-sm text-rose-600">{error}</p>}
        {!error && loading && <p className="p-5 text-sm text-slate-500">Chargement...</p>}
        {!error && !loading && logs.length === 0 && <div className="flex flex-col items-center gap-2 p-10 text-center text-slate-500"><Activity className="h-8 w-8 text-slate-300" /><p className="text-sm">Aucune activité enregistrée.</p></div>}
        {!error && !loading && logs.length > 0 && <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Statut</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map(log => <tr key={log.id}><td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(log.occurredAt)}</td><td className="px-4 py-3 font-semibold text-slate-900">{log.action}</td><td className="px-4 py-3 text-slate-600">{log.module}</td><td className="px-4 py-3 text-slate-600">{log.path}</td><td className="px-4 py-3"><span className={log.success ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{log.statusCode}</span></td></tr>)}</tbody></table></div>}
      </div>
    </section>
  )
}
