import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Users, Package, ClipboardList, Wallet, Clock, AlertTriangle, ArrowUpRight, Sparkles } from 'lucide-react'
import { StatCard, AreaChart, ProgressBar, Spinner } from '../components/ui'
import { getAdminStats, getAdminOpportunites } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import { usePusher } from '../context/PusherContext'

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR')
}

export default function Dashboard() {
  const { on, off } = usePusher()
  const [stats, setStats] = useState(null)
  const [opportunites, setOpportunites] = useState([])
  const [loading, setLoading] = useState(true)
  const [presqueCompletes, setPresqueCompletes] = useState([])
  const refetchTimer = useRef(null)

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminOpportunites()])
      .then(([s, opps]) => { setStats(s); setOpportunites(opps) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Les agrégats (moyennes, soldes...) sont recalculés côté serveur — on les
  // rafraîchit (avec un léger debounce) plutôt que de les recalculer en JS.
  const refetchStats = () => {
    clearTimeout(refetchTimer.current)
    refetchTimer.current = setTimeout(() => {
      getAdminStats().then(setStats).catch(() => {})
    }, 500)
  }

  useSSE('events/opportunites', {
    COMPTEUR: ({ id, participantsActuels, prixActuel }) => {
      setOpportunites(prev => prev.map(op => op.id === id ? { ...op, participantsActuels, prixActuel } : op))
      refetchStats()
    },
    STATUT: ({ id, statut }) => {
      setOpportunites(prev => prev.map(op => op.id === id ? { ...op, statut } : op))
      refetchStats()
    },
  })
  useSSE('events/sondages', { COMPTEUR: refetchStats, STATUT: refetchStats })

  useEffect(() => {
    const onPresqueComplete = ({ id, titre, participantsActuels, seuilMaximal }) => {
      setPresqueCompletes(prev => prev.some(o => o.id === id)
        ? prev
        : [...prev, { id, titre, participantsActuels, seuilMaximal }])
    }
    on('KYC_SOUMIS', refetchStats)
    on('RETRAIT_DEMANDE', refetchStats)
    on('OPPORTUNITE_PRESQUE_COMPLETE', onPresqueComplete)
    return () => {
      off('KYC_SOUMIS', refetchStats)
      off('RETRAIT_DEMANDE', refetchStats)
      off('OPPORTUNITE_PRESQUE_COMPLETE', onPresqueComplete)
    }
  }, [])

  if (loading) return <Spinner />

  const recentOpps = [...opportunites]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const chartData = stats?.inscriptionsMensuelles?.map(p => ({
    mois: p.mois,
    Inscrits: p.inscrits,
  })) ?? []

  const kpis = [
    {
      icon: Package, label: 'Opportunités',
      value: fmt(stats?.totalOpportunites), sub: `${fmt(stats?.opportunitesActives)} actives`,
      accentColor: '#6D28D9',
    },
    {
      icon: ClipboardList, label: 'Sondages',
      value: fmt(stats?.totalSondages), sub: `${fmt(stats?.sondagesActifs)} actifs`,
      accentColor: '#4F46E5',
    },
    {
      icon: Users, label: 'Utilisateurs',
      value: fmt(stats?.totalUtilisateurs), sub: `${fmt(stats?.utilisateursActifs)} actifs`,
      accentColor: '#059669',
    },
    {
      icon: TrendingUp, label: 'Taux remplissage',
      value: `${stats?.tauxRemplissageMoyen ?? 0}%`, sub: 'moyenne des opportunités',
      accentColor: '#0284C7',
    },
    {
      icon: Clock, label: 'Retraits en attente',
      value: fmt(stats?.retraitsEnAttente), sub: 'à approuver',
      accentColor: '#D97706',
      alert: stats?.retraitsEnAttente > 0 ? stats.retraitsEnAttente : 0,
    },
    {
      icon: AlertTriangle, label: 'Bientôt complètes',
      value: fmt(presqueCompletes.length),
      sub: presqueCompletes.length > 0
        ? presqueCompletes.map(o => o.titre).slice(0, 2).join(', ') + (presqueCompletes.length > 2 ? '…' : '')
        : 'Aucune pour le moment',
      accentColor: '#DC2626',
      alert: presqueCompletes.length > 0 ? presqueCompletes.length : 0,
    },
  ]

  const ratios = [
    { label: 'Opportunités actives',   value: stats?.opportunitesActives ?? 0,  total: stats?.totalOpportunites ?? 1,  color: '#6D28D9' },
    { label: 'Opportunités clôturées', value: stats?.opportunitesCloturees ?? 0, total: stats?.totalOpportunites ?? 1,  color: '#059669' },
    { label: 'Sondages actifs',        value: stats?.sondagesActifs ?? 0,        total: stats?.totalSondages ?? 1,      color: '#4F46E5' },
    { label: 'Utilisateurs actifs',    value: stats?.utilisateursActifs ?? 0,    total: stats?.totalUtilisateurs ?? 1,  color: '#0284C7' },
  ]

  return (
    <div className="space-y-3.5">

      {/* ── KPI cards ── */}
      <div className="grid gap-3 xl:grid-cols-12">
        <section className="relative min-h-48 overflow-hidden rounded-2xl bg-violet-600 p-4 text-white sm:p-5 xl:col-span-4">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-[38px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-10 h-52 w-52 rounded-full border-[32px] border-emerald-300/25" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Wallet size={18} />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300 px-2.5 py-1 text-[10px] font-black text-slate-950">
                <Sparkles size={11} /> Temps réel
              </span>
            </div>
            <p className="mt-5 text-[11px] font-semibold text-violet-100">Solde disponible de la plateforme</p>
            <p className="mt-1.5 text-2xl font-black tracking-tight tabular-nums sm:text-3xl">{fmt(stats?.soldePlateforme)} <span className="text-xs font-semibold text-violet-100">FCFA</span></p>
            <Link
              to="/portefeuilles"
              aria-label="Ouvrir la trésorerie OpportuniHub"
              className="group mt-auto flex items-center justify-between border-t border-white/15 pt-3 text-[10px] outline-none"
            >
              <span className="font-semibold text-violet-100 transition-colors group-hover:text-white">
                Trésorerie OpportuniHub
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-violet-700 shadow-sm transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-visible:ring-2 group-focus-visible:ring-emerald-300 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-violet-600">
                <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:col-span-8">
          {kpis.map(k => <StatCard key={k.label} {...k} />)}
        </div>
      </div>

      {/* ── Chart + Opportunités récentes ── */}
      <div className="grid gap-3 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft lg:col-span-3">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[13px] font-bold text-slate-900">Inscriptions</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Nouveaux membres — 6 derniers mois</p>
            </div>
          </div>
          <AreaChart
            data={chartData}
            index="mois"
            categories={['Inscrits']}
            colors={['violet']}
            showGridLines={false}
            valueFormatter={v => `${v}`}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft lg:col-span-2">
          <p className="text-[13px] font-bold text-slate-900 mb-0.5">Opportunités récentes</p>
          <p className="text-[11px] text-slate-400 mb-4">{opportunites.length} au total</p>
          {recentOpps.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Aucune opportunité</p>
          ) : (
            <div className="space-y-4">
              {recentOpps.map(op => {
                const pct = op.seuilMinimum > 0
                  ? Math.min(100, Math.round((op.participantsActuels / op.seuilMinimum) * 100))
                  : 0
                return (
                  <div key={op.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[12px] font-semibold text-slate-800 truncate max-w-[75%]">{op.titre}</p>
                      <span className="text-[10.5px] font-black text-slate-400 tabular-nums">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color="indigo" />
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {op.participantsActuels} / {op.seuilMinimum} participants
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Répartition statuts ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ratios.map(({ label, value, total, color }) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0
          return (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-slate-500 leading-tight">{label}</p>
                <span className="text-[10px] font-black text-slate-400 tabular-nums ml-2 flex-shrink-0">{pct}%</span>
              </div>
              <p className="text-[19px] font-black text-slate-900 tabular-nums mb-2">{fmt(value)}</p>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">sur {fmt(total)}</p>
            </article>
          )
        })}
      </div>

    </div>
  )
}
