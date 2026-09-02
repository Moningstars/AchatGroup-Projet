import { useState } from 'react';
import { motion } from 'motion/react';
import { Star, ArrowRight, Zap, X } from 'lucide-react';
import type { User } from '../App';

const DEMO_ACCOUNTS: (User & { telephone: string; tagline: string })[] = [
  {
    id: '1',
    name: 'Kofi Mensah',
    telephone: '+22890000001',
    balance: 50000,
    points: 1500,
    eligibilities: ['canalbox_fibre', 'haojue_moto'],
    tagline: 'Abonné fibre + moto Haojue'
  },
  {
    id: '2',
    name: 'Ama Adjei',
    telephone: '+22890000002',
    balance: 25000,
    points: 320,
    eligibilities: ['canalbox_fibre'],
    tagline: 'Abonnée fibre Canalbox'
  },
  {
    id: '3',
    name: 'Kwame Boateng',
    telephone: '+22890000003',
    balance: 10000,
    points: 0,
    eligibilities: [],
    tagline: 'Nouveau membre'
  }
];

interface AuthModalProps {
  onLogin: (telephone: string) => Promise<void>;
  onClose: () => void;
}

export function AuthModal({ onLogin, onClose }: AuthModalProps) {
  const [telephone, setTelephone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    onLogin(telephone.trim())
      .catch(err => setError(err instanceof Error ? err.message : 'Connexion impossible'))
      .finally(() => setLoading(false));
  };

  const handleDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    setActiveDemo(account.id);
    onLogin(account.telephone)
      .catch(err => setError(err instanceof Error ? err.message : 'Connexion impossible'))
      .finally(() => setActiveDemo(null));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 10, 30, 0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-3xl flex overflow-hidden shadow-2xl"
        style={{ borderRadius: '1.5rem', maxHeight: '90vh' }}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Left panel */}
        <div
          className="hidden sm:flex w-[42%] relative flex-col justify-between p-8 overflow-hidden shrink-0"
          style={{
            background: 'linear-gradient(135deg, oklch(0.32 0.18 275) 0%, oklch(0.48 0.24 275) 40%, oklch(0.42 0.22 195) 100%)',
            borderRadius: '1.5rem 2.5rem 2.5rem 1.5rem'
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20"
            style={{ background: 'oklch(0.75 0.20 195)' }} />
          <div className="absolute bottom-10 -left-10 w-40 h-40 rounded-full opacity-15"
            style={{ background: 'oklch(0.80 0.18 75)' }} />
          <div className="absolute top-1/2 right-4 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'oklch(0.90 0.15 310)' }} />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'oklch(0.80 0.22 75)' }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                OpportuniHub
              </span>
            </div>
            <p className="text-white/55 text-xs" style={{ paddingLeft: '42px' }}>
              La puissance du groupe, pour vous
            </p>
          </div>

          {/* Hero text */}
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Achetez ensemble,<br />
              <span style={{ color: 'oklch(0.85 0.20 75)' }}>économisez plus.</span>
            </h2>
          </div>

          {/* Support */}
          <div className="relative z-10 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}>
              <Star className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>Support disponible</div>
              <div className="text-white/60 text-xs leading-relaxed">Notre équipe vous accompagne à chaque étape.</div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 bg-card flex flex-col overflow-y-auto" style={{ borderRadius: '0 1.5rem 1.5rem 0' }}>
          {/* Close button */}
          <div className="flex justify-end p-4 pb-0 shrink-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-7 pb-7 pt-2 flex flex-col gap-5">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 sm:hidden">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>OpportuniHub</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Connectez-vous
              </h1>
              <p className="text-muted-foreground text-sm mt-1">pour participer à cette opportunité</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={e => setTelephone(e.target.value)}
                  placeholder="+22890000001"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                  required
                />
              </div>

              {error && (
                <div
                  className="rounded-lg px-3.5 py-2.5 text-xs"
                  style={{ background: 'oklch(0.96 0.02 25)', color: 'oklch(0.50 0.18 25)', border: '1px solid oklch(0.88 0.06 25)' }}
                >
                  {error}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-sm"
                style={{ background: loading ? 'oklch(0.65 0.18 275)' : 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>Connexion <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Comptes démo</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Demo accounts */}
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(account => (
                <motion.button
                  key={account.id}
                  onClick={() => handleDemoLogin(account)}
                  disabled={loading || activeDemo !== null}
                  className="w-full text-left px-3.5 py-3 rounded-xl border transition-all flex items-center justify-between group"
                  style={{
                    borderColor: activeDemo === account.id ? 'oklch(0.58 0.24 275)' : 'oklch(0.88 0.01 280)',
                    background: activeDemo === account.id ? 'oklch(0.96 0.03 275)' : 'oklch(0.99 0.005 280)'
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: ['linear-gradient(135deg, oklch(0.58 0.24 275), oklch(0.48 0.22 195))', 'linear-gradient(135deg, oklch(0.60 0.20 150), oklch(0.55 0.18 195))', 'linear-gradient(135deg, oklch(0.72 0.18 75), oklch(0.65 0.22 25))'][parseInt(account.id) - 1] }}
                    >
                      {account.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>{account.name}</div>
                      <div className="text-xs text-muted-foreground">{account.tagline} · {account.balance.toLocaleString()} FCFA</div>
                    </div>
                  </div>
                  {activeDemo === account.id ? (
                    <svg className="animate-spin w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
