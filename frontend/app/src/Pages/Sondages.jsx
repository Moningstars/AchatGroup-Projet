import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { getSondages, getBannieres, imgUrl } from '../services/api'
import PageCarousel from '../components/PageCarousel'
import { useSSE } from '../hooks/useSSE'

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }


function formatDate(dt) {
  if (!dt) return null
  const d = new Date(dt)
  const diff = Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return 'Expiré'
  if (diff === 1) return 'Expire demain'
  if (diff <= 7) return `Expire dans ${diff}j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const STATUT = {
  ACTIF: { label: 'Ouvert', cls: 'bg-success/15 text-success border-success/20' },
  EN_ATTENTE: { label: 'En attente', cls: 'bg-accent/15 text-accent border-accent/20' },
  EN_ATTENTE_DISTRIBUTION: { label: 'En validation', cls: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  CLOTURE: { label: 'Clôturé', cls: 'bg-gray-100 text-gray-400 border-gray-200' },
}

const GRID_LIMIT = 10 // 5 col × 2 lignes

export default function Sondages() {
  const navigate = useNavigate()
  const [sondages, setSondages] = useState([])
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rewardFilter, setRewardFilter] = useState('TOUS')
  const [page, setPage] = useState(1)

  useEffect(() => {
    getBannieres('SONDAGES')
      .then(data => setSlides(data.map(b => ({
        img: imgUrl(b.imageUrl),
        tag: b.tag,
        icon: b.icone,
        title: b.titre,
        desc: b.description,
        lien: b.lien,
      }))))
      .catch(() => {})
    getSondages()
      .then(setSondages)
      .catch(() => setSondages([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { setPage(1) }, [rewardFilter, search])

  // Compteurs/statut mis à jour en direct
  useSSE('sondages', {
    COMPTEUR: ({ id, repondantsActuels }) => {
      setSondages(prev => prev.map(s => s.id === id ? { ...s, repondantsActuels } : s))
    },
    STATUT: ({ id, statut }) => {
      setSondages(prev => prev.map(s => s.id === id ? { ...s, statut } : s))
    },
  })

  const filtered = sondages.filter(s => {
    const q = search.toLowerCase()
    const correspondRecherche = !q || s.titre?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    const correspondRecompense = rewardFilter === 'TOUS' || s.typeRecompense === rewardFilter
    return correspondRecherche && correspondRecompense
  })

  const actifs = filtered.filter(s => s.statut === 'ACTIF')
  const autres = filtered.filter(s => s.statut !== 'ACTIF')

  // Featured = premier actif, grille = le reste (actifs suivants + autres)
  const featured = actifs[0] || null
  const gridItems = [...actifs.slice(featured ? 1 : 0), ...autres]
  const visibleGrid = gridItems.slice(0, page * GRID_LIMIT)
  const hasMore = gridItems.length > page * GRID_LIMIT

  return (
    <div className="min-h-screen bg-bg-light pb-28 selection:bg-accent/30 overflow-x-hidden">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 glass-header border-b border-gray-100/70 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-heading font-extrabold text-xl tracking-tight text-primary leading-none">Sondages</h1>
            <p className="text-[11px] text-success font-bold uppercase tracking-widest mt-0.5">
              {actifs.length} disponible{actifs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sondages.length > 0 && (
              <div className="bg-accent/10 text-accent px-3 py-1 rounded-xl text-xs font-black">
                {sondages.length} total
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-0">

        {/* ── Carousel promo ── */}
        <div className="pt-5">
          {slides.length > 0 && <PageCarousel slides={slides} />}
        </div>

        {/* ── Search ── */}
        <div className="py-5 space-y-4">
          <div>
            <div className="relative flex-1">
              <i className="ti ti-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Thème, récompense..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold focus:border-primary focus:outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {[['TOUS', 'Toutes les récompenses'], ['ARGENT', 'Paiement FCFA'], ['POINTS', 'Points']].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setRewardFilter(value)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${rewardFilter === value ? 'border-primary bg-primary text-white' : 'border-gray-100 bg-white text-gray-500 hover:border-primary/30'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={36} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-2 border-gray-100 shadow-sm">
              <i className="ti ti-forms text-4xl text-gray-200" />
            </div>
            <p className="font-heading font-extrabold text-lg text-primary">
              {search || rewardFilter !== 'TOUS' ? 'Aucun résultat' : 'Aucun sondage disponible'}
            </p>
            <p className="text-xs text-gray-400 font-bold">
              {search || rewardFilter !== 'TOUS' ? 'Modifiez votre recherche ou vos filtres' : 'Revenez bientôt !'}
            </p>
            {(search || rewardFilter !== 'TOUS') && (
              <button onClick={() => { setSearch(''); setRewardFilter('TOUS') }} className="text-xs font-black text-primary uppercase tracking-widest border-2 border-primary/20 px-5 py-2.5 rounded-full hover:bg-primary hover:text-white transition-all">
                Réinitialiser
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {/* ── Featured (premier actif) ── */}
            {featured && (
              <SurveyCardFeatured survey={featured} onClick={() => navigate(`/sondages/${featured.id}`)} />
            )}

            {/* ── Grille 5 colonnes ── */}
            {gridItems.length > 0 && (
              <section className="space-y-4">
                {featured && gridItems.length > 0 && (
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                    {actifs.slice(1).length > 0 ? 'Autres sondages' : 'Terminés ou en attente'}
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {visibleGrid.map(s => (
                    <SurveyCardCompact key={s.id} survey={s} onClick={() => navigate(`/sondages/${s.id}`)} />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="flex items-center gap-2 bg-white border-2 border-gray-100 text-primary font-black uppercase text-[11px] tracking-widest px-8 py-3.5 rounded-2xl hover:border-primary transition-all active:scale-95 shadow-sm"
                    >
                      <i className="ti ti-chevron-down" />
                      Voir plus ({gridItems.length - page * GRID_LIMIT} restants)
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SurveyCardFeatured({ survey: s, onClick }) {
  const statut = STATUT[s.statut] || STATUT.CLOTURE
  const expiry = formatDate(s.dateExpiration)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-primary rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-primary/30 active:scale-[0.98] transition-transform"
    >
      {/* Image de couverture */}
      {s.imageUrl && (
        <div className="absolute inset-0 z-0">
          <img src={imgUrl(s.imageUrl)} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/50" />
        </div>
      )}

      <div className="relative z-10 p-7">
        <div className="flex justify-between items-center mb-6">
          <div className="bg-success/20 text-success text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-success/30">
            {statut.label}
          </div>
          {s.repondantsActuels > 0 && (
            <div className="flex items-center gap-1.5 text-white/60">
              <i className="ti ti-users-group text-sm" />
              <span className="text-[11px] font-bold">{s.repondantsActuels?.toLocaleString('fr-FR')} répondants</span>
            </div>
          )}
        </div>

        <h3 className="text-2xl font-heading font-extrabold mb-3 leading-tight tracking-tight">{s.titre}</h3>
        {s.description && (
          <p className="text-white/50 text-sm mb-8 font-medium leading-relaxed line-clamp-2">{s.description}</p>
        )}

        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1">Récompense</span>
            <div className="flex items-center gap-1.5">
              <span className="text-3xl font-heading font-extrabold text-accent">{fmt(s.recompense)}</span>
              <span className="text-sm font-bold text-white/50">FCFA{s.typeRecompense === 'POINTS' ? ' → points' : ''}</span>
            </div>
          </div>
          {s.statut === 'ACTIF' && (
            <div className="bg-accent text-primary px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-accent/20">
              Répondre →
            </div>
          )}
        </div>

        {expiry && (
          <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-1.5 text-white/40 text-[11px] font-bold">
            <i className="ti ti-clock text-sm" />
            {expiry}
          </div>
        )}
      </div>

      {/* Decorative circles */}
      <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-8 -top-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
    </button>
  )
}

function SurveyCardCompact({ survey: s, onClick }) {
  const statut = STATUT[s.statut] || STATUT.CLOTURE
  const expiry = formatDate(s.dateExpiration)
  const isActif = s.statut === 'ACTIF'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border-2 border-gray-100 hover:border-primary/30 hover:shadow-md overflow-hidden group active:scale-[0.98] transition-all"
    >
      {/* Image de couverture */}
      {s.imageUrl ? (
        <div className="relative h-24 w-full overflow-hidden">
          <img src={imgUrl(s.imageUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <span className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight border ${statut.cls} bg-white/90`}>
            {statut.label}
          </span>
        </div>
      ) : (
        /* Bande couleur statut si pas d'image */
        <div className={`h-1 w-full ${isActif ? 'bg-success' : 'bg-gray-200'}`} />
      )}

      <div className="p-3 space-y-2.5">
        {/* Icône + badge (si pas d'image) */}
        {!s.imageUrl && (
          <div className="flex items-start justify-between gap-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActif ? 'bg-primary/10' : 'bg-gray-100'}`}>
              <i className={`ti ti-forms text-base ${isActif ? 'text-primary' : 'text-gray-400'}`} />
            </div>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight border shrink-0 ${statut.cls}`}>
              {statut.label}
            </span>
          </div>
        )}

        {/* Titre */}
        <h3 className="font-heading font-bold text-[11px] text-primary leading-tight line-clamp-2 min-h-[2.4em]">{s.titre}</h3>

        {/* Récompense */}
        <div className="flex items-baseline gap-1">
          <span className="text-base font-heading font-extrabold text-accent tabular-nums leading-none">{fmt(s.recompense)}</span>
          <span className="text-[9px] font-bold text-gray-400">FCFA{s.typeRecompense === 'POINTS' ? ' → pts' : ''}</span>
        </div>

        {/* Expiry */}
        {expiry && (
          <p className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
            <i className="ti ti-clock text-[10px]" />{expiry}
          </p>
        )}
      </div>
    </button>
  )
}

function SurveyCard({ survey: s, onClick }) {
  const statut = STATUT[s.statut] || STATUT.CLOTURE
  const expiry = formatDate(s.dateExpiration)
  const pct = s.quotaVise ? Math.min(100, Math.round((s.repondantsActuels / s.quotaVise) * 100)) : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-primary/20 shadow-sm active:scale-[0.98] transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-11 h-11 bg-primary/5 rounded-xl flex items-center justify-center">
          <i className="ti ti-forms text-xl text-primary" />
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-tight ${statut.cls}`}>
          {statut.label}
        </span>
      </div>

      <h3 className="font-heading font-bold text-sm text-primary leading-tight mb-2 line-clamp-2">{s.titre}</h3>
      {s.description && (
        <p className="text-xs text-gray-400 font-medium line-clamp-2 mb-4">{s.description}</p>
      )}

      <div className="flex items-baseline gap-1.5 mb-4">
        <span className="text-2xl font-heading font-extrabold text-accent">{fmt(s.recompense)}</span>
        <span className="text-xs font-bold text-gray-400">FCFA{s.typeRecompense === 'POINTS' ? ' → pts' : ''}</span>
      </div>

      {pct !== null && (
        <div className="mb-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
            <span>{s.repondantsActuels}/{s.quotaVise} répondants</span>
            <span>{pct}%</span>
          </div>
        </div>
      )}

      {expiry && (
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
          <i className="ti ti-clock text-xs" />
          {expiry}
        </div>
      )}
    </button>
  )
}
