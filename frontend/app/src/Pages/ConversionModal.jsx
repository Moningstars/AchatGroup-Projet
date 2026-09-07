import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function ConversionModal({ open, onClose, points, onConvert }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const pts = parseInt(amount || '0', 10)

  const handleConvert = async () => {
    if (!pts || pts <= 0) { setError('Entrez un nombre de points valide.'); return }
    if (pts > points) { setError('Vous n\'avez pas assez de points.'); return }
    setError('')
    setLoading(true)
    try {
      await onConvert(pts)
      setAmount('')
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la conversion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h4 className="mb-2 text-lg font-semibold">Convertir des points</h4>
        <p className="mb-4 text-sm text-slate-600">
          Vous avez <span className="font-semibold">{points.toLocaleString('fr-FR')}</span> points disponibles.
        </p>

        <label className="mb-2 block text-sm font-medium text-slate-700">Points à convertir</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          type="number"
          min="1"
          max={points}
          className="w-full rounded-lg border border-slate-200 px-4 py-2 mb-4"
        />

        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleConvert}
            disabled={loading || !pts}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Convertir
          </button>
          <button
            onClick={() => { setAmount(''); setError(''); onClose() }}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
