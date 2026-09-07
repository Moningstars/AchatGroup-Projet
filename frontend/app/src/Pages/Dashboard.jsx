import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Wallet, ShoppingBag, FileText, TrendingUp, Loader2, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getSolde, getTransactions, getOpportunites, getSondages } from '../services/api'

function formatMontant(n) { return Number(n || 0).toLocaleString('fr-FR') }
function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const TYPE_LABELS = {
  DEPOT: 'Recharge', RETRAIT: 'Retrait', GEL: 'Gel',
  DEBIT: 'Débit', REMBOURSEMENT: 'Remboursement', RECOMPENSE: 'Récompense',
}
const TYPE_SIGN = { DEPOT: '+', REMBOURSEMENT: '+', RECOMPENSE: '+', RETRAIT: '-', GEL: '-', DEBIT: '-' }
const TYPE_COLOR = {
  DEPOT: 'text-emerald-600', REMBOURSEMENT: 'text-sky-600', RECOMPENSE: 'text-violet-600',
  RETRAIT: 'text-rose-600', GEL: 'text-amber-600', DEBIT: 'text-rose-600',
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [solde, setSolde] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [opportunites, setOpportunites] = useState([])
  const [sondages, setSondages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return }
    Promise.all([
      getSolde().catch(() => null),
      getTransactions().catch(() => []),
      getOpportunites().catch(() => []),
      getSondages().catch(() => []),
    ]).then(([s, tx, ops, sonds]) => {
      setSolde(s); setTransactions(tx); setOpportunites(ops); setSondages(sonds)
    }).finally(() => setLoading(false))
  }, [isAuthenticated])

  const prenom = user?.nom?.split(' ')[0] || 'vous'
  const recentTx = transactions.slice(0, 4)
  const opsActives = opportunites.filter(o => o.statut === 'ACTIVE')
  const sondsActifs = sondages.filter(s => s.statut === 'ACTIF')

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Accroche */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-7 text-white shadow">
          <p className="text-sm font-semibold text-indigo-200 uppercase tracking-wide">Bonjour,</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold">{prenom} 👋</h1>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-white/60"><Loader2 size={16} className="animate-spin" /> Chargement...</div>
          ) : solde ? (
            <>
              <p className="mt-4 text-4xl font-extrabold">{formatMontant(solde.soldeDisponible)} <span className="text-lg text-indigo-200">FCFA</span></p>
              <p className="mt-1 text-sm text-indigo-200">Solde disponible · {formatMontant(solde.soldeGele)} FCFA gelés</p>
            </>
          ) : (
            <p className="mt-4 text-indigo-200 text-sm">Connectez-vous pour voir votre solde</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => navigate('/portefeuille')} className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition">
              <Wallet size={15} /> Mon portefeuille
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition">
              <ShoppingBag size={15} /> Voir les offres
            </button>
          </div>
        </div>

        {/* Métriques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Offres actives', value: loading ? '…' : opsActives.length, icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50', action: () => navigate('/') },
            { label: 'Sondages ouverts', value: loading ? '…' : sondsActifs.length, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50', action: () => navigate('/sondages') },
            { label: 'Points', value: loading || !solde ? '…' : formatMontant(solde.soldePoints), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', action: null },
            { label: 'Transactions', value: loading ? '…' : transactions.length, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100', action: () => navigate('/historique') },
          ].map((m) => (
            <button
              key={m.label}
              onClick={m.action || undefined}
              disabled={!m.action}
              className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-left transition ${m.action ? 'hover:border-indigo-200 hover:shadow cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                <m.icon size={17} className={m.color} />
              </div>
              <p className="text-xl font-extrabold text-slate-900">{m.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Transactions récentes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Transactions récentes</h2>
              <button onClick={() => navigate('/historique')} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                Tout voir <ArrowRight size={13} />
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-indigo-400" /></div>
            ) : recentTx.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Aucune transaction</p>
            ) : (
              <div className="space-y-3">
                {recentTx.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{TYPE_LABELS[t.type] || t.type}</p>
                      <p className="text-xs text-slate-400">{formatDate(t.createdAt)}</p>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${TYPE_COLOR[t.type] || 'text-slate-600'}`}>
                      {TYPE_SIGN[t.type] || ''}{formatMontant(t.montant)} FCFA
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opportunités actives */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Offres en cours</h2>
              <button onClick={() => navigate('/')} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                Tout voir <ArrowRight size={13} />
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-indigo-400" /></div>
            ) : opsActives.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Aucune offre active</p>
            ) : (
              <div className="space-y-3">
                {opsActives.slice(0, 4).map(op => (
                  <button key={op.id} onClick={() => navigate(`/opportunity/${op.id}`)} className="w-full flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl px-2 py-1 transition text-left">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{op.titre}</p>
                      <p className="text-xs text-slate-400">{op.participantsActuels} / {op.seuilMinimum} participants</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 flex-shrink-0">{formatMontant(op.prixActuel)} FCFA</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sondages ouverts */}
        {!loading && sondsActifs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Sondages disponibles</h2>
              <button onClick={() => navigate('/sondages')} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                Tout voir <ArrowRight size={13} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {sondsActifs.slice(0, 4).map(s => (
                <button key={s.id} onClick={() => navigate(`/sondages/${s.id}`)} className="text-left rounded-xl border border-slate-200 p-4 hover:border-violet-300 hover:bg-violet-50 transition">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.titre}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                  <p className="mt-2 text-xs font-bold text-violet-600">{Number(s.recompense).toLocaleString('fr-FR')} FCFA</p>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
