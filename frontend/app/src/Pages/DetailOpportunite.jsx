import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck, Users, Loader2, ChevronRight, CheckCircle2, AlertCircle, Layers, Timer, Minus, Plus, Copy, Share2, ShoppingCart, PackageCheck, ExternalLink, Gift, Store, Coins
} from 'lucide-react'
import { getApiErrorMessage, getOpportunite, getOpportunites, getMesParticipationsOpportunites, getSolde, souscrire, imgUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useCountdown } from '../hooks/useCountdown'
import { useSSE } from '../hooks/useSSE'
import ProductCard from '../components/ProductCard'
import { formatMontant as fmt } from '../utils/format'
import { calculerProgression } from '../utils/progression'

function pad(n) { return String(n).padStart(2, '0') }

function WhatsAppLogo({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.7Z" />
      <path d="M8.2 7.7c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.5l.8 1.8c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.5 0 .7.7 1.3 1.7 2.3 3 2.9.3.1.5.1.7-.1l.9-1.1c.2-.2.4-.3.7-.2l1.8.8c.3.1.5.3.5.5 0 .3-.2 1.5-.8 2.1-.6.6-1.5.9-2.4.7-1.2-.2-2.8-.8-4.5-2.3-1.4-1.3-2.4-2.8-2.7-4-.3-1.2.2-2.5.9-3.3Z" />
    </svg>
  )
}

function InstagramLogo({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookLogo({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M13.7 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5H17V3.6c-.8-.1-1.7-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.2H7.5V13h2.8v8h3.4Z" />
    </svg>
  )
}

function TikTokLogo({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.08 2.7 1.57 4.24 1.74v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.72-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
    </svg>
  )
}

function ShareIconButton({ label, caption, onClick, className, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`}>
      {children}
      <span className="sr-only">{caption}</span>
    </button>
  )
}

const SUIVI_PARTICIPATION = {
  EN_ATTENTE_QUOTA: 'Miitch en cours',
  A_PREPARER: 'Paiement validé',
  PREPARATION: 'Lot transmis au partenaire',
  PRET_LIVRAISON: 'Partenaire confirmé',
  EN_LIVRAISON: 'Date promise communiquée',
  LIVRE_A_CONFIRMER: 'Votre confirmation est attendue',
  LIVRE_CONFIRME: 'Réception confirmée',
  ECHEC_LIVRAISON: 'Promesse non tenue',
  LITIGE: 'Anomalie signalée',
  ANNULE: 'Annulée',
}

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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [opportunite, setOpportunite] = useState(null)
  const [similaires, setSimilaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState(false)
  const [activeImg, setActiveIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [quantite, setQuantite] = useState(1)
  const [maParticipation, setMaParticipation] = useState(null)
  const [copied, setCopied] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')
  const [activeInfoTab, setActiveInfoTab] = useState('produit')
  const [wallet, setWallet] = useState(null)
  const [utiliserPoints, setUtiliserPoints] = useState(false)
  const [reponsesComplementaires, setReponsesComplementaires] = useState({})

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
    getOpportunite(id)
      .then(async op => {
        if (cancelled) return
        setOpportunite(op)
        if (isAuthenticated) {
          try {
            const [participations, walletData] = await Promise.all([
              getMesParticipationsOpportunites(),
              getSolde().catch(() => null),
            ])
            if (!cancelled) setMaParticipation(participations.find(p => p.opportuniteId === id) || null)
            if (!cancelled) setWallet(walletData)
          } catch {
            if (!cancelled) setMaParticipation(null)
          }
        } else {
          setMaParticipation(null)
        }
        if (op?.categorie) {
          const all = await getOpportunites()
          if (!cancelled) setSimilaires(all.filter(a => a.categorie === op.categorie && a.id !== op.id).slice(0, 4))
        }
      })
      .catch(() => { if (!cancelled) setOpportunite(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, isAuthenticated])

  const refreshParticipation = async () => {
    if (!isAuthenticated) return
    try {
      const participations = await getMesParticipationsOpportunites()
      setMaParticipation(participations.find(p => p.opportuniteId === id) || null)
    } catch {
      setMaParticipation(null)
    }
  }

  const champsComplementaires = opportunite?.formulaireComplementaire || []
  const setReponseComplementaire = (cle, valeur) => {
    setReponsesComplementaires(current => ({ ...current, [cle]: valeur }))
  }

  const validerReponsesComplementaires = () => {
    const manquant = champsComplementaires.find(champ => champ.obligatoire && !String(reponsesComplementaires[champ.cle] || '').trim())
    return manquant ? `Complétez le champ : ${manquant.libelle}` : ''
  }

  const handleJoindre = async () => {
    if (!isAuthenticated) {
      navigate('/connexion', { state: { from: `${window.location.pathname}${window.location.search}` } })
      return
    }
    const erreurComplementaire = validerReponsesComplementaires()
    if (erreurComplementaire) {
      setJoinError(erreurComplementaire)
      return
    }
    const montantADebiter = Math.max(0, totalCommande - (utiliserPoints ? reductionPoints : 0))
    const soldeDisponible = Number(wallet?.soldeDisponible ?? wallet?.solde ?? 0)
    if (wallet && soldeDisponible < montantADebiter) {
      navigate('/portefeuille', {
        state: {
          openRecharge: true,
          montantManquant: Math.ceil(montantADebiter - soldeDisponible),
          opportunityTitle: opportunite.titre,
          returnTo: `${window.location.pathname}${window.location.search}`,
        },
      })
      return
    }
    setJoinError(''); setJoining(true)
    try {
      const ref = searchParams.get('ref')
      const parrainId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(ref || '') ? ref : undefined
      await souscrire(id, quantiteEffective, { parrainId, utiliserPoints, reponsesComplementaires })
      setJoinSuccess(true)
      const updated = await getOpportunite(id)
      setOpportunite(updated)
      await refreshParticipation()
      setQuantite(1)
      setUtiliserPoints(false)
      setReponsesComplementaires({})
      getSolde().then(setWallet).catch(() => {})
      // Réactive le bouton après un court instant pour permettre d'ajouter encore de la quantité.
      setTimeout(() => setJoinSuccess(false), 2500)
    } catch (e) {
      const errorPayload = `${e.response?.data?.code || ''} ${e.response?.data?.motif || ''} ${e.response?.data?.message || ''}`
      if (/solde|fonds|portefeuille|insuffisant/i.test(errorPayload)) {
        navigate('/portefeuille', {
          state: {
            openRecharge: true,
            montantManquant: Math.ceil(montantADebiter),
            opportunityTitle: opportunite.titre,
            returnTo: `${window.location.pathname}${window.location.search}`,
          },
        })
        return
      }
      setJoinError(getApiErrorMessage(e, 'La réservation n’a pas pu être effectuée. Réessayez.'))
    } finally { setJoining(false) }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setCopied(true)
      setShareFeedback('Lien copié')
      setTimeout(() => setCopied(false), 1800)
      setTimeout(() => setShareFeedback(''), 2200)
    } catch {
      setCopied(false)
    }
  }

  const handleShare = async () => {
    const url = getShareUrl()
    const message = getShareMessage()
    if (navigator.share) {
      try {
        await navigator.share({ title: opportunite?.titre || 'Miitch sur Miitcha Deal', text: message, url })
      } catch (error) {
        if (error?.name !== 'AbortError') await handleCopyLink()
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${message}\n\n${url}`)}`, '_blank', 'noopener,noreferrer')
    }
  }

  const handleSocialShare = async (reseau) => {
    const url = getShareUrl()
    const message = getShareMessage()
    const contenu = `${message}\n\n${url}`

    if (reseau === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(contenu)}`, '_blank', 'noopener,noreferrer')
      return
    }

    if (reseau === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer')
      return
    }

    const destination = reseau === 'instagram' ? 'https://www.instagram.com/' : 'https://www.tiktok.com/'
    window.open(destination, '_blank', 'noopener,noreferrer')
    try {
      await navigator.clipboard.writeText(contenu)
      const nom = reseau === 'instagram' ? 'Instagram' : 'TikTok'
      setShareFeedback(`Message copié — collez-le dans ${nom}`)
      setTimeout(() => setShareFeedback(''), 3500)
    } catch {
      setShareFeedback('Utilisez le bouton Copier le lien')
      setTimeout(() => setShareFeedback(''), 3000)
    }
  }

  const getShareMessage = () => {
    const ancienMessage = 'Rejoignez vite ce Miitch et profitez de ce produit à un prix imbattable !'
    const messageConfigure = opportunite?.messagePartage?.trim()
    const template = messageConfigure && messageConfigure !== ancienMessage
      ? messageConfigure
      : "🔥 Bon plan Miitcha Deal !\n\nDécouvrez « {titre} » à partir de {prix} FCFA grâce à l’achat groupé.\n⏳ Rejoignez l’offre avant sa clôture et profitez du meilleur tarif.\n\n👉 Voir l’offre et participer :"
    return template
      .replaceAll('{titre}', opportunite?.titre || 'ce Miitch')
      .replaceAll('{prix}', fmt(opportunite?.prixActuel || opportunite?.prixNormal))
  }

  const getShareUrl = () => {
    const base = `${window.location.origin}/opportunity/${id}`
    return user?.id && maParticipation ? `${base}?ref=${user.id}` : base
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

  const paliersTries = [...(opportunite.paliers || [])].sort((a, b) => a.seuilMin - b.seuilMin)
  const palierActif = paliersTries.find((palier, i) => {
    const dernier = i === paliersTries.length - 1
    return (opportunite.participantsActuels >= palier.seuilMin || (i === 0 && opportunite.participantsActuels < palier.seuilMin)) &&
      (dernier || !palier.seuilMax || opportunite.participantsActuels <= palier.seuilMax)
  })
  const prixAffiche = palierActif ? palierActif.prix : opportunite.prixActuel

  const { valide: progressionValidee, phase: phaseProgression, placesRestantes: unitésRestantesCalculees } = calculerProgression({ ...opportunite, paliers: paliersTries })
  const discount = opportunite.prixNormal && Number(opportunite.prixNormal) > Number(prixAffiche)
    ? Math.round((1 - Number(prixAffiche) / Number(opportunite.prixNormal)) * 100) : null
  const unitésRestantes = phaseProgression === 'plafond' ? unitésRestantesCalculees : Infinity
  const isComplet = phaseProgression === 'plafond' && unitésRestantes <= 0
  const isExpired = opportunite.dateExpiration && new Date(opportunite.dateExpiration) <= new Date()
  const souscriptionOuverte = opportunite.souscriptionOuverte ?? (opportunite.statut === 'ACTIVE' && !isExpired && !isComplet)
  const activationAtteinte = opportunite.activationAtteinte ?? opportunite.participantsActuels >= opportunite.seuilMinimum
  const dejaSouscrit = Boolean(maParticipation)
  const maxAjout = Number.isFinite(unitésRestantes) ? unitésRestantes : 99
  const maxQuantiteSelectionnable = Math.max(1, maxAjout || 1)
  const quantiteEffective = Math.min(quantite, maxQuantiteSelectionnable)
  const participantsActuels = Math.max(0, Number(opportunite.participantsActuels || 0))
  const palierActifIndex = Math.max(0, paliersTries.findIndex(p => p === palierActif))
  const prochainPalier = paliersTries[palierActifIndex + 1]
  const palierDebut = Number(palierActif?.seuilMin || 1)
  const palierFin = Number(palierActif?.seuilMax || opportunite.seuilMaximal || palierDebut)
  const palierEstOuvert = !palierActif?.seuilMax && !opportunite.seuilMaximal
  const uniteDansPalier = palierEstOuvert
    ? Math.max(0, participantsActuels - palierDebut + 1)
    : palierActifIndex === 0
      ? Math.min(participantsActuels, palierFin)
      : Math.max(0, Math.min(participantsActuels, palierFin) - palierDebut + 1)
  const capacitePalier = palierEstOuvert ? null : Math.max(1, palierFin - palierDebut + 1)
  const progressPalier = capacitePalier ? Math.min(100, Math.round((uniteDansPalier / capacitePalier) * 100)) : 100
  const messageProgression = !activationAtteinte
    ? `Plus que ${Math.max(0, Number(opportunite.seuilMinimum || 0) - participantsActuels)} unité${Math.max(0, Number(opportunite.seuilMinimum || 0) - participantsActuels) > 1 ? 's' : ''} pour activer le Miitch`
    : prochainPalier
      ? `Plus que ${Math.max(0, Number(prochainPalier.seuilMin || 0) - participantsActuels)} unité${Math.max(0, Number(prochainPalier.seuilMin || 0) - participantsActuels) > 1 ? 's' : ''} pour passer au prix de ${fmt(prochainPalier.prix)} FCFA`
      : 'Dernier palier atteint : chaque nouvelle unité garde le meilleur prix disponible.'
  const handleQuantiteChange = (value) => {
    const next = Math.floor(Number(value) || 1)
    setQuantite(Math.min(maxQuantiteSelectionnable, Math.max(1, next)))
  }
  const totalCommande = Number(prixAffiche) * quantiteEffective
  const soldePoints = Number(wallet?.soldePoints || 0)
  const valeurPoint = Number(wallet?.valeurPointFcfa || 1)
  const recompenseParrainage = Number(wallet?.recompenseParrainagePoints || 100)
  const reductionPoints = Math.min(totalCommande, soldePoints * valeurPoint)

  return (
    <div className="min-h-screen bg-bg-light pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          <Link to="/" className="hover:text-primary transition-colors">Miitcha Deal</Link>
          <ChevronRight size={10} />
          <span className="text-primary">{opportunite.categorie || 'Offre'}</span>
          <ChevronRight size={10} />
          <span className="text-primary/40 truncate max-w-[150px] md:max-w-none">{opportunite.titre}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">

          {/* Colonne gauche indépendante : évite que la hauteur des actions repousse la description. */}
          <div className="contents lg:col-span-7 lg:block lg:space-y-6">

          {/* Media : photos + miniatures — toujours en premier, y compris sur mobile */}
          <div className="order-1 space-y-6">

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
              {dejaSouscrit && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1.5 bg-white text-success px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                    <CheckCircle2 size={12} /> Déjà souscrit
                  </span>
                </div>
              )}
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

          {/* Informations réunies dans une seule fiche à onglets. */}
          <div className="order-3">
            <section className="overflow-hidden rounded-3xl border-2 border-gray-100 bg-white">
              <div className="grid grid-cols-2 border-b border-gray-100 bg-gray-50/70 p-1.5">
                <button type="button" onClick={() => setActiveInfoTab('produit')} className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3 text-xs font-black transition ${activeInfoTab === 'produit' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-primary'}`}>
                  <PackageCheck size={16} className="shrink-0" />
                  <span className="truncate">À propos du produit</span>
                </button>
                <button type="button" onClick={() => setActiveInfoTab('fournisseur')} className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3 text-xs font-black transition ${activeInfoTab === 'fournisseur' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-primary'}`}>
                  <Store size={16} className="shrink-0" />
                  <span className="truncate">Fournisseur</span>
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {activeInfoTab === 'produit' ? (
                  <>
                    <p className="text-sm font-medium leading-7 text-gray-500">
                      {opportunite.description || 'Les détails complets de cette offre seront bientôt renseignés par notre équipe.'}
                    </p>
                    {(opportunite.specsPointsForts || opportunite.specsCasUsage || opportunite.specsFinePrint) && (
                      <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                        {opportunite.specsPointsForts && (
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {opportunite.specsPointsForts.split('\n').filter(Boolean).map((line, i) => (
                              <li key={i} className="flex items-start gap-2 rounded-2xl bg-bg-light p-3 text-sm font-semibold text-gray-600">
                                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />
                                <span className="min-w-0 break-words">{line}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {opportunite.specsCasUsage && <p className="break-words text-sm leading-7 text-gray-500">{opportunite.specsCasUsage}</p>}
                        {opportunite.specsFinePrint && <p className="break-words rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">{opportunite.specsFinePrint}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {opportunite.partenaireLogoUrl ? (
                      <img src={imgUrl(opportunite.partenaireLogoUrl)} alt={opportunite.partenaireNom || 'Partenaire'} className="h-16 w-16 shrink-0 rounded-2xl border border-gray-100 object-contain p-1" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary"><Store size={25} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{opportunite.fournisseurId ? 'Fournisseur vérifié' : "Fournisseur de l'offre"}</p>
                      <h2 className="mt-1 break-words font-heading text-lg font-black text-primary">{opportunite.partenaireNom || 'Fournisseur à confirmer'}</h2>
                      {!opportunite.partenaireNom && <p className="mt-1 text-sm font-semibold leading-6 text-gray-500">Les informations du fournisseur seront renseignées prochainement.</p>}
                    </div>
                    {opportunite.partenaireReseauxUrl && (
                      <a href={opportunite.partenaireReseauxUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-gray-100 px-3 text-xs font-black text-primary transition hover:border-primary/30 sm:w-auto" title="Voir le fournisseur">
                        <ExternalLink size={14} /> Découvrir
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
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

          {/* Info : titre, prix, progression, quantité, CTA — passe avant les détails produit/fournisseur sur mobile */}
          <div className="order-2 flex flex-col gap-5 lg:col-span-5 lg:sticky lg:top-24">

            {/* Status + catégorie */}
            <div className="flex items-center gap-2 flex-wrap">
              {opportunite.categorie && (
                <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/10">{opportunite.categorie}</span>
              )}
              <span className="px-3 py-1 bg-success/10 text-success text-[10px] font-black rounded-full uppercase tracking-widest border border-success/20">Achat groupé</span>
              <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest border ${
                souscriptionOuverte ? 'bg-accent/15 text-primary border-accent/30' : 'bg-gray-100 text-gray-400 border-gray-100'
              }`}>
                {souscriptionOuverte ? 'Souscription ouverte' : 'Souscription fermée'}
              </span>
            </div>

            {/* Titre */}
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold leading-tight tracking-tight text-primary">{opportunite.titre}</h1>

            {/* Prix */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-heading font-extrabold text-accent tracking-tighter tabular-nums">
                {fmt(prixAffiche)} <span className="text-base font-bold">FCFA</span>
              </span>
              {opportunite.prixNormal && Number(opportunite.prixNormal) > Number(prixAffiche) && (
                <span className="text-base text-gray-300 line-through">{fmt(opportunite.prixNormal)} FCFA</span>
              )}
              {discount > 0 && (
                <span className="bg-success text-white px-2.5 py-1 rounded-lg text-xs font-black">-{discount}%</span>
              )}
            </div>

            {/* Progression */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Users size={12} />
                  {palierEstOuvert
                    ? `${participantsActuels} unités · palier ${palierDebut} et plus`
                    : `${uniteDansPalier} / ${capacitePalier} unités dans ce palier`}
                </span>
                <span className={activationAtteinte ? 'text-success' : 'text-accent'}>{progressPalier}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all duration-700" style={{ width: `${progressPalier}%` }} />
              </div>
              <p className={`text-[10px] font-bold ${activationAtteinte ? 'text-success' : 'text-gray-400'}`}>{messageProgression}</p>
              {activationAtteinte && progressionValidee && <p className="text-[10px] text-gray-400 font-semibold">Seuil minimum atteint : le Miitch est validé s’il se clôture maintenant.</p>}
              {phaseProgression === 'plafond' && (
                <p className={`text-[10px] font-bold ${isComplet ? 'text-urgency' : 'text-accent'}`}>
                  {isComplet ? 'Stock épuisé' : `Plus que ${unitésRestantes} unité${unitésRestantes > 1 ? 's' : ''} disponible${unitésRestantes > 1 ? 's' : ''}`}
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
                      const actif = (opportunite.participantsActuels >= palier.seuilMin || (i === 0 && opportunite.participantsActuels < palier.seuilMin)) &&
                        (dernier || !palier.seuilMax || opportunite.participantsActuels <= palier.seuilMax)
                      return (
                        <div key={i} className={`flex items-center justify-between px-4 py-3 transition-colors ${actif ? 'bg-success/5' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${actif ? 'bg-success' : atteint ? 'bg-success/30' : 'bg-gray-100'}`}>
                              {atteint && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                            <span className={`text-xs font-bold ${actif ? 'text-success' : 'text-gray-500'}`}>
                              {palier.seuilMin}{dernier ? ' et plus' : ` – ${palier.seuilMax}`} unités
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

            {/* Suivi ou aide */}
            <div className={`${dejaSouscrit ? 'bg-success/10 border-success/20' : 'bg-primary/5 border-primary/10'} min-w-0 rounded-2xl border-2 p-3 sm:p-4`}>
                <div className="flex items-start gap-3">
                  {dejaSouscrit ? <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" /> : <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <p className={`font-heading font-black text-sm ${dejaSouscrit ? 'text-success' : 'text-primary'}`}>
                      {dejaSouscrit ? 'Vous avez déjà rejoint ce Miitch' : 'Réservez maintenant, sans achat définitif immédiat'}
                    </p>
                    {dejaSouscrit ? (
                      <p className="text-xs text-success/80 font-bold mt-1">
                        Quantité actuelle : {maParticipation.quantite || 1} · Fonds gelés : {fmt(maParticipation.montantGele)} FCFA
                      </p>
                    ) : (
                      <p className="text-xs text-primary/70 font-bold mt-1">
                        Votre dépôt est sécurisé. Il est finalisé seulement si le seuil minimum est atteint, sinon il est remboursé.
                      </p>
                    )}
                    <div className="mt-3 flex flex-col items-start gap-2 rounded-xl bg-white/70 px-3 py-2 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                      <span className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-wider text-primary sm:text-[11px]">
                        <PackageCheck size={14} />
                        <span className="min-w-0 break-words">{dejaSouscrit ? (SUIVI_PARTICIPATION[maParticipation.statutLivraison] || 'Miitch en cours') : (activationAtteinte ? 'Miitch déjà validée' : 'En attente du seuil minimum')}</span>
                      </span>
                      <span className={`text-[11px] font-black tabular-nums ${dejaSouscrit ? 'text-success' : 'text-primary'}`}>
                        {dejaSouscrit ? `${maParticipation.progressionLivraison || 0}%` : `${participantsActuels}/${opportunite.seuilMinimum}`}
                      </span>
                    </div>
                    {souscriptionOuverte && (
                      <p className={`mt-2 text-xs ${dejaSouscrit ? 'text-success/80' : 'text-primary/70'}`}>
                        {dejaSouscrit
                          ? 'Besoin de plus d’unités ? Choisissez une quantité ci-dessous : elle sera ajoutée à votre commande existante.'
                          : 'Choisissez la quantité voulue ci-dessous pour rejoindre ce Miitch.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

            {/* Quantité */}
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                {dejaSouscrit ? 'Quantité à ajouter' : 'Quantité'}
              </span>
              <div className="flex items-center justify-between gap-3 min-[430px]:justify-end">
                <button
                  type="button"
                  onClick={() => setQuantite(q => Math.max(1, q - 1))}
                  disabled={quantite <= 1 || joining || joinSuccess}
                  className="w-9 h-9 rounded-full border-2 border-gray-100 flex items-center justify-center text-primary hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  max={maxQuantiteSelectionnable}
                  inputMode="numeric"
                  value={quantite}
                  onChange={e => handleQuantiteChange(e.target.value)}
                  disabled={joining || joinSuccess}
                  aria-label={dejaSouscrit ? 'Quantité à ajouter' : 'Quantité à réserver'}
                  className="h-9 w-14 rounded-xl border-2 border-gray-100 bg-bg-light text-center font-heading text-lg font-extrabold tabular-nums text-primary outline-none transition focus:border-primary/30 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setQuantite(q => Math.min(maxAjout, q + 1))}
                  disabled={joining || joinSuccess || quantite >= maxAjout}
                  className="w-9 h-9 rounded-full border-2 border-gray-100 flex items-center justify-center text-primary hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {isAuthenticated && soldePoints > 0 && (
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-amber-100 bg-amber-50/70 p-4">
                <input type="checkbox" checked={utiliserPoints} onChange={e => setUtiliserPoints(e.target.checked)} className="h-5 w-5 accent-amber-500" />
                <Coins size={20} className="shrink-0 text-amber-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-primary">Utiliser mes {fmt(soldePoints)} points</span>
                  <span className="mt-0.5 block text-[10px] font-semibold leading-4 text-gray-500">
                    Jusqu’à {fmt(reductionPoints)} FCFA déduits de cet achat · ces points ne sont pas retirables.
                  </span>
                </span>
              </label>
            )}

            {champsComplementaires.length > 0 && souscriptionOuverte && (
              <div className="rounded-2xl border-2 border-gray-100 bg-white p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                    <PackageCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary">Informations nécessaires après validation</p>
                    <p className="mt-0.5 text-[10px] font-semibold leading-4 text-gray-400">Ces éléments aideront l’équipe à préparer votre livraison si le seuil est atteint.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {champsComplementaires.map(champ => {
                    const commonClass = 'w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-primary outline-none transition focus:border-primary/30 focus:bg-white'
                    const value = reponsesComplementaires[champ.cle] || ''
                    return (
                      <label key={champ.cle} className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">{champ.libelle}{champ.obligatoire ? ' *' : ''}</span>
                        {champ.type === 'TEXTAREA' ? (
                          <textarea rows={3} value={value} onChange={e => setReponseComplementaire(champ.cle, e.target.value)} className={`${commonClass} resize-none`} />
                        ) : champ.type === 'SELECT' || champ.type === 'RADIO' ? (
                          <select value={value} onChange={e => setReponseComplementaire(champ.cle, e.target.value)} className={commonClass}>
                            <option value="">Sélectionner</option>
                            {(champ.options || []).map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : champ.type === 'CHECKBOX' ? (
                          <span className="flex items-center gap-3 rounded-xl border-2 border-gray-100 bg-gray-50 px-3 py-2.5">
                            <input type="checkbox" checked={value === 'Oui'} onChange={e => setReponseComplementaire(champ.cle, e.target.checked ? 'Oui' : '')} className="h-5 w-5 accent-primary" />
                            <span className="text-sm font-bold text-primary">Oui</span>
                          </span>
                        ) : (
                          <input type={champ.type === 'NUMBER' ? 'number' : champ.type === 'DATE' ? 'date' : champ.type === 'PHONE' ? 'tel' : 'text'} value={value} onChange={e => setReponseComplementaire(champ.cle, e.target.value)} className={commonClass} />
                        )}
                        {champ.aide && <span className="mt-1 block text-[10px] font-semibold leading-4 text-gray-400">{champ.aide}</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Partage et parrainage — toujours déplié */}
            <div className="overflow-hidden rounded-2xl border-2 border-primary/10 bg-white shadow-soft">
              <div className="flex flex-col items-center justify-center gap-2 p-3 text-center sm:flex-row sm:text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                  {dejaSouscrit ? <Gift size={18} /> : <Share2 size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-5 text-primary">
                    {dejaSouscrit ? 'Invitez vos proches et gagnez des points' : "Partager l'offre avec vos proches"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold leading-4 text-gray-400">
                    {dejaSouscrit
                      ? `${fmt(recompenseParrainage)} points après leur achat confirmé`
                      : 'Copiez ou envoyez le lien en quelques secondes'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 px-3 pb-3 pt-2.5">
                {dejaSouscrit && (
                  <p className="mb-2 text-[10px] font-semibold leading-4 text-gray-500">
                    Votre lien personnel vous récompense lorsqu’un proche rejoint cette offre et finalise son achat.
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <ShareIconButton label="Partager via WhatsApp" caption="WhatsApp" onClick={() => handleSocialShare('whatsapp')} className="bg-[#25D366] text-white shadow-sm shadow-emerald-200 hover:bg-[#20bd5a]"><WhatsAppLogo /></ShareIconButton>
                  <ShareIconButton label="Partager via Facebook" caption="Facebook" onClick={() => handleSocialShare('facebook')} className="bg-[#1877F2] text-white shadow-sm shadow-blue-200 hover:bg-[#1268d3]"><FacebookLogo /></ShareIconButton>
                  <ShareIconButton label="Partager via TikTok" caption="TikTok" onClick={() => handleSocialShare('tiktok')} className="bg-slate-950 text-white shadow-sm hover:bg-slate-800"><TikTokLogo /></ShareIconButton>
                  <ShareIconButton label="Partager via Instagram" caption="Instagram" onClick={() => handleSocialShare('instagram')} className="bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-400 text-white shadow-sm shadow-fuchsia-200"><InstagramLogo /></ShareIconButton>
                  <ShareIconButton label={copied ? 'Lien copié !' : 'Copier le lien'} caption={copied ? 'Copié !' : 'Copier'} onClick={handleCopyLink} className="bg-gray-50 text-primary hover:bg-gray-100"><Copy size={18} /></ShareIconButton>
                  <ShareIconButton label="Partager via une autre application" caption="Partager" onClick={handleShare} className="border border-gray-200 bg-white text-primary hover:border-primary/30"><Share2 size={18} /></ShareIconButton>
                </div>
                {shareFeedback && <p role="status" className="mt-2 text-center text-[10px] font-black text-success">{shareFeedback}</p>}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2 space-y-3 mt-auto">
              {!souscriptionOuverte && (
                <div className="text-urgency text-xs font-bold bg-urgency/5 p-3 rounded-xl border border-urgency/10">
                  {opportunite.raisonIndisponibilite || (isExpired ? 'Ce Miitch est expiré.' : 'Ce Miitch ne peut plus recevoir de réservations.')}
                </div>
              )}
              <button
                onClick={handleJoindre}
                disabled={joining || joinSuccess || !souscriptionOuverte || maxAjout <= 0}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-center font-heading text-sm font-black leading-5 shadow-lg transition-all active:scale-95 sm:text-base ${joinSuccess ? 'bg-success text-white cursor-default' : !souscriptionOuverte || maxAjout <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-accent text-primary hover:brightness-105'}`}
              >
                {joining && <Loader2 size={20} className="animate-spin" />}
                {!joining && !joinSuccess && <ShoppingCart size={20} />}
                {joinSuccess ? <><CheckCircle2 size={18} /> Inscrit avec succès</>
                  : isComplet ? 'Offre complète'
                  : dejaSouscrit ? `Ajouter ${quantiteEffective} — dépôt de ${fmt(totalCommande)} FCFA`
                  : `Réserver avec un dépôt — ${fmt(totalCommande)} FCFA`}
              </button>
              <div className="flex items-start justify-center gap-1.5 px-2 text-center text-[10px] font-bold leading-4 text-gray-500">
                <ShieldCheck size={12} className="mt-0.5 shrink-0 text-success" />
                <span>Dépôt débité au prix final si le seuil minimum est atteint, sinon remboursé intégralement.</span>
              </div>
              {joinError && <p className="text-urgency text-xs font-bold text-center bg-urgency/5 p-3 rounded-xl border border-urgency/10">{joinError}</p>}
            </div>
          </div>

        </div>

        {/* Similar Products */}
        {similaires.length > 0 && (
          <section className="pt-16 space-y-8">
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-heading font-extrabold text-primary tracking-tight">Plus d'Miitchs</h2>
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
