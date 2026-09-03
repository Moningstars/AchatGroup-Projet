// Calcule la progression d'une opportunité à afficher (barre + pourcentage).
//
// Deux phases :
//  - avant seuilMinimum : progression vers le seuil de validation (0-100%)
//  - après seuilMinimum (offre déjà validée) :
//      - plafonnée (seuilMaximal défini) : progression vers le plafond (remplissage des places)
//      - illimitée (seuilMaximal absent) : validée, 100%, pas de plafond à remplir
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

  return { pct, phase: valide ? 'illimitee' : 'validation', valide, objectifFinal }
}
