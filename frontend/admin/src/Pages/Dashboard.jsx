import { useEffect, useRef, useState } from 'react'
import { TrendingUp, Users, Package, ClipboardList, Wallet, Clock, AlertTriangle } from 'lucide-react'
import { StatCard, AreaChart, ProgressBar, Spinner } from '../components/ui'
import { getAdminStats, getAdminOpportunites } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import { useAuth } from '../context/AuthContext'

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR')
}

export default function Dashboard() {
  const { token } = useAuth()
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
  useSSE('admin/events/global', {
    KYC_SOUMIS: refetchStats,
    RETRAIT_DEMANDE: refetchStats,
    OPPORTUNITE_PRESQUE_COMPLETE: ({ id, titre, participantsActuels, seuilMaximal }) => {
      setPresqueCompletes(prev => prev.some(o => o.id === id)
        ? prev
        : [...prev, { id, titre, participantsActuels, seuilMaximal }])
    },
  }, token)

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
      icon: Wallet, label: 'Wallet plateforme',
      value: `${fmt(stats?.soldePlateforme)} F`, sub: 'solde disponible',
      accentColor: '#334155',
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
    <div className="space-y-4">

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(k => <StatCard key={k.label} {...k} />)}
      </div>

      {/* ── Chart + Opportunités récentes ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4">
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
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
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
        </div>
      </div>

      {/* ── Répartition statuts ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ratios.map(({ label, value, total, color }) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0
          return (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-slate-500 leading-tight">{label}</p>
                <span className="text-[10px] font-black text-slate-400 tabular-nums ml-2 flex-shrink-0">{pct}%</span>
              </div>
              <p className="text-[19px] font-black text-slate-900 tabular-nums mb-2">{fmt(value)}</p>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">sur {fmt(total)}</p>
            </div>
          )
        })}
      </div>

    </div>
  )
}
