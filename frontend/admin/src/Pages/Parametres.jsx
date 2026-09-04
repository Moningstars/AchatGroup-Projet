import { Info, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Badge, Card } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Parametres() {
  const { admin } = useAuth()
  const initiales = admin?.nom
    ? admin.nom.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  const accountFields = [
    { label: 'Nom', value: admin?.nom, icon: UserRound },
    { label: 'Email', value: admin?.email, icon: Mail },
    { label: 'Rôle', value: admin?.role, icon: ShieldCheck },
    { label: 'Identifiant', value: admin?.id, icon: Info, mono: true },
  ]

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden">
        <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-100" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-violet-600 text-2xl font-black text-white shadow-lg shadow-violet-200">
            {initiales}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-black tracking-tight text-slate-950">{admin?.nom || 'Administrateur'}</h2>
              <Badge color="violet">{admin?.role || 'ADMIN'}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">{admin?.email || 'Adresse email non disponible'}</p>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">Compte actuellement connecté à l’espace de gestion OpportuniHub.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <div className="mb-5">
            <h3 className="text-base font-black text-slate-950">Informations du compte</h3>
            <p className="mt-1 text-xs text-slate-400">Données d’identification de l’administrateur.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {accountFields.map(({ label, value, icon: Icon, mono }) => (
              <div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-200">
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className={`mt-1 truncate text-sm font-bold text-slate-900 ${mono ? 'font-mono text-xs text-slate-500' : ''}`}>{value || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-slate-950 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300 text-slate-950">
            <Info size={19} />
          </div>
          <h3 className="mt-6 text-lg font-black">À propos</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">Informations techniques de la plateforme.</p>
          <dl className="mt-6 space-y-4">
            {[
              ['Produit', 'OpportuniHub'],
              ['Version', '1.0.0'],
              ['Backend', 'Spring Boot 3.3'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-sm font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  )
}
