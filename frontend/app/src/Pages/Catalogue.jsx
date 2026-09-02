import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
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

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

// 5 colonnes desktop × 2 lignes = 10 items par page (scroll infini)
const PAGE_SIZE = 10

export default function Catalogue() {
  const navigate = useNavigate()
  const location = useLocation()
  const [opportunites, setOpportunites] = useState([])
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(location.state?.search || '')
  const [searchParams] = useSearchParams()
  const activeCategory = searchParams.get('cat') ?? location.state?.category ?? 'Tout'
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
    getOpportunites()
      .then(setOpportunites)
      .catch(() => setOpportunites([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { setPage(1) }, [activeCategory, search, tri])

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
    let list = opportunites.filter(op => {
      const catMatch = activeCategory === 'Tout' || op.categorie === activeCategory
      const q = search.toLowerCase()
      const textMatch = !q || op.titre?.toLowerCase().includes(q) || op.description?.toLowerCase().includes(q)
      return catMatch && textMatch
    })
    switch (tri) {
      case 'prix_asc':     list = [...list].sort((a, b) => Number(a.prixActuel) - Number(b.prixActuel)); break
      case 'prix_desc':    list = [...list].sort((a, b) => Number(b.prixActuel) - Number(a.prixActuel)); break
      case 'expiration':   list = [...list].filter(o => o.dateExpiration).sort((a, b) => new Date(a.dateExpiration) - new Date(b.dateExpiration)); break
      case 'participants': list = [...list].sort((a, b) => (b.participantsActuels || 0) - (a.participantsActuels || 0)); break
      default: break
    }
    return list
  }, [opportunites, activeCategory, search, tri])

  const visibleItems = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > page * PAGE_SIZE
  const actives = opportunites.filter(o => o.statut === 'ACTIVE').length

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
            <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une offre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg-light border-2 border-gray-100 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
            {filtered.length} offre{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-0 pt-6 space-y-6 pb-8">

        {/* ── Carousel promo ── */}
        {slides.length > 0 && <PageCarousel slides={slides} />}

        {/* Recherche mobile */}
        <div className="relative sm:hidden">
          <i className="ti ti-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold focus:border-primary focus:outline-none transition-all shadow-sm"
          />
        </div>

        {/* Filtres catégories */}
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide border-b border-gray-100">
          {CATS.map(cat => (
            <Link
              key={cat}
              to={`?cat=${encodeURIComponent(cat)}`}
              className={`flex-shrink-0 pb-3 text-[11px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-gray-400 hover:text-primary border-b-2 border-transparent -mb-px'
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Tri */}
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0 pb-3">Trier :</span>
          {TRIS.map(t => (
            <button
              key={t.value}
              onClick={() => setTri(t.value)}
              className={`flex-shrink-0 pb-3 text-[11px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                tri === t.value
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-gray-400 hover:text-primary border-b-2 border-transparent -mb-px'
              }`}
            >
              {t.label}
            </button>
          ))}
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
              onClick={() => { setSearch(''); setActiveCategory('Tout') }}
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
