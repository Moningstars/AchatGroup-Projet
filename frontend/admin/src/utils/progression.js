// Calcule la progression d'une opportunité à afficher (barre + pourcentage).
//
// Deux phases :
//  - avant seuilMinimum : progression vers le seuil de validation (0-100%)
//  - après seuilMinimum (offre déjà validée) :
//      - plafonnée (seuilMaximal défini) : progression vers le plafond (remplissage des places)
//      - illimitée (seuilMaximal absent) : progression par paliers de prix — chaque palier
//        occupe une tranche égale de la barre (4 paliers = 4 tranches de 25%), et la barre
//        avance en continu à l'intérieur de la tranche active au lieu de sauter d'un coup
//        au changement de palier.
export function calculerProgression({ participantsActuels = 0, seuilMinimum, seuilMaximal, paliers }) {
  const valide = seuilMinimum > 0 && participantsActuels >= seuilMinimum

  if (!valide) {
    const pct = seuilMinimum > 0 ? Math.min(100, Math.round((participantsActuels / seuilMinimum) * 100)) : 0
    return { pct, phase: 'validation', valide: false }
  }

  if (seuilMaximal != null) {
    const pct = seuilMaximal > 0 ? Math.min(100, Math.round((participantsActuels / seuilMaximal) * 100)) : 100
    return { pct, phase: 'plafond', valide: true, placesRestantes: Math.max(0, seuilMaximal - participantsActuels) }
  }

  const paliersTries = [...(paliers || [])].sort((a, b) => a.seuilMin - b.seuilMin)
  if (paliersTries.length === 0) {
    return { pct: 100, phase: 'illimitee', valide: true }
  }

  const n = paliersTries.length
  let index = paliersTries.findIndex(p => participantsActuels >= p.seuilMin && participantsActuels <= p.seuilMax)
  if (index === -1) {
    index = participantsActuels > paliersTries[n - 1].seuilMax ? n - 1 : 0
  }
  const palier = paliersTries[index]
  const local = palier.seuilMax > palier.seuilMin
    ? Math.min(1, Math.max(0, (participantsActuels - palier.seuilMin) / (palier.seuilMax - palier.seuilMin)))
    : 1
  const pct = Math.min(100, Math.round(((index + local) / n) * 100))

  return { pct, phase: 'illimitee', valide: true }
}
