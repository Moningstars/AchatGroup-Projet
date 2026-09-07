import { Link } from 'react-router-dom'
import { imgUrl } from '../services/api'
import { calculerProgression } from '../utils/progression'
import { useCountdown } from '../hooks/useCountdown'

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

function OpportunityCountdown({ dateExpiration }) {
  const countdown = useCountdown(dateExpiration, 1_000)
  if (!countdown) return null
  const pad = value => String(value).padStart(2, '0')

  return (
    <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/15 pt-1.5 text-[8px] font-black uppercase tracking-wide text-white/70">
      <span className="flex items-center gap-1"><i className="ti ti-clock" /> Temps restant</span>
      <span className={countdown.expired ? 'text-urgency' : 'tabular-nums text-white'}>
        {countdown.expired
          ? 'Expirée'
          : `${countdown.days}j ${pad(countdown.hours)}h ${pad(countdown.minutes)}m ${pad(countdown.seconds)}s`}
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
      className="group flex aspect-square min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-primary/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 active:scale-[0.99]"
    >
      {/* Visuel compact : la carte conserve un format carré sur tous les écrans. */}
      <div className="relative min-h-0 w-full flex-[1.2] overflow-hidden bg-gray-100">
        <img
          src={heroImg}
          alt={titre}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badge réduction */}
        {discount > 0 && (
          <div className="absolute left-2 top-2 rounded-full bg-success px-2 py-1 text-[10px] font-black leading-none text-white shadow-sm">
            -{discount}%
          </div>
        )}

        <div className="absolute bottom-[3.7rem] left-3">
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white shadow-sm">
            <i className="ti ti-users-group text-[9px]" /> Opportunité
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-primary/85 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-black text-white/70 uppercase tracking-wider">Progression</span>
            <span className="text-[8px] font-black text-accent">{progress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <OpportunityCountdown dateExpiration={dateExpiration} />
        </div>
      </div>

      {/* Infos produit */}
      <div className="flex min-h-0 flex-[0.8] flex-col gap-1.5 px-3 py-2.5">
        <p className="line-clamp-2 min-h-[2.45em] text-[13px] font-black leading-tight text-primary">{titre}</p>

        <div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg font-black leading-none tabular-nums text-urgency">
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

        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-1.5">
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
