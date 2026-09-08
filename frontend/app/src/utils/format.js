export function formatMontant(value, options = {}) {
  const { decimals = 0 } = options
  const amount = Number(value || 0)
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).replace(/[\u202f\u00a0]/g, '\u00a0')
}
