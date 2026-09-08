import { Link } from 'react-router-dom'
import { imgUrl } from '../services/api'
import { calculerProgression } from '../utils/progression'
import { useCountdown } from '../hooks/useCountdown'
import { formatMontant as fmt } from '../utils/format'

function OpportunityCountdown({ dateExpiration }) {
  const countdown = useCountdown(dateExpiration, 1_000)
  if (!countdown) return null
  const pad = value => String(value).padStart(2, '0')

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 text-[8px] font-bold uppercase tracking-wide text-white/70">
      <span className="flex shrink-0 items-center gap-1"><i className="ti ti-clock text-[10px] text-accent" /> Temps restant</span>
      <span className={countdown.expired ? 'text-red-300' : 'truncate tabular-nums text-white'}>
        {countdown.expired
          ? 'Expirée'
          : `${countdown.days}j · ${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`}
      </span>
    </div>
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
      className="group flex h-[22rem] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl hover:shadow-primary/10 active:scale-[0.99] sm:h-auto sm:aspect-[4/5]"
    >
      {/* Une grande image, comme une fiche produit de catalogue. */}
      <div className="relative min-h-0 w-full flex-[1.35] overflow-hidden bg-gray-100">
        <img
          src={heroImg}
          alt={titre}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Badge réduction */}
        {discount > 0 && (
          <div className="absolute left-2.5 top-2.5 rounded-full bg-success px-2.5 py-1 text-[10px] font-black leading-none text-white shadow-md">
            -{discount}%
          </div>
        )}

        <div className="absolute right-2.5 top-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-primary shadow-sm backdrop-blur-md">
            <i className="ti ti-users-group text-[10px] text-success" /> Miitch
          </span>
        </div>

        {/* Progression recentrée sur le visuel pour libérer la fiche blanche. */}
        <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-primary/75 px-2.5 py-2 shadow-lg backdrop-blur-md ring-1 ring-white/10">
          <div className="mb-1 flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-wider">
            <span className="text-white/70">Progression</span>
            <span className="text-accent">{progress}%</span>
          </div>
          <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${progress}%` }} />
          </div>
          <OpportunityCountdown dateExpiration={dateExpiration} />
        </div>
      </div>

      {/* Infos produit */}
      <div className="flex min-h-0 flex-[0.65] flex-col px-3 py-2">
        <p className="line-clamp-2 min-h-[2.25em] text-[12px] font-black leading-[1.15] text-primary sm:text-[13px]">{titre}</p>

        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-heading text-base font-black leading-none tabular-nums text-primary sm:text-lg">
              {fmt(prixAffiche)}<span className="ml-0.5 text-[9px] font-bold text-gray-400">FCFA</span>
            </span>
            {prixNormal && Number(prixNormal) > Number(prixAffiche) && (
              <span className="text-[9px] text-gray-300 line-through tabular-nums">{fmt(prixNormal)} FCFA</span>
            )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-gray-100 pt-1">
          <div className="min-w-0">
            <p className="truncate text-[9px] font-bold text-gray-400">
            {seuilMaximal != null
              ? `${participantsActuels} / ${objectifFinal || seuilMaximal} unités`
              : valide && objectifFinal === Number(seuilMinimum)
                ? `${participantsActuels} unités · offre validée`
                : `${participantsActuels} / ${objectifFinal || seuilMinimum} unités`}
            </p>
            <span className={`text-[8px] font-black uppercase tracking-wider ${isOpen ? 'text-success' : 'text-gray-300'}`}>
              {isOpen ? (isActivated ? 'Activée' : 'Ouverte') : 'Fermée'}
            </span>
          </div>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 text-primary transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white">
            <i className="ti ti-arrow-up-right text-xs" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
