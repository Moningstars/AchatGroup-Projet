import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Loader2, Search, SlidersHorizontal, Tags } from 'lucide-react'
import { getOpportunites, getBannieres, imgUrl } from '../services/api'
import ProductCard from '../components/ProductCard'
import PageCarousel from '../components/PageCarousel'
import { useSSE } from '../hooks/useSSE'

const CATS = [
  'Tout', 'Mode', 'Électronique', 'Alimentaire', 'Maison',
  'Beauté', 'Informatique', 'Véhicules', 'Mobilier', 'Sport'
]

const TRIS = [
  { label: 'Les plus récentes', value: 'recent' },
  { label: 'Prix croissant',    value: 'prix_asc' },
  { label: 'Prix décroissant',  value: 'prix_desc' },
  { label: 'Expire bientôt',    value: 'expiration' },
  { label: 'Plus populaires',   value: 'participants' },
]

// 5 colonnes desktop × 2 lignes = 10 items par page (scroll infini)
const PAGE_SIZE = 10

function CatalogueSelect({ label, value, options, onChange, icon: Icon }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = options.find(option => option.value === value) || options[0]

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-bg-light px-4 py-3 text-left transition-all ${
          open ? 'border-primary shadow-[0_0_0_4px_rgba(5,71,108,0.08)]' : 'border-gray-100 hover:border-primary/30'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-wider text-primary">
          {selected.label}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-2xl shadow-primary/15"
        >
          {options.map(option => {
            const active = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                  active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-bg-light hover:text-primary'
                }`}
              >
                <span className="flex-1">{option.label}</span>
                {active && <Check size={15} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Catalogue() {
  const location = useLocation()
  const [opportunites, setOpportunites] = useState([])
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(true)
  const [search, setSearch] = useState(location.state?.search || '')
  const [serverSearch, setServerSearch] = useState(location.state?.search || '')
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('cat') ?? location.state?.category ?? 'Tout'
  const initialCategories = Array.isArray(location.state?.categories)
    ? location.state.categories
    : initialCategory === 'Tout' ? [] : [initialCategory]
  const [selectedCategories, setSelectedCategories] = useState(initialCategories)
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
  const selectedCategoryValue = selectedCategories[0] || 'Tout'

  const resetFilters = () => {
    setSearch('')
    setServerSearch('')
    setSelectedCategories([])
    setTri('recent')
    setPage(1)
  }

  const selectMainCategory = (cat) => {
    setSearching(true)
    setSelectedCategories(cat === 'Tout' ? [] : [cat])
    setPage(1)
  }

  const handleSearch = (value) => {
    setSearching(true)
    setSearch(value)
    setPage(1)
  }

  const selectSort = (value) => {
    setTri(value)
    setPage(1)
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
              onChange={e => handleSearch(e.target.value)}
              className="w-full bg-bg-light border-2 border-gray-100 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
            {searching ? 'Recherche…' : `${filtered.length} offre${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-0 pt-6 space-y-6 pb-8">

        {/* ── Carousel promo ── */}
        {slides.length > 0 && <PageCarousel slides={slides} />}

        {/* Recherche mobile */}
        <div className="relative sm:hidden">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold focus:border-primary focus:outline-none transition-all shadow-sm"
          />
        </div>

        {/* Barre catalogue e-commerce */}
        <div className="relative z-30 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <p className="font-heading text-sm font-black text-primary">Affiner les opportunités</p>
              <p className="mt-1 text-[11px] font-semibold text-gray-400">
                Choisissez une catégorie, puis l’ordre d’affichage.
              </p>
            </div>
            {(selectedCategories.length > 0 || tri !== 'recent') && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-primary"
              >
                Réinitialiser
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogueSelect
              label="Filtrer par catégorie"
              value={selectedCategoryValue}
              options={CATS.map(cat => ({
                value: cat,
                label: cat === 'Tout' ? 'Toutes les catégories' : cat,
              }))}
              onChange={selectMainCategory}
              icon={Tags}
            />
            <CatalogueSelect
              label="Trier les résultats"
              value={tri}
              options={TRIS}
              onChange={selectSort}
              icon={SlidersHorizontal}
            />
          </div>
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
