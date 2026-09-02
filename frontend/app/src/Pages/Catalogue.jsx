import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Filter, Loader2, Search, X } from 'lucide-react'
import { getOpportunites, getBannieres, imgUrl } from '../services/api'
import ProductCard from '../components/ProductCard'
import PageCarousel from '../components/PageCarousel'
import { useSSE } from '../hooks/useSSE'

const CATS = [
  'Tout', 'Mode', 'Électronique', 'Alimentaire', 'Maison',
  'Beauté', 'Informatique', 'Véhicules', 'Mobilier', 'Sport'
]

const QUICK_CATS = ['Tout', 'Mode', 'Électronique', 'Véhicules', 'Maison']

const TRIS = [
  { label: 'Les plus récentes', value: 'recent' },
  { label: 'Prix croissant',    value: 'prix_asc' },
  { label: 'Prix décroissant',  value: 'prix_desc' },
  { label: 'Expire bientôt',    value: 'expiration' },
  { label: 'Plus populaires',   value: 'participants' },
]

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

// 5 colonnes desktop × 2 lignes = 10 items par page (scroll infini)
const PAGE_SIZE = 10

export default function Catalogue() {
  const navigate = useNavigate()
  const location = useLocation()
  const [opportunites, setOpportunites] = useState([])
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [search, setSearch] = useState(location.state?.search || '')
  const [serverSearch, setServerSearch] = useState(location.state?.search || '')
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('cat') ?? location.state?.category ?? 'Tout'
  const initialCategories = Array.isArray(location.state?.categories)
    ? location.state.categories
    : initialCategory === 'Tout' ? [] : [initialCategory]
  const [selectedCategories, setSelectedCategories] = useState(initialCategories)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tri, setTri] = useState('recent')
  const [page, setPage] = useState(1)
  const sentinelRef = useRef(null)

  useEffect(() => {
    getBannieres('CATALOGUE')
      .then(data => setSlides(data.map(b => ({
        img: imgUrl(b.imageUrl),
        tag: b.tag,
        icon: b.icone,
        title: b.titre,
        desc: b.description,
        lien: b.lien,
      }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setServerSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setSearching(true)
    getOpportunites({
      q: serverSearch || undefined,
      categories: selectedCategories.length ? selectedCategories : undefined,
    })
      .then(data => { if (!cancelled) setOpportunites(data) })
      .catch(() => { if (!cancelled) setOpportunites([]) })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setSearching(false)
        }
      })
    return () => { cancelled = true }
  }, [serverSearch, selectedCategories])

  useEffect(() => { setPage(1) }, [selectedCategories, search, tri])

  // Compteurs/prix/statut mis à jour en direct pour toutes les opportunités affichées
  useSSE('opportunites', {
    COMPTEUR: ({ id, participantsActuels, prixActuel }) => {
      setOpportunites(prev => prev.map(op => op.id === id ? { ...op, participantsActuels, prixActuel } : op))
    },
    STATUT: ({ id, statut }) => {
      setOpportunites(prev => prev.map(op => op.id === id ? { ...op, statut } : op))
    },
  })

  const filtered = useMemo(() => {
    let list = [...opportunites]
    switch (tri) {
      case 'prix_asc':     list = [...list].sort((a, b) => Number(a.prixActuel) - Number(b.prixActuel)); break
      case 'prix_desc':    list = [...list].sort((a, b) => Number(b.prixActuel) - Number(a.prixActuel)); break
      case 'expiration':   list = [...list].filter(o => o.dateExpiration).sort((a, b) => new Date(a.dateExpiration) - new Date(b.dateExpiration)); break
      case 'participants': list = [...list].sort((a, b) => (b.participantsActuels || 0) - (a.participantsActuels || 0)); break
      default: break
    }
    return list
  }, [opportunites, tri])

  const visibleItems = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > page * PAGE_SIZE
  const actives = opportunites.filter(o => o.statut === 'ACTIVE').length
  const triActif = TRIS.find(t => t.value === tri)?.label ?? 'Les plus récentes'

  const toggleCategory = (cat) => {
    if (cat === 'Tout') {
      setSelectedCategories([])
      return
    }
    setSelectedCategories(prev => prev.includes(cat)
      ? prev.filter(c => c !== cat)
      : [...prev, cat]
    )
  }

  const resetFilters = () => {
    setSearch('')
    setServerSearch('')
    setSelectedCategories([])
    setTri('recent')
  }

  // Scroll infini : charge le lot suivant dès que la sentinelle approche du viewport
  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setPage(p => p + 1) },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, page])

  return (
    <div className="min-h-screen bg-bg-light pb-28 selection:bg-accent/30">

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-40 glass-header border-b border-gray-100 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-heading font-extrabold text-lg text-primary leading-none">Opportunités</h1>
              <p className="text-[11px] text-success font-bold uppercase tracking-widest mt-0.5">
                {actives} active{actives !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="relative flex-1 max-w-sm hidden sm:block">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une offre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg-light border-2 border-gray-100 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
            {searching ? 'Recherche…' : `${filtered.length} offre${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-0 pt-6 space-y-6 pb-8">

        {/* ── Carousel promo ── */}
        {slides.length > 0 && <PageCarousel slides={slides} />}

        {/* Recherche mobile */}
        <div className="relative sm:hidden">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold focus:border-primary focus:outline-none transition-all shadow-sm"
          />
        </div>

        {/* Filtres catégories */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_CATS.map(cat => {
              const active = cat === 'Tout' ? selectedCategories.length === 0 : selectedCategories.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                    active
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white text-gray-500 border border-gray-100 hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  {cat}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setFiltersOpen(v => !v)}
              className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                filtersOpen || selectedCategories.length > 0
                  ? 'bg-accent text-primary border border-primary/10'
                  : 'bg-white text-gray-500 border border-gray-100 hover:border-primary/30 hover:text-primary'
              }`}
            >
              <Filter size={14} />
              Filtres
              {selectedCategories.length > 0 && (
                <span className="rounded-full bg-primary text-white px-1.5 py-0.5 text-[9px]">
                  {selectedCategories.length}
                </span>
              )}
            </button>
          </div>

          {filtersOpen && (
            <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Filtrer les catégories</p>
                  <p className="text-[11px] text-gray-400 font-bold mt-1">
                    Cochez une ou plusieurs familles. Les 5 raccourcis restent visibles pour les choix fréquents.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="h-8 w-8 rounded-full bg-bg-light text-gray-400 hover:text-primary flex items-center justify-center"
                  aria-label="Fermer les filtres"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {CATS.filter(c => c !== 'Tout').map(cat => {
                  const checked = selectedCategories.includes(cat)
                  return (
                    <label
                      key={cat}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-black uppercase tracking-wide cursor-pointer transition-all ${
                        checked
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-gray-100 bg-bg-light text-gray-500 hover:border-primary/30 hover:text-primary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat)}
                        className="sr-only"
                      />
                      <span className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                        checked ? 'border-white bg-white text-primary' : 'border-gray-300'
                      }`}>
                        {checked && <i className="ti ti-check text-[11px]" />}
                      </span>
                      {cat}
                    </label>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] font-bold text-gray-400">
                  {selectedCategories.length === 0
                    ? 'Toutes les catégories sont incluses.'
                    : `${selectedCategories.length} catégorie${selectedCategories.length > 1 ? 's' : ''} sélectionnée${selectedCategories.length > 1 ? 's' : ''}.`}
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tri */}
        <div className="flex flex-col gap-2 rounded-3xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Trier les offres</p>
            <p className="text-sm font-heading font-extrabold text-primary">{triActif}</p>
          </div>
          <select
            value={tri}
            onChange={e => setTri(e.target.value)}
            className="w-full rounded-2xl border-2 border-gray-100 bg-bg-light px-4 py-3 text-xs font-black uppercase tracking-widest text-primary outline-none transition-all focus:border-primary sm:w-64"
          >
            {TRIS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Grille */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={36} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center bg-white border-4 border-dashed border-gray-50 flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <i className="ti ti-mood-sad text-5xl text-gray-200" />
            </div>
            <p className="text-gray-400 font-heading font-bold text-xl">Aucune offre trouvée</p>
            <button
              onClick={resetFilters}
              className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              Réinitialiser
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3">
              {visibleItems.map(op => <ProductCard key={op.id} opportunity={op} />)}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                <Loader2 size={22} className="animate-spin text-primary/40" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
