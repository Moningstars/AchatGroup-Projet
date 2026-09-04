// Calcule la progression d'une opportunité à afficher (barre + pourcentage).
//
// Deux phases :
//  - avant seuilMinimum : progression vers le seuil de validation (0-100%)
//  - après seuilMinimum (offre déjà validée) :
//      - plafonnée (seuilMaximal défini) : progression vers le plafond (remplissage des places)
//      - illimitée (seuilMaximal absent) : validée, 100%, pas de plafond à remplir
export function calculerProgression({ participantsActuels = 0, seuilMinimum, seuilMaximal }) {
  const valide = seuilMinimum > 0 && participantsActuels >= seuilMinimum

  if (!valide) {
    const pct = seuilMinimum > 0 ? Math.min(100, Math.round((participantsActuels / seuilMinimum) * 100)) : 0
    return { pct, phase: 'validation', valide: false }
  }

  if (seuilMaximal != null) {
    const pct = seuilMaximal > 0 ? Math.min(100, Math.round((participantsActuels / seuilMaximal) * 100)) : 100
    return { pct, phase: 'plafond', valide: true, placesRestantes: Math.max(0, seuilMaximal - participantsActuels) }
  }

  return { pct: 100, phase: 'illimitee', valide: true }
}
