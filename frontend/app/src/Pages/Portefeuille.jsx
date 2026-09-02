import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, TrendingUp, ShoppingBag, Wallet, Lock } from 'lucide-react'
import RechargeModal from './RechargeModal'
import RetraitModal from './RetraitModal'
import ConversionModal from './ConversionModal'
import { getSolde, recharger, demanderRetrait, getTransactions, getKycStatus, convertirPoints } from '../services/api'
import { usePusher } from '../context/PusherContext'

function fmt(val) { return Number(val || 0).toLocaleString('fr-FR') }

const TYPE_LABEL = { DEPOT: 'Dépôt', RETRAIT: 'Retrait', GEL: 'Gel fonds', DEBIT: 'Débit achat', REMBOURSEMENT: 'Remboursement', RECOMPENSE: 'Récompense', CONVERSION_POINTS: 'Conversion de points' }
const TYPE_DOT   = { DEPOT: 'bg-success shadow-[0_0_8px_rgba(39,174,96,0.5)]', RECOMPENSE: 'bg-accent shadow-[0_0_8px_rgba(246,166,35,0.5)]', REMBOURSEMENT: 'bg-indigo-500', RETRAIT: 'bg-blue-500', GEL: 'bg-gray-300', DEBIT: 'bg-urgency', CONVERSION_POINTS: 'bg-yellow-400' }
const TX_ICON    = {
  DEPOT:              { cls: 'bg-success/10', icon: 'ti-arrow-down-left text-success' },
  RECOMPENSE:         { cls: 'bg-accent/10',  icon: 'ti-star text-accent' },
  REMBOURSEMENT:      { cls: 'bg-indigo-50',  icon: 'ti-refresh text-indigo-500' },
  GEL:                { cls: 'bg-gray-100',   icon: 'ti-lock text-gray-400' },
  RETRAIT:            { cls: 'bg-blue-50',    icon: 'ti-arrow-up-right text-blue-500' },
  DEBIT:              { cls: 'bg-primary/5',  icon: 'ti-shopping-bag text-primary' },
  CONVERSION_POINTS:  { cls: 'bg-yellow-50',  icon: 'ti-coin text-yellow-500' },
}

function isEntree(type) { return ['DEPOT', 'RECOMPENSE', 'CONVERSION_POINTS'].includes(type) }
function isCredit(type) { return ['DEPOT', 'RECOMPENSE', 'REMBOURSEMENT', 'CONVERSION_POINTS'].includes(type) }

const TX_FILTERS = [
  { key: '',                  label: 'Tout' },
  { key: 'DEPOT',             label: 'Dépôts' },
  { key: 'DEBIT',             label: 'Achats' },
  { key: 'RETRAIT',           label: 'Retraits' },
  { key: 'REMBOURSEMENT',     label: 'Remb.' },
  { key: 'RECOMPENSE',        label: 'Récomp.' },
  { key: 'CONVERSION_POINTS', label: 'Points' },
]

export default function Portefeuille() {
  const navigate = useNavigate()
  const { on, off } = usePusher()

  const [portefeuille, setPortefeuille]   = useState(null)
  const [transactions, setTransactions]   = useState([])
  const [loading, setLoading]             = useState(true)
  const [isRechargeOpen, setRechargeOpen] = useState(false)
  const [isWithdrawOpen, setWithdrawOpen] = useState(false)
  const [isConvertOpen, setConvertOpen]   = useState(false)
  const [actionError, setActionError]     = useState('')
  const [kycNiveau, setKycNiveau]         = useState(null)
  const [showKycGate, setShowKycGate]     = useState(false)
  const [hideBalance, setHideBalance]     = useState(false)
  const [txFilter, setTxFilter]           = useState('')

  useEffect(() => {
    on('wallet.credited', fetchData)
    on('wallet.debited', fetchData)
    return () => { off('wallet.credited', fetchData); off('wallet.debited', fetchData) }
  }, [])

  const fetchData = async () => {
    try {
      const [solde, txs] = await Promise.all([getSolde(), getTransactions()])
      setPortefeuille(solde)
      setTransactions(txs)
    } catch { /* silent */ }
    finally { setLoading(false) }
    getKycStatus()
      .then(kyc => setKycNiveau(kyc?.niveauVerification || 'AUCUN'))
      .catch(() => setKycNiveau('AUCUN'))
  }

  useEffect(() => { fetchData() }, [])

  const handleRecharge = async (amount, moyenPaiement) => {
    const val = parseFloat(amount)
    if (!val || val < 500) { setActionError('Montant minimum 500 FCFA'); return }
    setActionError('')
    try {
      const updated = await recharger(val, moyenPaiement, null)
      setPortefeuille(updated)
      await getTransactions().then(setTransactions)
      setRechargeOpen(false)
    } catch (e) { setActionError(e.response?.data?.message || 'Erreur recharge') }
  }

  const handleRetrait = async (amount, coordonnees) => {
    const val = parseFloat(amount)
    if (!val || val < 1000) { setActionError('Montant minimum 1 000 FCFA'); return }
    if (!coordonnees?.trim()) { setActionError('Numéro requis'); return }
    setActionError('')
    try {
      await demanderRetrait(val, coordonnees.trim())
      await fetchData()
      setWithdrawOpen(false)
    } catch (e) { setActionError(e.response?.data?.message || 'Erreur retrait') }
  }

  const handleConvertirPoints = async (pts) => {
    await convertirPoints(pts)
    await fetchData()
    setConvertOpen(false)
  }

  const openRetrait = () => {
    if (kycNiveau !== 'VERIFIE') { setShowKycGate(true); return }
    setActionError(''); setWithdrawOpen(true)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light">
      <Loader2 size={40} className="animate-spin text-primary" />
    </div>
  )

  const solde       = Number(portefeuille?.soldeDisponible || 0)
  const soldeGele   = Number(portefeuille?.soldeGele || 0)
  const soldePoints = Number(portefeuille?.soldePoints || 0)

  const totalEntrees = transactions
    .filter(t => ['DEPOT', 'RECOMPENSE'].includes(t.type) && t.statut === 'SUCCESS')
    .reduce((s, t) => s + Number(t.montant || 0), 0)

  const totalSorties = transactions
    .filter(t => (t.type === 'DEBIT') || (t.type === 'RETRAIT' && t.statut === 'SUCCESS'))
    .reduce((s, t) => s + Number(t.montant || 0), 0)

  const nbSorties = transactions
    .filter(t => t.type === 'DEBIT' || (t.type === 'RETRAIT' && t.statut === 'SUCCESS'))
    .length

  const filteredTx = transactions.filter(t => !txFilter || t.type === txFilter)

  return (
    <div className="min-h-screen bg-bg-light pb-28">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10">

        {/* Titre desktop */}
        <div className="hidden lg:block mb-8">
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
            <span>Accueil</span>
            <i className="ti ti-chevron-right text-[8px]" />
            <span className="text-primary">Portefeuille</span>
          </nav>
          <h1 className="text-4xl font-heading font-black text-primary tracking-tight">Mon Portefeuille</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Gérez vos fonds, suivez vos transactions et retirez vos gains.</p>
        </div>

        {/* Titre mobile */}
        <h1 className="lg:hidden text-2xl font-heading font-extrabold text-primary tracking-tight mb-5">Portefeuille</h1>

        {/* ── Layout principal : 2 colonnes desktop, 1 colonne mobile ── */}
        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-8 lg:items-start">

          {/* ══ COLONNE GAUCHE — sticky sur desktop ══ */}
          <div className="space-y-4 lg:sticky lg:top-6">

            {/* Carte de solde */}
            <div
              className="relative rounded-[2rem] p-7 text-white overflow-hidden shadow-2xl shadow-primary/20"
              style={{ background: 'linear-gradient(135deg, #0A3D62 0%, #154e7a 55%, #1e6aa0 100%)', minHeight: 220 }}
            >
              <div className="absolute -right-12 -top-12 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-6 -bottom-10 w-44 h-44 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

              {/* En-tête */}
              <div className="relative z-10 flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50">Portefeuille</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-[10px] font-semibold opacity-70">Compte actif</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setHideBalance(b => !b)}
                  className="w-9 h-9 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  {hideBalance ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>

              {/* Solde */}
              <div className="relative z-10 mb-7">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-50 mb-1.5">Solde disponible</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-heading font-black tabular-nums tracking-tighter">
                    {hideBalance ? '••••••' : solde.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-base font-bold opacity-50">FCFA</span>
                </div>
              </div>

              {/* Bas de carte */}
              <div className="relative z-10 flex items-center gap-6 pt-4 border-t border-white/10">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Gelé</p>
                  <p className="text-sm font-bold tabular-nums text-accent">
                    {hideBalance ? '••••' : `${soldeGele.toLocaleString('fr-FR')} FCFA`}
                  </p>
                </div>
                {soldePoints > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Points</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold tabular-nums text-yellow-300">
                        {hideBalance ? '••••' : `${fmt(soldePoints)} pts`}
                      </p>
                      <button
                        onClick={() => setConvertOpen(true)}
                        className="text-[9px] font-black uppercase tracking-widest text-yellow-300 underline underline-offset-2 hover:text-yellow-200 transition-colors"
                      >
                        Convertir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setActionError(''); setRechargeOpen(true) }}
                className="bg-primary text-white py-4 rounded-2xl flex flex-col items-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                <ArrowDownLeft size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Recharger</span>
              </button>
              <button
                onClick={openRetrait}
                className={`py-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all border-2 ${
                  kycNiveau === 'VERIFIE'
                    ? 'bg-white text-primary border-primary/20 hover:border-primary hover:shadow-md active:scale-95'
                    : 'bg-gray-100 text-gray-400 border-transparent cursor-default'
                }`}
              >
                {kycNiveau === 'VERIFIE' ? <ArrowUpRight size={20} /> : <Lock size={20} />}
                <span className="text-[10px] font-black uppercase tracking-widest">Retirer</span>
              </button>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp size={15} className="text-success" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-success">Reçus</span>
                </div>
                <p className="text-xl font-heading font-black text-primary tabular-nums">{fmt(totalEntrees)}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">FCFA total reçus</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingBag size={15} className="text-accent" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-accent">{nbSorties} ops</span>
                </div>
                <p className="text-xl font-heading font-black text-primary tabular-nums">{fmt(totalSorties)}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">FCFA dépensés</p>
              </div>
            </div>

            {/* Bannière KYC */}
            {kycNiveau && kycNiveau !== 'VERIFIE' && (
              <div className={`rounded-2xl p-4 flex items-center gap-3 border-2 ${
                kycNiveau === 'EN_ATTENTE' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  kycNiveau === 'EN_ATTENTE' ? 'bg-blue-100' : 'bg-orange-100'
                }`}>
                  <i className={`ti ${kycNiveau === 'EN_ATTENTE' ? 'ti-clock-hour-4 text-blue-500' : 'ti-id-badge-off text-orange-500'} text-lg`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-primary">
                    {kycNiveau === 'EN_ATTENTE' ? 'Vérification en cours' : 'Retraits verrouillés'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                    {kycNiveau === 'EN_ATTENTE'
                      ? "Dossier en examen — retraits disponibles dès validation"
                      : "Vérifiez votre identité pour débloquer les retraits"}
                  </p>
                </div>
                {kycNiveau !== 'EN_ATTENTE' && (
                  <button
                    onClick={() => navigate('/verification')}
                    className="shrink-0 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl active:scale-95 transition-transform"
                  >
                    Vérifier
                  </button>
                )}
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-urgency/5 border border-urgency/10 rounded-2xl text-urgency text-xs font-bold text-center">
                {actionError}
              </div>
            )}
          </div>

          {/* ══ COLONNE DROITE — Transactions ══ */}
          <div className="mt-4 lg:mt-0">
            <div className="bg-white rounded-[2rem] border-2 border-gray-100 overflow-hidden">

              {/* En-tête + filtres */}
              <div className="px-6 lg:px-8 pt-6 pb-0">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-heading font-black text-primary">Historique</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">{transactions.length} transaction{transactions.length > 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:block">
                    Mis à jour {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Filtres */}
                <div className="flex gap-2 overflow-x-auto pb-4 -mx-6 lg:-mx-8 px-6 lg:px-8" style={{ scrollbarWidth: 'none' }}>
                  {TX_FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setTxFilter(f.key)}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        txFilter === f.key
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'bg-bg-light text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Liste */}
              {filteredTx.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <i className="ti ti-receipt-off text-5xl text-gray-200" />
                  <p className="text-sm text-gray-400 font-bold">Aucune transaction</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-50">
                    {filteredTx.map(t => {
                      const ico = TX_ICON[t.type] || { cls: 'bg-gray-100', icon: 'ti-circle text-gray-400' }
                      return (
                        <div key={t.id} className="px-6 lg:px-8 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group">

                          {/* Icône */}
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${ico.cls}`}>
                            <i className={`ti ${ico.icon} text-lg`} />
                          </div>

                          {/* Type + date */}
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm text-primary leading-tight">{TYPE_LABEL[t.type] || t.type}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-gray-400 font-bold">
                                {new Date(t.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {' · '}
                                {new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {t.moyenPaiement && (
                                <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  {t.moyenPaiement}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Réf (desktop uniquement) */}
                          <span className="hidden lg:block text-[9px] font-mono text-gray-300 group-hover:text-gray-400 transition-colors">
                            {t.id?.substring(0, 8).toUpperCase() || '—'}
                          </span>

                          {/* Montant + statut */}
                          <div className="text-right shrink-0">
                            <p className={`font-black text-sm tabular-nums ${
                              isEntree(t.type) ? 'text-success'
                              : t.type === 'REMBOURSEMENT' ? 'text-indigo-600'
                              : t.type === 'GEL' ? 'text-gray-400'
                              : 'text-primary'
                            }`}>
                              {isCredit(t.type) ? '+' : t.type === 'GEL' ? '~' : '-'}{fmt(t.montant)}
                              <span className="text-[9px] font-bold opacity-60 ml-1">FCFA</span>
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[t.type] || 'bg-gray-300'}`} />
                              <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest">{t.statut}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="px-6 lg:px-8 py-4 border-t border-gray-100 bg-gray-50/20 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {filteredTx.length} transaction{filteredTx.length > 1 ? 's' : ''} affichée{filteredTx.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ── */}
      <RechargeModal
        open={isRechargeOpen}
        onClose={() => { setRechargeOpen(false); fetchData() }}
        onSuccess={() => { fetchData() }}
      />
      <RetraitModal open={isWithdrawOpen} onClose={() => setWithdrawOpen(false)} onConfirm={handleRetrait} balance={solde} />
      <ConversionModal open={isConvertOpen} onClose={() => setConvertOpen(false)} points={soldePoints} onConvert={handleConvertirPoints} />

      {/* KYC Gate Modal */}
      {showKycGate && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowKycGate(false)}
        >
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto">
              <i className="ti ti-id-badge-off text-3xl text-orange-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-heading font-extrabold text-xl text-primary">Vérification requise</h3>
              <p className="text-sm text-gray-500 font-semibold">
                {kycNiveau === 'EN_ATTENTE'
                  ? "Votre dossier est en cours d'examen. Vous pourrez retirer dès validation."
                  : "Vérifiez votre identité pour débloquer les retraits. Cela prend moins de 2 minutes."}
              </p>
            </div>
            <div className="space-y-3">
              {kycNiveau !== 'EN_ATTENTE' && (
                <button
                  onClick={() => navigate('/verification')}
                  className="w-full bg-primary text-white font-black text-sm py-4 rounded-2xl active:scale-95 transition-transform"
                >
                  Vérifier mon identité
                </button>
              )}
              <button
                onClick={() => setShowKycGate(false)}
                className="w-full bg-bg-light text-gray-500 font-black text-sm py-3 rounded-2xl active:scale-95 transition-transform"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
