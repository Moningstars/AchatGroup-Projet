import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getSolde, getKycStatus } from '../services/api'

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

const KYC_CONFIG = {
  AUCUN:      { icon: 'ti-id-badge-off',  color: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-500', label: 'Non vérifié',             desc: 'Vérifiez votre identité pour débloquer les retraits.' },
  EN_ATTENTE: { icon: 'ti-clock-hour-4',  color: 'bg-blue-50 border-blue-200',    iconColor: 'text-blue-500',   label: 'En cours d\'examen',       desc: 'Votre dossier est en cours de vérification par notre équipe.' },
  VERIFIE:    { icon: 'ti-circle-check',   color: 'bg-green-50 border-green-200',  iconColor: 'text-success',    label: 'Identité vérifiée',        desc: 'Vous pouvez effectuer des retraits sans restriction.' },
  REJETE:     { icon: 'ti-circle-x',       color: 'bg-red-50 border-red-200',      iconColor: 'text-urgency',    label: 'Vérification rejetée',     desc: 'Votre dossier a été rejeté. Veuillez soumettre de nouveau.' },
}

export default function Profil() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [solde, setSolde] = useState(null)
  const [loadingSolde, setLoadingSolde] = useState(true)
  const [kyc, setKyc] = useState(null)

  useEffect(() => {
    getSolde()
      .then(setSolde)
      .catch(() => setSolde(null))
      .finally(() => setLoadingSolde(false))
    getKycStatus()
      .then(setKyc)
      .catch(() => setKyc({ niveauVerification: 'AUCUN' }))
  }, [])

  if (!user) return null

  const initiales = user.nom
    ? user.nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const soldeDisponible = Number(solde?.soldeDisponible || 0)
  const soldeGele = Number(solde?.soldeGele || 0)

  return (
    <div className="min-h-screen bg-bg-light pb-28 selection:bg-accent/30 overflow-x-hidden">

      {/* ── Hero Header ── */}
      <div className="bg-primary px-6 pt-14 pb-10 rounded-b-[2.5rem] relative overflow-hidden shadow-xl shadow-primary/20 mb-6">
        <div className="relative z-10 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white text-3xl font-heading font-black shadow-lg">
              {initiales}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-primary" />
          </div>
          <div className="text-white">
            <h2 className="text-2xl font-heading font-extrabold tracking-tight leading-none mb-2">
              {user.nom || 'Utilisateur'}
            </h2>
            <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10">
              <i className="ti ti-phone text-[11px] text-accent" />
              <p className="text-xs font-bold tracking-wide text-white/80">{user.telephone}</p>
            </div>
          </div>
        </div>

        {/* Decorative bg icons */}
        <div className="absolute -right-16 -top-16 opacity-[0.07] rotate-12 pointer-events-none">
          <i className="ti ti-building-community text-[200px] text-white" />
        </div>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#fff 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }} />
      </div>

      <div className="max-w-md mx-auto px-5 space-y-5">

        {/* ── Wallet Card ── */}
        <button
          onClick={() => navigate('/portefeuille')}
          className="w-full bg-gradient-to-br from-accent to-[#FF9F1C] p-6 rounded-3xl text-primary shadow-xl shadow-accent/20 relative overflow-hidden group active:scale-[0.98] transition-transform text-left"
        >
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-white/30 rounded-2xl flex items-center justify-center border border-white/40 backdrop-blur-md shadow-sm">
                <i className="ti ti-wallet text-2xl font-bold text-primary" />
              </div>
              <div className="bg-primary/80 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                Actif
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">
                Solde Disponible
              </p>
              {loadingSolde ? (
                <Loader2 size={20} className="animate-spin text-primary/50 mt-2" />
              ) : (
                <h3 className="text-4xl font-heading font-black flex items-baseline gap-2">
                  {fmt(soldeDisponible)}
                  <span className="text-xs font-extrabold bg-primary/10 px-2 py-0.5 rounded-lg">FCFA</span>
                </h3>
              )}
              {soldeGele > 0 && (
                <p className="text-xs font-bold text-primary/60 mt-1.5">
                  {fmt(soldeGele)} FCFA gelés (achats en cours)
                </p>
              )}
            </div>
          </div>
          <i className="ti ti-circles absolute -right-12 -bottom-12 text-white/20 text-[180px]" />
        </button>

        {/* ── KYC Status Card ── */}
        {kyc && (() => {
          const cfg = KYC_CONFIG[kyc.niveauVerification] || KYC_CONFIG.AUCUN
          const canSubmit = kyc.niveauVerification === 'AUCUN' || kyc.niveauVerification === 'REJETE'
          return (
            <div className={`border-2 rounded-3xl p-5 flex items-start gap-4 ${cfg.color}`}>
              <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                <i className={`ti ${cfg.icon} text-2xl ${cfg.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-sm text-primary">{cfg.label}</p>
                  {kyc.niveauVerification === 'VERIFIE' && (
                    <span className="bg-success/10 text-success text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">KYC</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-semibold">{cfg.desc}</p>
                {canSubmit && (
                  <button
                    onClick={() => navigate('/verification')}
                    className="mt-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-transform"
                  >
                    {kyc.niveauVerification === 'REJETE' ? 'Resoumettre' : 'Vérifier mon identité'}
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Actions ── */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 opacity-70">
            Mon compte
          </p>

          <button
            onClick={() => navigate('/portefeuille')}
            className="w-full flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform group text-primary"
          >
            <div className="w-14 h-14 bg-bg-light text-primary rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
              <i className="ti ti-credit-card text-2xl" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-extrabold text-base leading-none mb-1">Mon Portefeuille</p>
              <p className="text-xs text-gray-400 font-semibold">Recharger · Retirer · Historique</p>
            </div>
            <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-300">
              <i className="ti ti-arrow-right text-sm" />
            </div>
          </button>

          <button
            onClick={() => navigate('/historique')}
            className="w-full flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform group text-primary"
          >
            <div className="w-14 h-14 bg-bg-light text-primary rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
              <i className="ti ti-history text-2xl" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-extrabold text-base leading-none mb-1">Historique</p>
              <p className="text-xs text-gray-400 font-semibold">Toutes vos transactions</p>
            </div>
            <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-300">
              <i className="ti ti-arrow-right text-sm" />
            </div>
          </button>

          <button
            onClick={async () => { await logout(); navigate('/connexion') }}
            className="w-full flex items-center gap-4 bg-red-50 border border-red-100 p-5 rounded-3xl active:scale-[0.98] transition-transform text-red-600"
          >
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <i className="ti ti-power text-2xl text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black uppercase tracking-widest text-sm">Déconnexion</p>
            </div>
            <i className="ti ti-chevron-right text-red-200" />
          </button>
        </div>

        {/* ── Version ── */}
        <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest pt-4">
          OpportuniHub · v1.0
        </p>
      </div>
    </div>
  )
}
