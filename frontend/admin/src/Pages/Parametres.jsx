import { Card, Title, Text, Badge, Grid } from '@tremor/react'
import { useAuth } from '../context/AuthContext'

export default function Parametres() {
  const { admin } = useAuth()

  const initiales = admin?.nom
    ? admin.nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <div className="space-y-4">
      <Card>
        <Title>Paramètres</Title>
        <Text>Informations du compte administrateur connecté.</Text>
      </Card>

      <Card>
        <Title className="mb-4">Profil admin</Title>

        <div className="flex items-center gap-5 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-xl font-bold text-white">
            {initiales}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">{admin?.nom || '—'}</p>
            <p className="text-sm text-slate-500">{admin?.email || '—'}</p>
            <div className="mt-1">
              <Badge color="violet">{admin?.role || 'ADMIN'}</Badge>
            </div>
          </div>
        </div>

        <Grid numItemsSm={2} className="gap-4">
          {[
            { label: 'Nom', value: admin?.nom },
            { label: 'Email', value: admin?.email },
            { label: 'Rôle', value: admin?.role },
            { label: 'Identifiant', value: admin?.id, mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</Text>
              <p className={`mt-2 text-sm font-semibold text-slate-900 truncate ${mono ? 'font-mono text-xs text-slate-500' : ''}`}>
                {value || '—'}
              </p>
            </div>
          ))}
        </Grid>
      </Card>

      <Card>
        <Title className="mb-4">À propos de la plateforme</Title>
        <Grid numItemsSm={3} className="gap-4">
          {[
            { label: 'Nom', value: 'OpportuniHub' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Backend', value: 'Spring Boot 3.3' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</Text>
              <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </Grid>
      </Card>
    </div>
  )
}
