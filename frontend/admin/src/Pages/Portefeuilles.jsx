import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle, X, Plus, Receipt, Pencil, Check } from 'lucide-react'
import { Badge, Card, Table, Th, Td, Tr, Spinner, EmptyState, Tabs } from '../components/ui'
import { useSSE } from '../hooks/useSSE'
import { useAuth } from '../context/AuthContext'
import {
  getAdminTransactions, getRetraitsEnAttente, approuverRetrait, rejeterRetrait,
  getAdminWallet, alimenterWallet, modifierTauxConversion,
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

function AlimenterModal({ onClose, onSaved }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Alimenter le wallet plateforme</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
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
          <div className="flex gap-2.5 pt-1">
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
  const { token } = useAuth()
  const [wallet, setWallet]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [retraits, setRetraits]       = useState([])
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [loadingTxs, setLoadingTxs]   = useState(true)
  const [tab, setTab]                 = useState(0)
  const [actionId, setActionId]       = useState(null)
  const [showAlimenter, setShowAlimenter]   = useState(false)
  const [editTaux, setEditTaux]             = useState(false)
  const [tauxInput, setTauxInput]           = useState('')
  const [savingTaux, setSavingTaux]         = useState(false)
  const [tauxError, setTauxError]           = useState('')

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
  useSSE('admin/events/global', {
    RETRAIT_DEMANDE: () => { fetchRetraits(); fetchTransactions() },
  }, token)

  const openEditTaux = () => {
    setTauxInput(wallet?.tauxConversionPoints ?? '')
    setTauxError('')
    setEditTaux(true)
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

  return (
    <div className="space-y-4">
      {showAlimenter && (
        <AlimenterModal
          onClose={() => setShowAlimenter(false)}
          onSaved={() => { setShowAlimenter(false); setLoadingWallet(true); fetchWallet() }}
        />
      )}

      {/* ── Wallet banner ── */}
      <div className="rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Trésorerie plateforme</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-200">Wallet OpportuniHub</h2>
          </div>
          <button
            onClick={() => setShowAlimenter(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition"
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
            <div className="rounded-lg bg-white/10 border border-white/10 p-4">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Solde disponible</p>
              <p className="text-2xl font-black text-white tabular-nums">{fmt(wallet.soldePlateforme)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{wallet.devise}</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/5 p-4">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Réserve</p>
              <p className="text-2xl font-black text-white tabular-nums">{fmt(wallet.soldeReserve)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{wallet.devise}</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/5 p-4">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Solde points</p>
              <p className="text-2xl font-black text-white tabular-nums">{fmt(wallet.soldePoints)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">pts</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-rose-300 py-2">Impossible de charger le wallet plateforme.</p>
        )}
        {wallet?.updatedAt && (
          <p className="mt-4 text-[10px] text-slate-600">Dernière mise à jour : {formatDate(wallet.updatedAt)}</p>
        )}
      </div>

      {/* ── Paramètres : taux de conversion points ── */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[13px] font-bold text-slate-900">Taux de conversion points</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Nombre de points attribués par FCFA de récompense. Utilisé aussi pour calculer le retour en FCFA lors d'une conversion.
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
                  <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">pts / FCFA</span>
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
            <span className="font-semibold text-slate-700">Avec taux = {wallet?.tauxConversionPoints ?? '?'} FCFA / point :</span>
          </p>
          <p>
            Attribution : récompense de 500 FCFA → {wallet?.tauxConversionPoints ? Math.floor(500 / wallet.tauxConversionPoints).toLocaleString('fr-FR') : '?'} points crédités
          </p>
          <p>
            Conversion retour : 1 000 points → {wallet?.tauxConversionPoints ? (1000 * wallet.tauxConversionPoints).toLocaleString('fr-FR') : '?'} FCFA versés au participant
          </p>
        </div>
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
                <Table>
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
                    {transactions.map(t => {
                      const isCredit = CREDIT_TYPES.includes(t.type)
                      return (
                        <Tr key={t.id}>
                          <Td><span className="font-semibold text-slate-900">{TYPE_LABELS[t.type] || t.type}</span></Td>
                          <Td>
                            <span className={`font-semibold tabular-nums ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isCredit ? '+' : '-'}{fmt(t.montant)} FCFA
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
                <Table>
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
                    {retraits.map(t => (
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
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
