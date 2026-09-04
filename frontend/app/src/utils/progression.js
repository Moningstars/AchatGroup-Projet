// Calcule la progression d'une opportunité à afficher (barre + pourcentage).
//
// Deux phases :
//  - avant seuilMinimum : progression vers le seuil de validation (0-100%)
//  - après seuilMinimum :
//      - plafonnée : progression vers le plafond
//      - illimitée : progression continue dans les paliers de prix
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

  if (valide && paliersTries.length > 0) {
    const n = paliersTries.length
    let index = paliersTries.findIndex(p =>
      participants >= Number(p.seuilMin || 0) && participants <= Number(p.seuilMax || 0)
    )
    if (index === -1) {
      index = participants > Number(paliersTries[n - 1].seuilMax || 0) ? n - 1 : 0
    }
    const palier = paliersTries[index]
    const seuilMin = Number(palier.seuilMin) || 0
    const seuilMax = Number(palier.seuilMax) || seuilMin
    const local = seuilMax > seuilMin
      ? Math.min(1, Math.max(0, (participants - seuilMin) / (seuilMax - seuilMin)))
      : 1
    return {
      pct: Math.min(100, Math.round(((index + local) / n) * 100)),
      phase: 'illimitee',
      valide,
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
