import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ShieldCheck, Users, Loader2, ChevronRight, CheckCircle2, AlertCircle, Layers, Sparkles, Timer, Minus, Plus
} from 'lucide-react'
import { getOpportunite, getOpportunites, souscrire, imgUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useCountdown } from '../hooks/useCountdown'
import { useSSE } from '../hooks/useSSE'
import ProductCard from '../components/ProductCard'

function fmt(val) { return Number(val || 0).toLocaleString('fr-FR') }
function pad(n) { return String(n).padStart(2, '0') }

function FloatingCountdown({ dateExpiration }) {
  const c = useCountdown(dateExpiration, 1000)
  if (!c) return null

  if (c.expired) {
    return (
      <div className="bg-primary/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl shadow-black/20 px-6 py-3.5 text-center">
        <p className="text-xs font-black text-white uppercase tracking-widest">Offre expirée</p>
      </div>
    )
  }

  const blocks = c.days > 0
    ? [{ v: c.days, l: 'Jours' }, { v: c.hours, l: 'Heures' }, { v: c.minutes, l: 'Min' }, { v: c.seconds, l: 'Sec' }]
    : [{ v: c.hours, l: 'Heures' }, { v: c.minutes, l: 'Min' }, { v: c.seconds, l: 'Sec' }]

  return (
    <div className="bg-primary/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl shadow-black/20 px-4 py-3">
      <div className="flex items-center justify-center gap-1.5 mb-2.5">
        <Timer size={12} className="text-accent" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">L'offre expire dans</span>
      </div>
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {blocks.map(({ v, l }, i) => (
          <div key={l} className="flex items-center gap-1 sm:gap-2">
            <div className="text-center min-w-[40px] sm:min-w-[46px]">
              <p className="text-xl sm:text-2xl font-black tabular-nums text-white leading-none">{pad(v)}</p>
              <p className="text-[8px] sm:text-[9px] text-white/40 uppercase tracking-wider mt-1">{l}</p>
            </div>
            {i < blocks.length - 1 && <span className="text-white/20 font-black text-lg -mt-3">:</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DetailOpportunite() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [opportunite, setOpportunite] = useState(null)
  const [similaires, setSimilaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState(false)
  const [activeImg, setActiveIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [quantite, setQuantite] = useState(1)

  useSSE(id ? `opportunite/${id}` : null, {
    COMPTEUR: ({ participantsActuels, prixActuel }) => {
      setOpportunite(prev => prev ? { ...prev, participantsActuels, prixActuel } : prev)
    },
    STATUT: ({ statut }) => {
      setOpportunite(prev => prev ? { ...prev, statut } : prev)
    },
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getOpportunite(id)
      .then(async op => {
        if (cancelled) return
        setOpportunite(op)
        if (op?.categorie) {
          const all = await getOpportunites()
          if (!cancelled) setSimilaires(all.filter(a => a.categorie === op.categorie && a.id !== op.id).slice(0, 4))
        }
      })
      .catch(() => { if (!cancelled) setOpportunite(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const handleJoindre = async () => {
    if (!isAuthenticated) {
      navigate('/connexion', { state: { from: `/opportunity/${id}` } })
      return
    }
    setJoinError(''); setJoining(true)
    try {
      await souscrire(id, quantite)
      setJoinSuccess(true)
      const updated = await getOpportunite(id)
      setOpportunite(updated)
      setQuantite(1)
      // Réactive le bouton après un court instant pour permettre d'ajouter encore de la quantité.
      setTimeout(() => setJoinSuccess(false), 2500)
    } catch (e) {
      setJoinError(e.response?.data?.message || 'Impossible de rejoindre.')
    } finally { setJoining(false) }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light">
      <Loader2 size={40} className="animate-spin text-primary" />
    </div>
  )

  if (!opportunite) return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-12 text-center max-w-sm shadow-soft">
        <AlertCircle size={48} className="text-gray-200 mx-auto mb-6" />
        <h2 className="text-xl font-heading font-extrabold text-primary mb-2">Oups !</h2>
        <p className="text-sm text-gray-500 mb-8">Cette offre n'est plus disponible ou a été déplacée.</p>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
          Retour au catalogue
        </button>
      </div>
    </div>
  )

  const progress = opportunite.seuilMinimum > 0
    ? Math.min(100, Math.round((opportunite.participantsActuels / opportunite.seuilMinimum) * 100)) : 0
  const discount = opportunite.prixNormal && Number(opportunite.prixNormal) > Number(opportunite.prixActuel)
    ? Math.round((1 - Number(opportunite.prixActuel) / Number(opportunite.prixNormal)) * 100) : null
  const paliersTries = [...(opportunite.paliers || [])].sort((a, b) => a.seuilMin - b.seuilMin)
  const placesRestantes = opportunite.seuilMaximal != null
    ? Math.max(0, opportunite.seuilMaximal - opportunite.participantsActuels) : Infinity
  const isComplet = opportunite.seuilMaximal != null && opportunite.participantsActuels >= opportunite.seuilMaximal

  return (
    <div className="min-h-screen bg-bg-light pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          <Link to="/" className="hover:text-primary transition-colors">OpportuniHub</Link>
          <ChevronRight size={10} />
          <span className="text-primary">{opportunite.categorie || 'Offre'}</span>
          <ChevronRight size={10} />
          <span className="text-primary/40 truncate max-w-[150px] md:max-w-none">{opportunite.titre}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 lg:items-start">

          {/* Gallery */}
          <div className="lg:col-span-7 space-y-6">

            {/* Image principale — hauteur fixe, clic = lightbox */}
            <div
              className="relative h-[320px] md:h-[400px] rounded-3xl overflow-hidden border-2 border-gray-100 bg-gray-50 cursor-zoom-in group"
              onClick={() => setLightbox(true)}
            >
              <img
                src={opportunite.images?.[activeImg] ? imgUrl(opportunite.images[activeImg].url) : `https://picsum.photos/seed/${id}/800/600`}
                alt={opportunite.titre}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-success text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">Stock vérifié</span>
              </div>
              <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="ti ti-zoom-in" /> Agrandir
              </div>

              {opportunite.dateExpiration && (
                <div
                  className="absolute bottom-4 left-4 z-10"
                  onClick={e => e.stopPropagation()}
                >
                  <FloatingCountdown dateExpiration={opportunite.dateExpiration} />
                </div>
              )}
            </div>

            {/* Miniatures */}
            {opportunite.images?.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {opportunite.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImg === i ? 'border-primary ring-2 ring-primary/10' : 'border-gray-100 hover:border-primary/30 opacity-60 hover:opacity-100'}`}
                  >
                    <img src={imgUrl(img.url)} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lightbox */}
          {lightbox && (
            <div
              className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
              onClick={() => setLightbox(false)}
            >
              <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                <i className="ti ti-x text-xl" />
              </button>
              {opportunite.images?.length > 1 && (
                <>
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-black/90 border border-white/10 rounded-full flex items-center justify-center text-white transition-colors"
                    onClick={e => { e.stopPropagation(); setActiveIdx(i => (i - 1 + opportunite.images.length) % opportunite.images.length) }}
                  >
                    <i className="ti ti-chevron-left text-xl" />
                  </button>
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-black/90 border border-white/10 rounded-full flex items-center justify-center text-white transition-colors"
                    onClick={e => { e.stopPropagation(); setActiveIdx(i => (i + 1) % opportunite.images.length) }}
                  >
                    <i className="ti ti-chevron-right text-xl" />
                  </button>
                </>
              )}
              <img
                src={opportunite.images?.[activeImg] ? imgUrl(opportunite.images[activeImg].url) : `https://picsum.photos/seed/${id}/800/600`}
                alt={opportunite.titre}
                className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl"
                onClick={e => e.stopPropagation()}
              />
              {opportunite.images?.length > 1 && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {opportunite.images.map((_, i) => (
                    <button key={i} onClick={e => { e.stopPropagation(); setActiveIdx(i) }}
                      className={`rounded-full transition-all ${i === activeImg ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-24">

            {/* Status + catégorie */}
            <div className="flex items-center gap-2 flex-wrap">
              {opportunite.categorie && (
                <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/10">{opportunite.categorie}</span>
              )}
              <span className="px-3 py-1 bg-success/10 text-success text-[10px] font-black rounded-full uppercase tracking-widest border border-success/20">Achat groupé</span>
            </div>

            {/* Titre */}
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold leading-tight tracking-tight text-primary">{opportunite.titre}</h1>

            {/* Prix */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-heading font-extrabold text-accent tracking-tighter tabular-nums">
                {fmt(opportunite.prixActuel)} <span className="text-base font-bold">FCFA</span>
              </span>
              {opportunite.prixNormal && Number(opportunite.prixNormal) > Number(opportunite.prixActuel) && (
                <span className="text-base text-gray-300 line-through">{fmt(opportunite.prixNormal)} FCFA</span>
              )}
              {discount > 0 && (
                <span className="bg-success text-white px-2.5 py-1 rounded-lg text-xs font-black">-{discount}%</span>
              )}
            </div>

            {/* Description */}
            {opportunite.description && (
              <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{opportunite.description}</p>
            )}

            {/* Progression */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Users size={12} /> {opportunite.participantsActuels} / {opportunite.seuilMinimum} participants
                </span>
                <span className="text-success">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              {opportunite.seuilMinimum > opportunite.participantsActuels && (
                <p className="text-[10px] text-gray-400 font-bold">
                  Plus que {opportunite.seuilMinimum - opportunite.participantsActuels} participant{opportunite.seuilMinimum - opportunite.participantsActuels > 1 ? 's' : ''} pour activer l'offre
                </p>
              )}
              {opportunite.seuilMaximal != null && (
                <p className={`text-[10px] font-bold ${isComplet ? 'text-urgency' : 'text-accent'}`}>
                  {isComplet ? 'Stock épuisé' : `Plus que ${placesRestantes} place${placesRestantes > 1 ? 's' : ''} disponible${placesRestantes > 1 ? 's' : ''}`}
                </p>
              )}
            </div>

            {/* Paliers */}
            {opportunite.paliers?.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Layers size={14} className="text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Paliers de prix</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {paliersTries
                    .map((palier, i) => {
                      const dernier = i === paliersTries.length - 1
                      const atteint = opportunite.participantsActuels >= palier.seuilMin
                      const actif = opportunite.participantsActuels >= palier.seuilMin &&
                        (!palier.seuilMax || opportunite.participantsActuels <= palier.seuilMax)
                      return (
                        <div key={i} className={`flex items-center justify-between px-4 py-3 transition-colors ${actif ? 'bg-success/5' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${actif ? 'bg-success' : atteint ? 'bg-success/30' : 'bg-gray-100'}`}>
                              {atteint && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                            <span className={`text-xs font-bold ${actif ? 'text-success' : 'text-gray-500'}`}>
                              {palier.seuilMin}{dernier ? ' et plus' : ` – ${palier.seuilMax}`} participants
                            </span>
                            {actif && <span className="text-[9px] bg-success text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wide">Actif</span>}
                          </div>
                          <span className={`text-sm font-heading font-extrabold tabular-nums ${actif ? 'text-success' : 'text-primary'}`}>
                            {fmt(palier.prix)} <span className="text-[10px] font-bold text-gray-400">FCFA</span>
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Quantité */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Quantité</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantite(q => Math.max(1, q - 1))}
                  disabled={quantite <= 1 || joining || joinSuccess}
                  className="w-9 h-9 rounded-full border-2 border-gray-100 flex items-center justify-center text-primary hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="text-lg font-heading font-extrabold text-primary tabular-nums w-6 text-center">{quantite}</span>
                <button
                  type="button"
                  onClick={() => setQuantite(q => Math.min(placesRestantes, q + 1))}
                  disabled={joining || joinSuccess || quantite >= placesRestantes}
                  className="w-9 h-9 rounded-full border-2 border-gray-100 flex items-center justify-center text-primary hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2 space-y-3 mt-auto">
              <button
                onClick={handleJoindre}
                disabled={joining || opportunite.statut !== 'ACTIVE' || isComplet}
                className={`w-full py-4 rounded-2xl font-heading font-black text-base shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${joinSuccess ? 'bg-success text-white cursor-default' : isComplet ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-accent text-primary hover:brightness-105'}`}
              >
                {joining && <Loader2 size={20} className="animate-spin" />}
                {joinSuccess ? <><CheckCircle2 size={18} /> Inscrit avec succès</>
                  : isComplet ? 'Offre complète'
                  : `Rejoindre — ${fmt(Number(opportunite.prixActuel) * quantite)} FCFA`}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-bold">
                <ShieldCheck size={12} className="text-success" /> Fonds sécurisés jusqu'à la fin de la vente
              </div>
              {joinError && <p className="text-urgency text-xs font-bold text-center bg-urgency/5 p-3 rounded-xl border border-urgency/10">{joinError}</p>}
            </div>
          </div>

          {/* Fiche produit enrichie — sous la galerie en desktop, tout en bas en mobile */}
          {(opportunite.specsPointsForts || opportunite.specsCasUsage || opportunite.specsFinePrint) && (
            <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-gray-100 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Points clés</span>
              </div>
              {opportunite.specsPointsForts && (
                <ul className="space-y-1.5">
                  {opportunite.specsPointsForts.split('\n').filter(Boolean).map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              {opportunite.specsCasUsage && (
                <p className="text-sm text-gray-500 leading-relaxed">{opportunite.specsCasUsage}</p>
              )}
              {opportunite.specsFinePrint && (
                <p className="text-[11px] text-gray-400 italic border-t border-gray-50 pt-2.5">{opportunite.specsFinePrint}</p>
              )}
            </div>
          )}
        </div>

        {/* Similar Products */}
        {similaires.length > 0 && (
          <section className="pt-16 space-y-8">
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-heading font-extrabold text-primary tracking-tight">Plus d'Opportunités</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Dans la catégorie {opportunite.categorie}</p>
              </div>
              <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:text-accent transition-colors">
                Voir tout le catalogue <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similaires.map(op => <ProductCard key={op.id} opportunity={op} />)}
            </div>
          </section>
        )}
      </div>

    </div>
  )
}
