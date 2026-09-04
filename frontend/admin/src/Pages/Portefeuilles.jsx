import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, XCircle, Plus, Receipt, Pencil, Check } from 'lucide-react'
import { Badge, Card, Table, Th, Td, Tr, Spinner, EmptyState, Pagination, Tabs } from '../components/ui'
import { usePusher } from '../context/PusherContext'
import {
  getAdminTransactions, getRetraitsEnAttente, approuverRetrait, rejeterRetrait,
  getAdminWallet, alimenterWallet, modifierTauxConversion, modifierRecompenseParrainage,
} from '../services/api'

function fmt(val) {
  return Number(val || 0).toLocaleString('fr-FR')
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const TYPE_LABELS = {
  DEPOT: 'Recharge', RETRAIT: 'Retrait', GEL: 'Gel',
  DEBIT: 'Débit', REMBOURSEMENT: 'Remboursement', RECOMPENSE: 'Récompense',
  CONVERSION_POINTS: 'Conversion points',
}
const STATUT_COLOR = { EN_COURS: 'sky', SUCCESS: 'emerald', ECHOUE: 'rose', ANNULE: 'gray' }
const STATUT_LABEL = { EN_COURS: 'En cours', SUCCESS: 'Complète', ECHOUE: 'Échec', ANNULE: 'Annulé' }
const CREDIT_TYPES = ['DEPOT', 'RECOMPENSE', 'REMBOURSEMENT']

function AlimenterWalletForm({ onClose, onSaved }) {
  const [montant, setMontant]       = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const val = Number(montant)
    if (!val || val <= 0) { setError('Montant invalide'); return }
    setLoading(true)
    try {
      await alimenterWallet(val, description || undefined)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'alimentation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Alimenter le wallet plateforme</h3>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={14} /> Retour</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Montant (FCFA) *</label>
            <input
              required type="number" min="1" value={montant}
              onChange={e => setMontant(e.target.value)}
              placeholder="ex. 5 000 000"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 transition"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Description (optionnel)</label>
            <input
              type="text" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ex. Virement commanditaire Orange"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 transition"
            />
          </div>
          {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 border border-rose-100">{error}</div>}
          <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
            <button
              type="submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Confirmer l'alimentation
            </button>
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Portefeuilles() {
  const navigate = useNavigate()
  const { on, off } = usePusher()
  const [wallet, setWallet]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [retraits, setRetraits]       = useState([])
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [loadingTxs, setLoadingTxs]   = useState(true)
  const [tab, setTab]                 = useState(0)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [retraitsPage, setRetraitsPage] = useState(1)
  const [actionId, setActionId]       = useState(null)
  const [editTaux, setEditTaux]             = useState(false)
  const [tauxInput, setTauxInput]           = useState('')
  const [savingTaux, setSavingTaux]         = useState(false)
  const [tauxError, setTauxError]           = useState('')
  const [parrainageInput, setParrainageInput] = useState('')
  const [savingParrainage, setSavingParrainage] = useState(false)
  const [parrainageError, setParrainageError] = useState('')

  const fetchWallet = () =>
    getAdminWallet()
      .then(setWallet)
      .catch(() => setWallet(null))
      .finally(() => setLoadingWallet(false))

  const fetchTransactions = () => getAdminTransactions().then(setTransactions).catch(() => setTransactions([]))
  const fetchRetraits     = () => getRetraitsEnAttente().then(setRetraits).catch(() => setRetraits([]))

  useEffect(() => {
    fetchWallet()
    Promise.all([fetchTransactions(), fetchRetraits()]).finally(() => setLoadingTxs(false))
  }, [])

  // Nouvelle demande de retrait — apparaît sans refresh
  useEffect(() => {
    const onRetraitDemande = () => { fetchRetraits(); fetchTransactions() }
    on('RETRAIT_DEMANDE', onRetraitDemande)
    return () => off('RETRAIT_DEMANDE', onRetraitDemande)
  }, [off, on])

  const openEditTaux = () => {
    setTauxInput(wallet?.tauxConversionPoints ?? '')
    setTauxError('')
    setEditTaux(true)
  }

  const handleSaveParrainage = async () => {
    const val = Number(parrainageInput || wallet?.recompenseParrainagePoints)
    if (!val || val <= 0) { setParrainageError('Valeur invalide'); return }
    setSavingParrainage(true)
    setParrainageError('')
    try {
      const updated = await modifierRecompenseParrainage(val)
      setWallet(updated)
      setParrainageInput('')
    } catch (err) {
      setParrainageError(err.response?.data?.message || 'Impossible de modifier la récompense')
    } finally {
      setSavingParrainage(false)
    }
  }

  const handleSaveTaux = async () => {
    const val = parseFloat(tauxInput)
    if (!val || val <= 0) { setTauxError('Valeur invalide'); return }
    setSavingTaux(true)
    setTauxError('')
    try {
      const updated = await modifierTauxConversion(val)
      setWallet(updated)
      setEditTaux(false)
    } catch (err) {
      setTauxError(err.response?.data?.message || 'Erreur')
    } finally {
      setSavingTaux(false)
    }
  }

  const handleApprouver = async (id) => {
    setActionId(id)
    try { await approuverRetrait(id); fetchRetraits(); fetchTransactions() }
    catch (e) { alert(e.response?.data?.message || 'Erreur') }
    finally { setActionId(null) }
  }

  const handleRejeter = async (id) => {
    setActionId(id)
    try { await rejeterRetrait(id); fetchRetraits(); fetchTransactions() }
    catch (e) { alert(e.response?.data?.message || 'Erreur') }
    finally { setActionId(null) }
  }

  useEffect(() => {
    setTransactionsPage(1)
    setRetraitsPage(1)
  }, [tab])
  const transactionsPageItems = transactions.slice((transactionsPage - 1) * 10, transactionsPage * 10)
  const retraitsPageItems = retraits.slice((retraitsPage - 1) * 10, retraitsPage * 10)

  return (
    <div className="space-y-4">
      {/* ── Wallet banner ── */}
      <section className="relative overflow-hidden rounded-3xl bg-violet-600 p-5 text-white shadow-lift sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[44px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full border-[38px] border-emerald-300/20" />
        <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Trésorerie plateforme</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-200">Wallet OpportuniHub</h2>
          </div>
          <button
            onClick={() => navigate('/portefeuilles/alimenter')}
            className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Plus size={14} /> Alimenter
          </button>
        </div>

        {loadingWallet ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            <span className="text-sm text-slate-400">Chargement…</span>
          </div>
        ) : wallet ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/15 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Solde disponible</p>
              <p className="text-2xl font-black text-white tabular-nums">{fmt(wallet.soldePlateforme)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{wallet.devise}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Réserve</p>
              <p className="text-2xl font-black text-white tabular-nums">{fmt(wallet.soldeReserve)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{wallet.devise}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Solde points</p>
              <p className="text-2xl font-black text-white tabular-nums">{fmt(wallet.soldePoints)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">pts</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-rose-300 py-2">Impossible de charger le wallet plateforme.</p>
        )}
        {wallet?.updatedAt && (
          <p className="mt-4 text-[10px] text-violet-100">Dernière mise à jour : {formatDate(wallet.updatedAt)}</p>
        )}
        </div>
      </section>

      {/* ── Paramètres : taux de conversion points ── */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[13px] font-bold text-slate-900">Valeur d'achat des points</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Valeur en FCFA appliquée lorsqu'un participant paie un achat avec ses points. Les points ne peuvent jamais être retirés en argent.
            </p>
          </div>

          {!editTaux ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 tabular-nums">
                  {wallet?.tauxConversionPoints ?? '—'}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold">FCFA / point</p>
              </div>
              <button
                onClick={openEditTaux}
                disabled={!wallet}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
              >
                <Pencil size={13} /> Modifier
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2 flex-col sm:flex-row">
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={tauxInput}
                    onChange={e => setTauxInput(e.target.value)}
                    className="w-28 rounded-lg border border-violet-400 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200 tabular-nums"
                    autoFocus
                  />
                  <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">FCFA / point</span>
                </div>
                {tauxError && <p className="mt-1 text-[11px] text-rose-600">{tauxError}</p>}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleSaveTaux}
                  disabled={savingTaux}
                  className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-violet-800 transition disabled:opacity-60"
                >
                  {savingTaux ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Sauvegarder
                </button>
                <button
                  onClick={() => setEditTaux(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-[11px] text-slate-500 space-y-1">
          <p>
            <span className="font-semibold text-slate-700">Avec une valeur de {wallet?.tauxConversionPoints ?? '?'} FCFA par point :</span>
          </p>
          <p>
            1 000 points permettent de réduire un achat de {wallet?.tauxConversionPoints ? (1000 * wallet.tauxConversionPoints).toLocaleString('fr-FR') : '?'} FCFA.
          </p>
          <p>
            Le solde disponible et retirable du participant n'est jamais crédité par cette opération.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-bold text-slate-900">Récompense par achat parrainé</p>
            <p className="mt-1 text-[11px] text-slate-400">Créditée une seule fois au propriétaire du lien après le premier achat payé du filleul.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min="1" step="1" value={parrainageInput} onChange={e => setParrainageInput(e.target.value)} placeholder={String(wallet?.recompenseParrainagePoints ?? 100)} className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-violet-400" />
            <span className="text-xs font-semibold text-slate-400">points</span>
            <button onClick={handleSaveParrainage} disabled={savingParrainage || !wallet} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {savingParrainage ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Enregistrer
            </button>
          </div>
        </div>
        {parrainageError && <p className="mt-2 text-[11px] font-semibold text-rose-600">{parrainageError}</p>}
      </Card>

      {/* ── Onglets transactions ── */}
      <Card noPad>
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 gap-4 flex-wrap">
          <Tabs
            tabs={[
              'Toutes les transactions',
              retraits.length > 0 ? `Retraits en attente (${retraits.length})` : 'Retraits en attente',
            ]}
            active={tab}
            onChange={setTab}
          />
          {retraits.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {retraits.length} à traiter
            </span>
          )}
        </div>

        <div className="p-4">
          {/* Tab 0 : Toutes les transactions */}
          {tab === 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-slate-900">Transactions utilisateurs</p>
                <span className="text-[11px] text-slate-400">{transactions.length} au total</span>
              </div>
              {loadingTxs ? (
                <Spinner py="py-10" />
              ) : transactions.length === 0 ? (
                <EmptyState icon={Receipt} title="Aucune transaction" />
              ) : (
                <><Table>
                  <thead>
                    <tr>
                      <Th>Type</Th>
                      <Th>Montant</Th>
                      <Th>Coordonnées</Th>
                      <Th>Moyen / Réf.</Th>
                      <Th>Statut</Th>
                      <Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsPageItems.map(t => {
                      const isCredit = CREDIT_TYPES.includes(t.type)
                      const pointReward = t.type === 'RECOMPENSE' && t.reference?.startsWith('PARRAINAGE_')
                      return (
                        <Tr key={t.id}>
                          <Td><span className="font-semibold text-slate-900">{pointReward ? 'Points de parrainage' : TYPE_LABELS[t.type] || t.type}</span></Td>
                          <Td>
                            <span className={`font-semibold tabular-nums ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isCredit ? '+' : '-'}{fmt(t.montant)} {pointReward ? 'pts' : 'FCFA'}
                            </span>
                          </Td>
                          <Td><span className="text-[11.5px] text-slate-500">{t.coordonnees || '—'}</span></Td>
                          <Td><span className="font-mono text-[11px] text-slate-400">{t.moyenPaiement || t.reference || '—'}</span></Td>
                          <Td><Badge color={STATUT_COLOR[t.statut] || 'gray'}>{STATUT_LABEL[t.statut] || t.statut}</Badge></Td>
                          <Td><span className="text-[11.5px] text-slate-500">{formatDate(t.createdAt)}</span></Td>
                        </Tr>
                      )
                    })}
                  </tbody>
                </Table>
                <Pagination page={transactionsPage} totalItems={transactions.length} onPageChange={setTransactionsPage} /></>
              )}
            </>
          )}

          {/* Tab 1 : Retraits en attente */}
          {tab === 1 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-slate-900">Retraits en attente d'approbation</p>
                <span className="text-[11px] text-slate-400">{retraits.length} à traiter</span>
              </div>
              {loadingTxs ? (
                <Spinner py="py-10" />
              ) : retraits.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3 text-center">
                  <CheckCircle size={32} className="text-emerald-400" />
                  <p className="text-sm font-semibold text-slate-400">Aucun retrait en attente</p>
                </div>
              ) : (
                <><Table>
                  <thead>
                    <tr>
                      <Th>Utilisateur</Th>
                      <Th>Montant</Th>
                      <Th>Coordonnées</Th>
                      <Th>Date demande</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {retraitsPageItems.map(t => (
                      <Tr key={t.id}>
                        <Td><span className="font-mono text-[11px] text-slate-500">{t.utilisateurId?.slice(0, 8)}…</span></Td>
                        <Td><span className="font-semibold text-rose-600 tabular-nums">-{fmt(t.montant)} FCFA</span></Td>
                        <Td><span className="font-semibold text-slate-800">{t.coordonnees || '—'}</span></Td>
                        <Td><span className="text-[11.5px] text-slate-500">{formatDate(t.createdAt)}</span></Td>
                        <Td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprouver(t.id)}
                              disabled={actionId === t.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-600 transition disabled:opacity-50"
                            >
                              {actionId === t.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                              Approuver
                            </button>
                            <button
                              onClick={() => handleRejeter(t.id)}
                              disabled={actionId === t.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-600 transition disabled:opacity-50"
                            >
                              {actionId === t.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                              Rejeter
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
                <Pagination page={retraitsPage} totalItems={retraits.length} onPageChange={setRetraitsPage} /></>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

export function AlimenterPortefeuillePage() {
  const navigate = useNavigate()
  return <AlimenterWalletForm onClose={() => navigate('/portefeuilles')} onSaved={() => navigate('/portefeuilles')} />
}
