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

  // Déterminer l'objectif final pour la barre de progression (le plafond, ou le max du dernier palier)
  let objectifFinal = seuilMaximal
  if (!objectifFinal && paliers && paliers.length > 0) {
    const dernierPalier = paliers[paliers.length - 1]
    // Si le dernier palier n'a pas de max, on utilise son seuilMin pour que la barre n'atteigne 100% qu'à ce stade
    objectifFinal = dernierPalier.seuilMax || dernierPalier.seuilMin
  }
  if (!objectifFinal) {
    objectifFinal = seuilMinimum
  }

  const pct = objectifFinal > 0 ? Math.min(100, Math.round((participantsActuels / objectifFinal) * 100)) : (valide ? 100 : 0)

  if (seuilMaximal != null) {
    return { pct, phase: 'plafond', valide, placesRestantes: Math.max(0, seuilMaximal - participantsActuels), objectifFinal }
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
