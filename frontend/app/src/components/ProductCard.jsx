import { Link } from 'react-router-dom'
import { imgUrl } from '../services/api'
import { calculerProgression } from '../utils/progression'
import { useCountdown } from '../hooks/useCountdown'

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

function CountdownBadge({ dateExpiration }) {
  const countdown = useCountdown(dateExpiration, 60_000)
  if (!countdown || countdown.expired) return null
  const joursRestants = Math.ceil(countdown.total / 86_400_000)
  if (joursRestants > 7) return null
  const urgent = joursRestants <= 1
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 uppercase ${
      urgent ? 'bg-urgency text-white' : 'bg-accent text-primary'
    }`}>
      {joursRestants <= 1 ? 'Moins de 24 h' : `${joursRestants}j`}
    </span>
  )
}

const ProductCard = ({ opportunity }) => {
  if (!opportunity) return null
  const { id, titre, prixActuel, prixNormal, participantsActuels, seuilMinimum, seuilMaximal, paliers, images, dateExpiration } = opportunity

  const paliersTries = [...(opportunity.paliers || [])].sort((a, b) => a.seuilMin - b.seuilMin)
  const palierActif = paliersTries.find((palier, i) => {
    const dernier = i === paliersTries.length - 1
    return (participantsActuels >= palier.seuilMin || (i === 0 && participantsActuels < palier.seuilMin)) &&
      (dernier || !palier.seuilMax || participantsActuels <= palier.seuilMax)
  })
  const prixAffiche = palierActif ? palierActif.prix : prixActuel

  const { pct: progress, valide, objectifFinal } = calculerProgression({
    participantsActuels,
    seuilMinimum,
    seuilMaximal,
    paliers,
  })
  const isExpired = dateExpiration && new Date(dateExpiration) <= new Date()
  const discount = prixNormal && Number(prixNormal) > Number(prixAffiche)
    ? Math.round((1 - Number(prixAffiche) / Number(prixNormal)) * 100) : null
  const isOpen = opportunity.souscriptionOuverte ?? (opportunity.statut === 'ACTIVE' && !isExpired)
  const isActivated = opportunity.activationAtteinte ?? participantsActuels >= seuilMinimum

  const heroImg = images?.[0]?.url
    ? imgUrl(images[0].url)
    : `https://picsum.photos/seed/${id}/400/500`

  return (
    <Link
      to={`/opportunity/${id}`}
      className="group flex overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm shadow-primary/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 active:scale-[0.99] sm:block"
    >
      {/* Image — horizontal sur mobile (w fixe), portrait ratio sur sm+ */}
      <div className="relative w-32 shrink-0 overflow-hidden bg-gray-100 sm:w-auto sm:pb-[72%]">
        <img
          src={heroImg}
          alt={titre}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badge réduction */}
        {discount > 0 && (
          <div className="absolute left-2 top-2 rounded-full bg-urgency px-2 py-1 text-[10px] font-black leading-none text-white shadow-sm">
            -{discount}%
          </div>
        )}

        {/* Countdown */}
        <div className="absolute right-2 top-2 overflow-hidden rounded-full shadow-sm">
          <CountdownBadge dateExpiration={dateExpiration} />
        </div>

        {/* Badge Opportunité — visible seulement en mode vertical (sm+) */}
        <div className="absolute bottom-12 left-3 hidden sm:block">
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white shadow-sm">
            <i className="ti ti-users-group text-[9px]" /> Opportunité
          </span>
        </div>

        {/* Barre de progression sur l'image — sm+ seulement */}
        <div className="absolute bottom-0 left-0 right-0 hidden bg-primary/85 px-3 py-2 backdrop-blur-sm sm:block">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-black text-white/70 uppercase tracking-wider">Progression</span>
            <span className="text-[8px] font-black text-accent">{progress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Infos produit */}
      <div className="flex flex-1 flex-col justify-between gap-2 px-3 py-3 sm:min-h-[148px] sm:flex-none sm:px-4 sm:py-3">
        <p className="line-clamp-2 text-sm font-black leading-snug text-primary sm:min-h-[2.7em] sm:text-[13px]">{titre}</p>

        <div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg font-black leading-none tabular-nums text-urgency sm:text-xl">
              {fmt(prixAffiche)}<span className="text-[9px] font-bold ml-0.5">F</span>
            </span>
            {prixNormal && Number(prixNormal) > Number(prixAffiche) && (
              <span className="text-[10px] text-gray-300 line-through tabular-nums">{fmt(prixNormal)}F</span>
            )}
          </div>
          <p className="mt-1 text-[10px] font-bold text-gray-400">
            {seuilMaximal != null
              ? `${participantsActuels} / ${objectifFinal || seuilMaximal} unités`
              : valide && objectifFinal === Number(seuilMinimum)
                ? `${participantsActuels} unités · offre validée`
                : `${participantsActuels} / ${objectifFinal || seuilMinimum} unités`}
          </p>

          {/* Barre de progression inline — mobile seulement */}
          <div className="mt-2 space-y-1 sm:hidden">
            <div className="flex justify-between text-[9px] font-bold text-gray-400">
              <span>Progression</span>
              <span className="text-accent">{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-primary">
            Voir l’offre
          </span>
          <span className={`text-[9px] font-black uppercase tracking-wider ${isOpen ? 'text-success' : 'text-gray-300'}`}>
            {isOpen ? (isActivated ? 'Activée' : 'Ouverte') : 'Fermée'}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
