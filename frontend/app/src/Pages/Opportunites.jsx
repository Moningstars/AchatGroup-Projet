import { useEffect, useMemo, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getOpportunites, getSondages, getBannieres, imgUrl } from '../services/api'
import ProductCard from '../components/ProductCard'
import { useSSE } from '../hooks/useSSE'

const CATS = [
  'Tout', 'Mode', 'Électronique', 'Alimentaire', 'Maison',
  'Beauté', 'Informatique', 'Véhicules', 'Mobilier', 'Sport'
]

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }
function formatDate(dt) {
  if (!dt) return null
  const d = new Date(dt)
  const diff = Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return null
  if (diff <= 7) return `${diff}j restants`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const HERO_SLIDES = [
  {
    tag: 'Achat Groupé',
    icon: 'ti-users-group',
    title: ['L\'union', 'fait le prix.'],
    accentCls: 'text-accent',
    desc: 'Regroupez-vous avec d\'autres acheteurs et accédez aux tarifs de gros. Plus on est nombreux, plus on économise.',
    stat: null,
    cta: { label: 'Voir les offres', anchor: true },
    bg: '/hero/slide-1.jpg',
  },
  {
    tag: 'Sondages Rémunérés',
    icon: 'ti-clipboard-check',
    title: ['Répondez.', 'Encaissez.'],
    accentCls: 'text-accent',
    desc: 'Donnez votre avis sur des produits et services, et recevez une récompense directement dans votre portefeuille.',
    stat: { value: '500 – 5 000', unit: 'FCFA', label: 'par sondage complété' },
    cta: { label: 'Voir les sondages', path: '/sondages' },
    bg: '/hero/slide-2.jpg',
  },
  {
    tag: 'Portefeuille Intégré',
    icon: 'ti-wallet',
    title: ['Vos gains,', 'votre contrôle.'],
    accentCls: 'text-success',
    desc: 'Rechargez votre solde, financez vos achats groupés, retirez vos récompenses — tout depuis une seule application.',
    stat: { value: null, unit: null, label: 'Retraits disponibles 24h/24' },
    cta: { label: 'Mon portefeuille', path: '/portefeuille' },
    bg: '/hero/slide-3.jpg',
  },
  {
    tag: 'Communauté',
    icon: 'ti-planet',
    title: ['Plus on est,', 'moins on paie.'],
    accentCls: 'text-accent',
    desc: 'Rejoignez une communauté d\'acheteurs engagés en Afrique de l\'Ouest et faites valoir votre pouvoir collectif.',
    stat: null,
    cta: { label: 'Rejoindre la communauté', path: '/connexion' },
    bg: '/hero/slide-4.jpg',
  },
]

export default function Opportunites() {
  const [opportunites, setOpportunites] = useState([])
  const [sondages, setSondages] = useState([])
  const [heroSlides, setHeroSlides] = useState(HERO_SLIDES)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [slide, setSlide] = useState(0)
  const [visible, setVisible] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const id = location.state?.scrollTo
    if (!id) return
    const el = document.getElementById(id)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 120)
  }, [location.state?.scrollTo])

  const goToSlide = useCallback((idx) => {
    setVisible(false)
    setTimeout(() => {
      setSlide(idx)
      setVisible(true)
    }, 300)
  }, [])

  useEffect(() => {
    getBannieres('ACCUEIL')
      .then(data => {
        if (data.length > 0) {
          setHeroSlides(data.map(b => ({
            tag: b.tag || '',
            icon: b.icone || 'ti-star',
            title: [b.titre, ''],
            accentCls: 'text-accent',
            desc: b.description || '',
            stat: null,
            cta: { label: 'En savoir plus', path: b.lien || '/opportunites' },
            bg: imgUrl(b.imageUrl),
          })))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    heroSlides.forEach(s => { const img = new Image(); img.src = s.bg })
  }, [heroSlides])

  useEffect(() => {
    const id = setInterval(() => {
      goToSlide((prev) => (prev + 1) % heroSlides.length)
    }, 4500)
    return () => clearInterval(id)
  }, [goToSlide, heroSlides.length])

  useEffect(() => {
    Promise.all([
      getOpportunites().catch(() => []),
      getSondages().catch(() => []),
    ]).then(([ops, sonds]) => {
      setOpportunites(ops)
      setSondages(sonds.filter(s => s.statut === 'ACTIF'))
    }).finally(() => setLoading(false))
  }, [])

  // Compteurs/prix/statut mis à jour en direct
  useSSE('opportunites', {
    COMPTEUR: ({ id, participantsActuels, prixActuel }) => {
      setOpportunites(prev => prev.map(op => op.id === id ? { ...op, participantsActuels, prixActuel } : op))
    },
    STATUT: ({ id, statut }) => {
      setOpportunites(prev => prev.map(op => op.id === id ? { ...op, statut } : op))
    },
  })
  useSSE('sondages', {
    COMPTEUR: ({ id, repondantsActuels }) => {
      setSondages(prev => prev.map(s => s.id === id ? { ...s, repondantsActuels } : s))
    },
    STATUT: ({ id, statut }) => {
      setSondages(prev => prev.map(s => s.id === id ? { ...s, statut } : s).filter(s => s.statut === 'ACTIF'))
    },
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return opportunites
    const q = search.toLowerCase()
    return opportunites.filter(op =>
      op.titre?.toLowerCase().includes(q) || op.description?.toLowerCase().includes(q)
    )
  }, [opportunites, search])

  const expirantBientot = useMemo(() => opportunites
    .filter(o => o.dateExpiration && o.statut === 'ACTIVE')
    .sort((a, b) => new Date(a.dateExpiration) - new Date(b.dateExpiration))
  , [opportunites])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-heading font-extrabold text-primary text-sm uppercase tracking-widest animate-pulse">
            OpportuniHub se prépare...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-light selection:bg-accent/30 pb-28">

      {/* ── Hero Carousel — pleine largeur ── */}
      <div className="relative overflow-hidden rounded-none md:rounded-2xl h-[280px] sm:h-[380px] md:h-[540px] md:mx-8 lg:mx-16">

            {/* Background images — crossfade indépendant du contenu */}
            {heroSlides.map((s, i) => (
              <div
                key={i}
                className="absolute inset-0 bg-cover bg-center sm:bg-top"
                style={{ backgroundImage: `url(${s.bg})`, opacity: i === slide ? 1 : 0, transition: 'opacity 0.4s ease' }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/25" />

            {/* Contenu — position absolue pour ne jamais faire bouger le conteneur */}
            <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-8 md:p-16"
              style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.35s ease, transform 0.35s ease' }}
            >
              {/* Haut : tag + titre + description */}
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 sm:mb-8 border border-white/15">
                  <i className={`ti ${heroSlides[slide].icon}`} />
                  <span>{heroSlides[slide].tag}</span>
                </div>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-heading font-black text-white leading-[1.05] mb-4 sm:mb-6 tracking-tighter">
                  {heroSlides[slide].title[0]}<br />
                  <span className={heroSlides[slide].accentCls}>{heroSlides[slide].title[1]}</span>
                </h1>
                <p className="text-white/60 text-sm sm:text-base md:text-lg max-w-md leading-relaxed line-clamp-2 sm:line-clamp-none">
                  {heroSlides[slide].desc}
                </p>
              </div>

              {/* Bas : stat + CTA + dots */}
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div className="h-16 flex flex-col justify-end">
                  {heroSlides[slide].stat?.value ? (
                    <>
                      <span className="block text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                        {heroSlides[slide].stat.label}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl md:text-4xl font-heading font-black text-white tracking-tighter tabular-nums">
                          {heroSlides[slide].stat.value}
                        </span>
                        <span className="text-lg font-bold text-accent font-heading">{heroSlides[slide].stat.unit}</span>
                      </div>
                    </>
                  ) : heroSlides[slide].stat ? (
                    <div className="flex items-center gap-2 text-white/55 text-sm font-bold">
                      <i className="ti ti-check-circle text-success text-lg" />
                      {heroSlides[slide].stat.label}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-4">
                  <button
                    onClick={() => heroSlides[slide].cta.anchor
                      ? document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })
                      : navigate(heroSlides[slide].cta.path)}
                    className="bg-accent text-primary px-5 sm:px-8 py-3 sm:py-4 rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl shadow-black/30 hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {heroSlides[slide].cta.label}
                    <i className="ti ti-arrow-right" />
                  </button>

                  <div className="flex items-center gap-2">
                    {heroSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`rounded-full transition-all duration-300 ${i === slide ? 'w-7 h-2 bg-accent' : 'w-2 h-2 bg-white/30 hover:bg-white/60'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
      </div>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-0 pt-8 space-y-10">

        {/* ── Expire bientôt ── */}
        {expirantBientot.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-urgency/10 rounded-xl flex items-center justify-center">
                  <i className="ti ti-clock-hour-4 text-urgency text-lg" />
                </div>
                <div>
                  <h2 className="font-heading font-black text-xl text-primary tracking-tight leading-none">Dernière chance</h2>
                  <p className="text-[11px] text-urgency font-bold uppercase tracking-widest mt-0.5">{expirantBientot.length} offre{expirantBientot.length > 1 ? 's' : ''} qui expirent bientôt</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-300 font-bold">
                  <i className="ti ti-arrows-left-right" /> défiler
                </span>
                <Link to="/opportunites" state={{ category: 'Tout' }} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1">
                  Voir tout <i className="ti ti-arrow-right" />
                </Link>
              </div>
            </div>

            {/* Liste scrollable horizontalement */}
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
                {expirantBientot.map(op => {
                  const diff = op.dateExpiration
                    ? Math.ceil((new Date(op.dateExpiration) - Date.now()) / (1000 * 60 * 60 * 24))
                    : null
                  const urgent = diff !== null && diff <= 2
                  const progress = op.seuilMinimum > 0
                    ? Math.min(100, Math.round((op.participantsActuels / op.seuilMinimum) * 100)) : 0
                  const heroImg = op.images?.[0]?.url
                    ? imgUrl(op.images[0].url)
                    : `https://picsum.photos/seed/${op.id}/400/300`
                  const discount = op.prixNormal && Number(op.prixNormal) > Number(op.prixActuel)
                    ? Math.round((1 - Number(op.prixActuel) / Number(op.prixNormal)) * 100) : null

                  return (
                    <Link
                      key={op.id}
                      to={`/opportunity/${op.id}`}
                      className="snap-start shrink-0 w-56 text-left bg-white overflow-hidden border-2 border-gray-100 hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98] group"
                    >
                      {/* Image */}
                      <div className="relative h-32 overflow-hidden">
                        <img src={heroImg} alt={op.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {discount > 0 && (
                            <span className="bg-success text-white text-[9px] font-black px-2 py-0.5 rounded-md">-{discount}%</span>
                          )}
                        </div>

                        {/* Countdown */}
                        {diff !== null && (
                          <span className={`absolute top-2 right-2 text-[10px] font-black px-2 py-1 rounded-lg ${urgent ? 'bg-urgency text-white' : 'bg-black/50 text-white backdrop-blur-sm'}`}>
                            <i className="ti ti-clock mr-1" />
                            {diff === 0 ? 'Auj.' : diff === 1 ? '1j' : `${diff}j`}
                          </span>
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="p-3">
                        <h3 className="font-heading font-bold text-sm text-primary leading-tight line-clamp-2 mb-2">{op.titre}</h3>

                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-base font-heading font-extrabold text-primary tabular-nums">{fmt(op.prixActuel)}</span>
                          <span className="text-[10px] font-bold text-gray-400">FCFA</span>
                          {op.prixNormal && Number(op.prixNormal) > Number(op.prixActuel) && (
                            <span className="text-[10px] text-gray-300 line-through">{fmt(op.prixNormal)}</span>
                          )}
                        </div>

                        {/* Progression */}
                        <div className="space-y-1">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${urgent ? 'bg-urgency' : 'bg-success'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] font-black text-gray-400">
                            <span>{op.participantsActuels}/{op.seuilMinimum} participants</span>
                            <span className={urgent ? 'text-urgency' : 'text-success'}>{progress}%</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Fondu droite */}
              <div className="absolute top-0 right-0 bottom-3 w-16 bg-gradient-to-l from-bg-light to-transparent pointer-events-none" />
            </div>
          </section>
        )}

        {/* ── Catégories + Recherche ── */}
        <section className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {CATS.map((cat, i) => (
              <span key={cat} className="flex items-center shrink-0">
                <Link
                  to="/opportunites"
                  state={{ category: cat }}
                  className="text-sm font-bold text-gray-400 hover:text-primary transition-colors px-1 py-0.5"
                >
                  {cat}
                </Link>
                {i < CATS.length - 1 && <span className="text-gray-200 mx-1 select-none">·</span>}
              </span>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs shrink-0 group">
            <i className="ti ti-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-primary font-bold text-sm transition-all shadow-sm"
            />
          </div>
        </section>

        {/* ── Product Grid ── */}
        <section id="catalogue" className="space-y-6">
          {filtered.length === 0 ? (
            <div className="py-24 text-center bg-white border-4 border-dashed border-gray-50 flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <i className="ti ti-mood-sad text-5xl text-gray-200" />
              </div>
              <p className="text-gray-400 font-heading font-bold text-xl">Aucune offre trouvée</p>
              <button
                onClick={() => setSearch('')}
                className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                Réinitialiser
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3">
                {filtered.slice(0, 10).map(op => <ProductCard key={op.id} opportunity={op} />)}
              </div>

              {filtered.length > 10 && (
                <div className="flex justify-center pt-2">
                  <Link
                    to="/opportunites"
                    className="flex items-center gap-2 bg-white border-2 border-gray-100 text-primary font-black uppercase text-[11px] tracking-widest px-8 py-3.5 rounded-2xl hover:border-primary transition-all active:scale-95 shadow-sm"
                  >
                    <i className="ti ti-layout-grid" />
                    Voir plus ({filtered.length - 10} offres restantes)
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Surveys Teaser ── */}
        {sondages.length > 0 && (
          <section className="space-y-8 pt-8 border-t-2 border-gray-100">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl md:text-4xl font-heading font-black text-primary tracking-tight">
                  Répondez &amp; Gagnez
                </h2>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">
                  Cash instantané dans votre wallet
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-300 font-bold">
                  <i className="ti ti-arrows-left-right" /> défiler
                </span>
                <button
                  onClick={() => navigate('/sondages')}
                  className="bg-white border-2 border-gray-100 text-primary font-black uppercase text-[10px] tracking-widest px-6 py-3.5 rounded-2xl hover:border-primary transition-all active:scale-95"
                >
                  Voir Tout
                </button>
              </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-3 snap-x scrollbar-thin">
              {sondages.slice(0, 4).map(s => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/sondages/${s.id}`)}
                  className="min-w-[300px] md:min-w-[380px] snap-start text-left bg-primary p-8 border-2 border-primary shadow-2xl shadow-primary/20 group relative overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="relative z-10 flex flex-col h-full justify-between min-h-[200px]">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <span className="bg-accent text-primary px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          Sondage
                        </span>
                        {formatDate(s.dateExpiration) && (
                          <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                            {formatDate(s.dateExpiration)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-heading font-black text-white mb-3 leading-tight line-clamp-2">
                        {s.titre}
                      </h3>
                    </div>
                    <div className="flex items-end justify-between pt-4 border-t border-white/10">
                      <div>
                        <span className="text-success text-[10px] font-black uppercase tracking-widest block mb-1">
                          Récompense
                        </span>
                        <span className="text-3xl font-heading font-black text-white tracking-tight">
                          {fmt(s.recompense)} <span className="text-sm font-bold text-white/40">FCFA</span>
                        </span>
                      </div>
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-accent transition-colors">
                        <i className="ti ti-player-play-filled text-xl text-primary ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-10 -bottom-10 opacity-[0.04] pointer-events-none">
                    <i className="ti ti-gift text-[200px] text-white" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
        {/* ── Qui sommes-nous ? ── */}
        <section id="qui-sommes-nous" className="scroll-mt-24">
          <div className="bg-primary overflow-hidden">
            <div className="px-10 md:px-16 pt-14 pb-10">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-white/10">
                <i className="ti ti-info-circle" /> À propos
              </div>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl md:text-5xl font-heading font-black text-white leading-tight tracking-tighter mb-6">
                    L'achat groupé<br /><span className="text-accent">réinventé</span> pour<br />l'Afrique de l'Ouest.
                  </h2>
                  <p className="text-white/60 text-base leading-relaxed mb-8">
                    OpportuniHub est la première plateforme collaborative d'achat groupé et de sondages rémunérés en Afrique de l'Ouest. Notre mission : donner à chaque consommateur le pouvoir de négocier comme un professionnel.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['Togo', 'Bénin', 'Côte d\'Ivoire', 'Sénégal'].map(p => (
                      <span key={p} className="bg-white/10 text-white/70 px-4 py-2 rounded-xl text-xs font-bold border border-white/10">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { icon: 'ti-users-group', titre: 'Force collective', desc: 'Plus on est nombreux, plus les prix baissent. Rejoignez un groupe et accédez aux tarifs de gros réservés aux professionnels.' },
                    { icon: 'ti-clipboard-check', titre: 'Sondages rémunérés', desc: 'Votre avis a de la valeur. Répondez à des sondages et recevez des récompenses directement dans votre portefeuille.' },
                    { icon: 'ti-shield-check', titre: 'Paiement sécurisé', desc: 'Votre argent est protégé jusqu\'à la livraison. Remboursement garanti si l\'achat groupé n\'atteint pas son seuil.' },
                  ].map(v => (
                    <div key={v.titre} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4">
                      <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center shrink-0">
                        <i className={`ti ${v.icon} text-accent text-lg`} />
                      </div>
                      <div>
                        <h3 className="text-white font-heading font-bold text-sm mb-1">{v.titre}</h3>
                        <p className="text-white/50 text-xs leading-relaxed">{v.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section id="contact" className="scroll-mt-24">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Infos */}
            <div className="bg-white p-10 border-2 border-gray-100 space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary/5 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-primary/10">
                  <i className="ti ti-mail" /> Contact
                </div>
                <h2 className="text-3xl font-heading font-black text-primary tracking-tight mb-3">Une question ?<br />On vous répond.</h2>
                <p className="text-gray-400 text-sm leading-relaxed">Notre équipe est disponible du lundi au vendredi, 8h–18h (GMT).</p>
              </div>
              <div className="space-y-4">
                {[
                  { icon: 'ti-mail', label: 'Email', value: 'contact@opportunihub.com' },
                  { icon: 'ti-brand-whatsapp', label: 'WhatsApp', value: '+228 90 00 00 00' },
                  { icon: 'ti-map-pin', label: 'Siège', value: 'Lomé, Togo' },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                      <i className={`ti ${c.icon} text-primary text-lg`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.label}</p>
                      <p className="text-sm font-bold text-primary">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                {[
                  { icon: 'ti-brand-facebook', href: '#' },
                  { icon: 'ti-brand-instagram', href: '#' },
                  { icon: 'ti-brand-x', href: '#' },
                  { icon: 'ti-brand-linkedin', href: '#' },
                ].map(s => (
                  <a key={s.icon} href={s.href} className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                    <i className={`ti ${s.icon} text-lg`} />
                  </a>
                ))}
              </div>
            </div>

            {/* Formulaire */}
            <div className="bg-white p-10 border-2 border-gray-100 space-y-5">
              <h3 className="font-heading font-black text-xl text-primary">Envoyer un message</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.15em] block mb-1.5">Prénom</label>
                    <input type="text" placeholder="Jean" className="w-full bg-bg-light border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.15em] block mb-1.5">Nom</label>
                    <input type="text" placeholder="Mensah" className="w-full bg-bg-light border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.15em] block mb-1.5">Email</label>
                  <input type="email" placeholder="jean@exemple.com" className="w-full bg-bg-light border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.15em] block mb-1.5">Message</label>
                  <textarea rows={4} placeholder="Votre message..." className="w-full bg-bg-light border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:outline-none transition-all resize-none" />
                </div>
                <button className="w-full bg-primary text-white py-3.5 rounded-xl font-heading font-black text-sm uppercase tracking-widest hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <i className="ti ti-send" /> Envoyer
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
