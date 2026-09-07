import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import {
  getAdminCommanditaires,
  getCommanditaireMouvements,
  getTentativesSouscriptionEchouees,
} from '../services/api'
import Sondages from './Sondages'
import Utilisateurs from './Utilisateurs'
import Portefeuilles from './Portefeuilles'
import Commanditaires from './Commanditaires'

function Shell({ title, children }) {
  return <section className="space-y-5">
    <Link to=".." relative="path" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"><ArrowLeft className="h-4 w-4" /> Retour</Link>
    <div><h1 className="text-2xl font-black text-slate-950">{title}</h1></div>
    {children}
  </section>
}

export function NouveauSondagePage() { return <Sondages initialAction="new" /> }
export function ModifierSondagePage() { const { id } = useParams(); return <Sondages initialAction="edit" initialId={id} /> }
export function EligibiliteSondagePage() { const { id } = useParams(); return <Sondages initialAction="eligibility" initialId={id} /> }
export function ReponsesSondagePage() { const { id } = useParams(); return <Sondages initialAction="responses" initialId={id} /> }
export function ResultatsSondagePage() { const { id } = useParams(); return <Sondages initialAction="results" initialId={id} /> }
export function DetailSondagePage() { const { id } = useParams(); return <Sondages initialAction="results" initialId={id} /> }
export function UtilisateurDetailPage() { const { id } = useParams(); return <Utilisateurs initialUserId={id} /> }
export function AlimenterPortefeuillePage() { return <Portefeuilles initialAction="fund" /> }
export function NouveauCommanditairePage() { return <Commanditaires initialAction="new" /> }

export function CommanditaireDetailPage() {
  const { id } = useParams()
  const [commanditaire, setCommanditaire] = useState(null)
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [commanditaires, history] = await Promise.all([
        getAdminCommanditaires(),
        getCommanditaireMouvements(id),
      ])
      setCommanditaire(commanditaires.find(item => item.id === id) || null)
      setMouvements(history || [])
    } catch {
      setError('Impossible de charger le commanditaire')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  return <Shell title="Détail du commanditaire">
    <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><RefreshCw className="h-4 w-4" /> Actualiser</button>
    {loading && <Loader2 className="h-6 w-6 animate-spin text-violet-600" />}
    {error && <p className="text-sm text-rose-600">{error}</p>}
    {!loading && commanditaire && <>
      <div className="grid gap-3 sm:grid-cols-4">
        {[['Disponible', commanditaire.soldeDisponible], ['Réservé', commanditaire.soldeReserve], ['Alimenté', commanditaire.totalAlimente], ['Distribué', commanditaire.totalDistribue]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-slate-950">{Number(value || 0).toLocaleString('fr-FR')} FCFA</p></div>)}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-lg font-bold">{commanditaire.societe || `${commanditaire.prenom} ${commanditaire.nom}`}</h2><p className="text-sm text-slate-500">{commanditaire.email} · {commanditaire.telephone}</p></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Montant</th><th className="px-4 py-3">Description</th></tr></thead><tbody className="divide-y divide-slate-100">{mouvements.map(mouvement => <tr key={mouvement.id}><td className="px-4 py-3 text-slate-500">{new Date(mouvement.createdAt).toLocaleString('fr-FR')}</td><td className="px-4 py-3 font-semibold">{mouvement.type}</td><td className="px-4 py-3">{Number(mouvement.montant || 0).toLocaleString('fr-FR')} FCFA</td><td className="px-4 py-3 text-slate-500">{mouvement.description || '-'}</td></tr>)}</tbody></table></div>
    </>}
  </Shell>
}

export function TentativesSouscriptionPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getTentativesSouscriptionEchouees().then(setItems).catch(() => setItems([])).finally(() => setLoading(false)) }, [])
  return <Shell title="Tentatives de souscription échouées">
    {loading ? <Loader2 className="h-6 w-6 animate-spin text-violet-600" /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Motif</th><th className="px-4 py-3">Détail</th><th className="px-4 py-3">Quantité</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item => <tr key={item.id}><td className="px-4 py-3 text-slate-500">{new Date(item.createdAt).toLocaleString('fr-FR')}</td><td className="px-4 py-3 font-semibold text-rose-600">{item.motif}</td><td className="px-4 py-3 text-slate-600">{item.detail}</td><td className="px-4 py-3">{item.quantite}</td></tr>)}</tbody></table></div>}
  </Shell>
}
