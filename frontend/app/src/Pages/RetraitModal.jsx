import React, { useState } from 'react'

export default function RetraitModal({ open, onClose, onConfirm, balance }) {
  const [amount, setAmount] = useState('')
  const [coordonnees, setCoordonnees] = useState('')
  if (!open) return null

  const handleConfirm = () => {
    if (!amount || !coordonnees) return
    onConfirm(amount, coordonnees)
    setAmount('')
    setCoordonnees('')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h4 className="mb-4 text-lg font-semibold">Retirer du portefeuille</h4>
        <div className="mb-4 text-sm text-slate-600">
          Solde disponible : <span className="font-semibold">{balance.toLocaleString()} FCFA</span>
        </div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Montant (FCFA)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000"
          type="number"
          min="1000"
          className="w-full rounded-lg border border-slate-200 px-4 py-2 mb-4"
        />
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Numéro de réception (Orange Money, MTN, etc.)
        </label>
        <input
          value={coordonnees}
          onChange={(e) => setCoordonnees(e.target.value)}
          placeholder="ex : +228 90 00 00 00"
          className="w-full rounded-lg border border-slate-200 px-4 py-2 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!amount || !coordonnees}
            className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-white disabled:opacity-50"
          >
            Confirmer
          </button>
          <button
            onClick={() => { setAmount(''); setCoordonnees(''); onClose() }}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
