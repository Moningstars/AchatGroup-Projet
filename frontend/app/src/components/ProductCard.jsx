import { Link } from 'react-router-dom'
import { imgUrl } from '../services/api'
import { calculerProgression } from '../utils/progression'

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

function CountdownBadge({ dateExpiration }) {
  if (!dateExpiration) return null
  const diff = Math.ceil((new Date(dateExpiration) - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0 || diff > 7) return null
  const urgent = diff <= 1
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 uppercase ${
      urgent ? 'bg-urgency text-white' : 'bg-accent text-primary'
    }`}>
      {diff === 0 ? 'Auj.' : diff === 1 ? 'Demain' : `${diff}j`}
    </span>
  )
}

const ProductCard = ({ opportunity }) => {
  if (!opportunity) return null
  const { id, titre, prixActuel, prixNormal, participantsActuels, seuilMinimum, seuilMaximal, paliers, images, dateExpiration } = opportunity

  const discount = prixNormal && Number(prixNormal) > Number(prixActuel)
    ? Math.round((1 - Number(prixActuel) / Number(prixNormal)) * 100) : null

  const { pct: progress, valide } = calculerProgression({ participantsActuels, seuilMinimum, seuilMaximal, paliers })
  const isExpired = dateExpiration && new Date(dateExpiration) <= new Date()
  const isOpen = opportunity.souscriptionOuverte ?? (opportunity.statut === 'ACTIVE' && !isExpired)
  const isActivated = opportunity.activationAtteinte ?? participantsActuels >= seuilMinimum

  const heroImg = images?.[0]?.url
    ? imgUrl(images[0].url)
    : `https://picsum.photos/seed/${id}/400/500`

  return (
    <Link
      to={`/opportunity/${id}`}
      className="flex sm:block bg-white border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow duration-200 active:opacity-80"
    >
      {/* Image — horizontal sur mobile (w fixe), portrait ratio sur sm+ */}
      <div className="relative w-32 shrink-0 overflow-hidden sm:w-auto sm:pb-[73%]">
        <img
          src={heroImg}
          alt={titre}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badge réduction */}
        {discount > 0 && (
          <div className="absolute top-0 left-0 bg-urgency text-white text-[10px] font-black px-2 py-1 leading-none">
            -{discount}%
          </div>
        )}

        {/* Countdown */}
        <div className="absolute top-0 right-0">
          <CountdownBadge dateExpiration={dateExpiration} />
        </div>

        {/* Badge Opportunité — visible seulement en mode vertical (sm+) */}
        <div className="absolute bottom-10 left-2 hidden sm:block">
          <span className="inline-flex items-center gap-1 bg-primary text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5">
            <i className="ti ti-users-group text-[9px]" /> Opportunité
          </span>
        </div>

        {/* Barre de progression sur l'image — sm+ seulement */}
        <div className="absolute bottom-0 left-0 right-0 hidden sm:block bg-primary/80 backdrop-blur-sm py-1.5 px-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-black text-white/70 uppercase tracking-wider">Progression</span>
            <span className="text-[8px] font-black text-accent">{progress}%</span>
          </div>
          <div className="h-1 bg-white/20">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Infos produit */}
      <div className="flex-1 sm:flex-none px-3 py-3 sm:px-2 sm:pt-1.5 sm:pb-2 flex flex-col justify-between gap-2 sm:gap-0 sm:space-y-0.5">
        <p className="text-sm sm:text-[11px] font-semibold text-primary leading-tight line-clamp-2 sm:min-h-[2.4em]">{titre}</p>

        <div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-black text-urgency tabular-nums leading-none">
              {fmt(prixActuel)}<span className="text-[9px] font-bold ml-0.5">F</span>
            </span>
            {prixNormal && Number(prixNormal) > Number(prixActuel) && (
              <span className="text-[10px] text-gray-300 line-through tabular-nums">{fmt(prixNormal)}F</span>
            )}
          </div>
          <p className="text-[9px] text-gray-400 font-bold mt-0.5">
            {valide
              ? seuilMaximal != null
                ? `${participantsActuels} / ${seuilMaximal} places`
                : `${participantsActuels} unités · offre validée`
              : `${participantsActuels} / ${seuilMinimum} unités réservées`}
          </p>

          {/* Barre de progression inline — mobile seulement */}
          <div className="sm:hidden mt-2 space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-gray-400">
              <span>Progression</span>
              <span className="text-accent">{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-primary">
            Voir les offres
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
