// Calcule la progression d'une opportunité à afficher (barre + pourcentage).
//
// La barre utilise un objectif stable pendant toute la campagne afin d'éviter
// un retour visuel de 100 % à une valeur plus faible au passage du seuil minimum.
// L'objectif est, dans l'ordre : le plafond, le dernier palier, puis le seuil minimum.
export function calculerProgression({ participantsActuels = 0, seuilMinimum, seuilMaximal, paliers = [] }) {
  const participants = Math.max(0, Number(participantsActuels) || 0)
  const minimum = Math.max(0, Number(seuilMinimum) || 0)
  const maximum = seuilMaximal == null ? null : Math.max(0, Number(seuilMaximal) || 0)
  const valide = minimum > 0 && participants >= minimum

  const paliersTries = [...paliers]
    .filter(Boolean)
    .sort((a, b) => (Number(a.seuilMin) || 0) - (Number(b.seuilMin) || 0))
  const dernierPalier = paliersTries.at(-1)
  const objectifPalier = dernierPalier
    ? Math.max(Number(dernierPalier.seuilMax) || 0, Number(dernierPalier.seuilMin) || 0)
    : 0
  const objectifFinal = maximum > 0 ? maximum : objectifPalier > 0 ? objectifPalier : minimum
  const pct = objectifFinal > 0
    ? Math.min(100, Math.max(0, Math.round((participants / objectifFinal) * 100)))
    : 0

  if (maximum > 0) {
    return {
      pct,
      phase: 'plafond',
      valide,
      placesRestantes: Math.max(0, maximum - participants),
      objectifFinal,
    }
  }

  return {
    pct,
    phase: valide ? (objectifPalier > minimum ? 'paliers' : 'illimitee') : 'validation',
    valide,
    objectifFinal,
  }
}
