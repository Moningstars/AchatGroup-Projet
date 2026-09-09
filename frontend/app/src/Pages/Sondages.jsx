import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { getSondages, getBannieres, imgUrl } from '../services/api'
import PageCarousel from '../components/PageCarousel'
import CountdownClock from '../components/CountdownClock'
import { useSSE } from '../hooks/useSSE'
import { formatMontant as fmt } from '../utils/format'

const STATUT = {
  ACTIF: { label: 'Ouvert', cls: 'bg-success/15 text-success border-success/20' },
  EN_ATTENTE: { label: 'En attente', cls: 'bg-accent/15 text-accent border-accent/20' },
  EN_ATTENTE_DISTRIBUTION: { label: 'En validation', cls: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  CLOTURE: { label: 'Clôturé', cls: 'bg-gray-100 text-gray-400 border-gray-200' },
}
const GRID_LIMIT = 10 // 5 col × 2 lignes
const SURVEY_FALLBACK_IMAGES = ['/hero/slide-2.jpg', '/hero/slide-3.jpg', '/hero/slide-4.jpg']

function surveyImage(survey) {
  if (survey?.imageUrl) return imgUrl(survey.imageUrl)
  const key = String(survey?.id || survey?.titre || 'sondage')
  const index = [...key].reduce((total, char) => total + char.charCodeAt(0), 0) % SURVEY_FALLBACK_IMAGES.length
  return SURVEY_FALLBACK_IMAGES[index]
}
function useFallbackImage(event) {
  const image = event.currentTarget
  if (image.dataset.fallbackApplied === 'true') return
  image.dataset.fallbackApplied = 'true'
  image.src = '/hero/slide-2.jpg'
}

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
        id: b.id,
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

  const gridItems = [...actifs, ...autres]
  const visibleGrid = gridItems.slice(0, page * GRID_LIMIT)
  const hasMore = gridItems.length > page * GRID_LIMIT

  return (
    <div className="min-h-screen bg-bg-light pb-28 selection:bg-accent/30 overflow-x-hidden">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 glass-header border-b border-gray-100/70 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-heading font-extrabold text-xl tracking-tight text-primary leading-none">Miitchs insight</h1>
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

      <div className="mx-auto w-full max-w-7xl xl:max-w-[85%] px-4 sm:px-6 lg:px-8">

        {/* ── Carousel promo ── */}
        <div className="pt-5">
          {slides.length > 0 && <PageCarousel slides={slides} />}
        </div>

        {/* ── Search ── */}
        <div className="space-y-3 py-4 sm:space-y-4 sm:py-5">
          <div>
            <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm sm:rounded-2xl">
              <i className="ti ti-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Thème, récompense..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent py-3 pl-11 pr-4 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-primary/20 sm:py-3.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[['TOUS', 'Toutes les récompenses'], ['ARGENT', 'Rénuméré'], ['POINTS', 'Points']].map(([value, label]) => (
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
              {search || rewardFilter !== 'TOUS' ? 'Aucun résultat' : 'Aucun Miitch i disponible'}
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
            {/* Toutes les Miitchs insight utilisent désormais le même format compact. */}
            {gridItems.length > 0 && (
              <section className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
function SurveyCardCompact({ survey: s, onClick }) {
  const statut = STATUT[s.statut] || STATUT.CLOTURE

  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/3] w-full overflow-hidden border border-white/15 bg-primary text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
    >
      <img
        src={surveyImage(s)}
        alt=""
        onError={useFallbackImage}
        className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-500 group-hover:scale-105 group-hover:opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/35 via-primary/55 to-primary/95" />

      <div className="relative z-10 flex h-full flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <span className={`border px-2 py-1 text-[8px] font-black uppercase tracking-wider backdrop-blur-sm ${statut.cls} bg-white/90`}>
            {statut.label}
          </span>
          {s.repondantsActuels > 0 && (
            <span className="text-[9px] font-bold text-white/70">{s.repondantsActuels} rép.</span>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <h3 className="line-clamp-2 font-heading text-xs font-black leading-tight text-white sm:text-[13px]">{s.titre}</h3>

          <div className="flex items-end justify-between gap-2 border-t border-white/15 pt-2">
            <div className="min-w-0">
              <span className="block text-[8px] font-bold uppercase tracking-widest text-white/55">Récompense</span>
              <span className="font-heading text-base font-black leading-none text-accent tabular-nums">{fmt(s.recompense)}</span>
              <span className="ml-1 text-[8px] font-bold text-white/65">FCFA{s.typeRecompense === 'POINTS' ? ' → pts' : ''}</span>
            </div>
            <CountdownClock dateExpiration={s.dateExpiration} compact className="shrink-0" />
          </div>
        </div>
      </div>
    </button>
  )
}
