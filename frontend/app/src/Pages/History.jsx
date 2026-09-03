import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShoppingBag, ClipboardList, ChevronRight, PackageCheck, AlertTriangle } from 'lucide-react'
import { confirmerReceptionOpportunite, getMesParticipationsOpportunites, getMesParticipationsSondages, imgUrl } from '../services/api'

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Statuts Participation (opportunités) ──────────────────────────────────────
const STATUT_OP = {
  EN_ATTENTE: { label: 'En attente',  cls: 'bg-accent/10 text-accent',   dot: 'bg-accent' },
  CONFIRMEE:  { label: 'Confirmée',   cls: 'bg-success/10 text-success',  dot: 'bg-success' },
  REMBOURSEE: { label: 'Remboursée',  cls: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-500' },
}

const STATUT_OP_OPPORTUNITE = {
  ACTIVE:   { label: 'Active',    cls: 'text-success' },
  CLOTUREE: { label: 'Clôturée', cls: 'text-primary' },
  ANNULEE:  { label: 'Annulée',  cls: 'text-urgency' },
  BROUILLON:{ label: 'Brouillon',cls: 'text-gray-400' },
}

const LIVRAISON = {
  EN_ATTENTE_QUOTA: ['Campagne en cours', 0], A_PREPARER: ['Paiement validé', 20],
  PREPARATION: ['Lot transmis au partenaire', 40], PRET_LIVRAISON: ['Partenaire confirmé', 55],
  EN_LIVRAISON: ['Date promise communiquée', 75], LIVRE_A_CONFIRMER: ['Votre confirmation est attendue', 90],
  LIVRE_CONFIRME: ['Terminée', 100], ECHEC_LIVRAISON: ['Anomalie', 70], LITIGE: ['Litige', 70], ANNULE: ['Annulée', 0],
}

// ── Statuts Validation (sondages) ─────────────────────────────────────────────
const STATUT_SONDAGE = {
  VALIDE:              { label: 'Validée',              cls: 'bg-success/10 text-success',   dot: 'bg-success' },
  EN_ATTENTE_PREUVE:   { label: 'Vérification en cours', cls: 'bg-orange-50 text-orange-600', dot: 'bg-orange-400' },
  REJETE:              { label: 'Non retenue',           cls: 'bg-urgency/10 text-urgency',   dot: 'bg-urgency' },
}

const ETAPE_SONDAGE = {
  ACTIF: 'Réponses ouvertes',
  EN_ATTENTE_DISTRIBUTION: 'Validation des participations',
  CLOTURE: 'Sondage finalisé',
  ANNULE: 'Sondage annulé',
}

function StatutBadge({ map, keyVal }) {
  const s = map[keyVal] || { label: keyVal, cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function EmptyState({ tab }) {
  return (
    <div className="bg-white rounded-3xl border-2 border-dashed border-gray-100 py-20 flex flex-col items-center gap-4">
      <div className="w-20 h-20 bg-bg-light rounded-full flex items-center justify-center">
        {tab === 'opportunites'
          ? <ShoppingBag size={32} className="text-gray-200" />
          : <ClipboardList size={32} className="text-gray-200" />}
      </div>
      <div className="text-center">
        <p className="font-heading font-bold text-primary text-lg">Aucune participation</p>
        <p className="text-xs text-gray-400 font-bold mt-1">
          {tab === 'opportunites'
            ? 'Rejoignez une opportunité d\'achat groupé pour la voir ici'
            : 'Répondez à un sondage pour le voir ici'}
        </p>
      </div>
    </div>
  )
}

export default function History() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('opportunites')
  const [opportunites, setOpportunites] = useState([])
  const [sondages, setSondages] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState(null)

  const confirmerReception = async (e, participation) => {
    e.stopPropagation()
    setConfirmingId(participation.id)
    try {
      const updated = await confirmerReceptionOpportunite(participation.id, true)
      setOpportunites(list => list.map(p => p.id === participation.id ? updated : p))
    } finally { setConfirmingId(null) }
  }

  useEffect(() => {
    Promise.all([
      getMesParticipationsOpportunites().catch(() => []),
      getMesParticipationsSondages().catch(() => []),
    ]).then(([ops, sond]) => {
      setOpportunites(ops)
      setSondages(sond)
    }).finally(() => setLoading(false))
  }, [])

  const totalMontantEngage = opportunites.reduce((s, p) => s + Number(p.montantGele || 0), 0)
  const totalRecompenses = sondages
    .filter(s => s.recompenseVersee)
    .reduce((s, p) => s + Number(p.recompense || 0), 0)

  return (
    <div className="min-h-screen bg-bg-light pb-28">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 glass-header border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-heading font-extrabold text-lg text-primary leading-none">Mes Participations</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">Opportunités et sondages</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span>{opportunites.length} offre{opportunites.length > 1 ? 's' : ''}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>{sondages.length} sondage{sondages.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-5">

        {/* ── Stats résumé ── */}
        {!loading && (opportunites.length > 0 || sondages.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Offres rejointes</p>
              <p className="text-2xl font-heading font-black text-primary">{opportunites.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Montant engagé</p>
              <p className="text-xl font-heading font-black text-primary tabular-nums">{fmt(totalMontantEngage)}</p>
              <p className="text-[9px] text-gray-400 font-bold">FCFA</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Sondages complétés</p>
              <p className="text-2xl font-heading font-black text-primary">{sondages.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Valeur des récompenses</p>
              <p className="text-xl font-heading font-black text-success tabular-nums">{fmt(totalRecompenses)}</p>
              <p className="text-[9px] text-gray-400 font-bold">équivalent FCFA</p>
            </div>
          </div>
        )}

        {/* ── Onglets ── */}
        <div className="bg-white p-1 rounded-2xl flex gap-1 border-2 border-gray-100 shadow-sm">
          <button
            onClick={() => setTab('opportunites')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              tab === 'opportunites'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-gray-400 hover:text-primary'
            }`}
          >
            <ShoppingBag size={14} />
            Opportunités
            {opportunites.length > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === 'opportunites' ? 'bg-white/20' : 'bg-gray-100'}`}>
                {opportunites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('sondages')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              tab === 'sondages'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-gray-400 hover:text-primary'
            }`}
          >
            <ClipboardList size={14} />
            Sondages
            {sondages.length > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === 'sondages' ? 'bg-white/20' : 'bg-gray-100'}`}>
                {sondages.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Contenu ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={36} className="animate-spin text-primary" />
          </div>
        ) : tab === 'opportunites' ? (

          /* ── Liste Opportunités ── */
          opportunites.length === 0 ? <EmptyState tab="opportunites" /> : (
            <div className="space-y-3">
              {opportunites.map(p => (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden hover:border-primary/20 transition-all cursor-pointer active:scale-[0.99]"
                  onClick={() => navigate(`/opportunity/${p.opportuniteId}`)}
                >
                  <div className="flex gap-4 p-4">

                    {/* Image */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={p.imageUrl ? imgUrl(p.imageUrl) : `https://picsum.photos/seed/${p.opportuniteId}/200/200`}
                        alt={p.titre}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-heading font-extrabold text-sm text-primary leading-tight line-clamp-2">{p.titre}</h3>
                        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-0.5" />
                      </div>

                      {p.categorie && (
                        <span className="inline-block text-[9px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full mb-2">
                          {p.categorie}
                        </span>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <StatutBadge map={STATUT_OP} keyVal={p.statut} />
                        {p.statutOpportunite && (
                          <span className={`text-[10px] font-bold ${STATUT_OP_OPPORTUNITE[p.statutOpportunite]?.cls || 'text-gray-400'}`}>
                            · Offre {STATUT_OP_OPPORTUNITE[p.statutOpportunite]?.label || p.statutOpportunite}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barre de détails */}
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Montant engagé</p>
                        <p className="text-sm font-black text-primary tabular-nums">{fmt(p.montantGele)} <span className="text-[10px] font-bold text-gray-400">FCFA</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Qté</p>
                        <p className="text-sm font-black text-primary">×{p.quantite}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Rejoint le</p>
                      <p className="text-[10px] font-bold text-gray-600">{fmtDate(p.createdAt)}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider">
                      <span className={p.confirmationEnRetard ? 'text-urgency' : 'text-primary'}>
                        {p.confirmationEnRetard && <AlertTriangle size={11} className="mr-1 inline" />}
                        {(LIVRAISON[p.statutLivraison] || [p.statutLivraison, 0])[0]}
                      </span>
                      <span className="text-gray-400">{p.progressionLivraison ?? (LIVRAISON[p.statutLivraison] || ['', 0])[1]}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${p.progressionLivraison || 0}%` }} />
                    </div>
                    {p.dateLivraisonPrevue && <p className="text-[10px] font-bold text-gray-500">Date promise : {fmtDate(p.dateLivraisonPrevue)}</p>}
                    {['EN_LIVRAISON', 'LIVRE_A_CONFIRMER'].includes(p.statutLivraison) && (
                      <button type="button" onClick={e => confirmerReception(e, p)} disabled={confirmingId === p.id}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-success px-3 py-2.5 text-xs font-black text-white disabled:opacity-50">
                        {confirmingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                        Confirmer que j'ai reçu le produit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )

        ) : (

          /* ── Liste Sondages ── */
          sondages.length === 0 ? <EmptyState tab="sondages" /> : (
            <div className="space-y-3">
              {sondages.map(s => (
                <div
                  key={s.id}
                  className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden hover:border-primary/20 transition-all cursor-pointer active:scale-[0.99]"
                  onClick={() => navigate(`/sondages/${s.sondageId}`)}
                >
                  <div className="p-4 flex items-start gap-4">

                    {/* Icône */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      s.recompenseVersee ? 'bg-success/10' : 'bg-primary/5'
                    }`}>
                      <ClipboardList size={20} className={s.recompenseVersee ? 'text-success' : 'text-primary/40'} />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-heading font-extrabold text-sm text-primary leading-tight line-clamp-2">{s.titre}</h3>
                        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <StatutBadge map={STATUT_SONDAGE} keyVal={s.statutValidation} />
                        {s.recompenseVersee && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-success">
                            <i className="ti ti-coin text-xs" /> Récompense versée
                          </span>
                        )}
                        {!s.recompenseVersee && s.statutSondage && (
                          <span className="text-[10px] font-bold text-gray-400">
                            · {ETAPE_SONDAGE[s.statutSondage] || s.statutSondage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barre de détails */}
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Récompense</p>
                        <p className="text-sm font-black text-primary tabular-nums">
                          {fmt(s.recompense)} <span className="text-[10px] font-bold text-gray-400">
                            {s.typeRecompense === 'POINTS' ? 'FCFA → points' : 'FCFA'}
                          </span>
                        </p>
                      </div>
                      {s.valideeAt && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Validé le</p>
                          <p className="text-[10px] font-bold text-gray-600">{fmtDate(s.valideeAt)}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Soumis le</p>
                      <p className="text-[10px] font-bold text-gray-600">{fmtDate(s.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  )
}
