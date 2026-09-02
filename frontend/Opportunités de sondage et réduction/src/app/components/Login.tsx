import { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Star, ArrowRight, Zap } from 'lucide-react';
import type { User } from '../App';

const DEMO_ACCOUNTS: (User & { email: string; password: string; tagline: string })[] = [
  {
    id: '1',
    name: 'Kofi Mensah',
    email: 'kofi@demo.com',
    password: 'demo123',
    balance: 50000,
    points: 1500,
    eligibilities: ['canalbox_fibre', 'haojue_moto'],
    tagline: 'Abonné fibre + moto Haojue'
  },
  {
    id: '2',
    name: 'Ama Adjei',
    email: 'ama@demo.com',
    password: 'demo123',
    balance: 25000,
    points: 320,
    eligibilities: ['canalbox_fibre'],
    tagline: 'Abonnée fibre Canalbox'
  },
  {
    id: '3',
    name: 'Kwame Boateng',
    email: 'kwame@demo.com',
    password: 'demo123',
    balance: 10000,
    points: 0,
    eligibilities: [],
    tagline: 'Nouveau membre'
  }
];

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const account = DEMO_ACCOUNTS.find(
        a => a.email === email && a.password === password
      );
      if (account) {
        const { email: _e, password: _p, tagline: _t, ...user } = account;
        onLogin(user);
      } else {
        setError('Email ou mot de passe incorrect. Utilisez un compte démo ci-dessous.');
        setLoading(false);
      }
    }, 900);
  };

  const handleDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    setActiveDemo(account.id);
    setTimeout(() => {
      const { email: _e, password: _p, tagline: _t, ...user } = account;
      onLogin(user);
    }, 600);
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, oklch(0.32 0.18 275) 0%, oklch(0.48 0.24 275) 40%, oklch(0.42 0.22 195) 100%)', borderRadius: '0 2.5rem 2.5rem 0' }}>

        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'oklch(0.75 0.20 195)' }} />
        <div className="absolute bottom-20 -left-16 w-64 h-64 rounded-full opacity-15"
          style={{ background: 'oklch(0.80 0.18 75)' }} />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'oklch(0.90 0.15 310)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'oklch(0.80 0.22 75)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              OpportuniHub
            </span>
          </div>
          <p className="text-white/60 text-sm pl-13" style={{ paddingLeft: '52px' }}>
            La puissance du groupe, pour vous
          </p>
        </div>

        {/* Hero text */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          <h2 className="text-5xl font-bold text-white leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Achetez ensemble,<br />
            <span style={{ color: 'oklch(0.85 0.20 75)' }}>économisez plus.</span>
          </h2>
        </motion.div>

        {/* Support */}
        <motion.div
          className="relative z-10 flex items-start gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}>
            <Star className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>Support disponible</div>
            <div className="text-white/60 text-sm leading-relaxed">Notre équipe vous accompagne à chaque étape.</div>
          </div>
        </motion.div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12 overflow-y-auto">
        <motion.div
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>OpportuniHub</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Bon retour !
            </h1>
            <p className="text-muted-foreground mt-1.5">Connectez-vous à votre compte</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{ background: 'oklch(0.96 0.02 25)', color: 'oklch(0.50 0.18 25)', border: '1px solid oklch(0.88 0.06 25)' }}
              >
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              style={{ background: loading ? 'oklch(0.65 0.18 275)' : 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>Connexion <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">Connexion rapide — comptes démo</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Demo accounts */}
          <div className="space-y-2.5">
            {DEMO_ACCOUNTS.map(account => (
              <motion.button
                key={account.id}
                onClick={() => handleDemoLogin(account)}
                disabled={loading || activeDemo !== null}
                className="w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center justify-between group"
                style={{
                  borderColor: activeDemo === account.id ? 'oklch(0.58 0.24 275)' : 'oklch(0.88 0.01 280)',
                  background: activeDemo === account.id ? 'oklch(0.96 0.03 275)' : 'oklch(0.99 0.005 280)'
                }}
                whileHover={{ scale: 1.01, borderColor: 'oklch(0.70 0.15 275)' }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: ['linear-gradient(135deg, oklch(0.58 0.24 275), oklch(0.48 0.22 195))', 'linear-gradient(135deg, oklch(0.60 0.20 150), oklch(0.55 0.18 195))', 'linear-gradient(135deg, oklch(0.72 0.18 75), oklch(0.65 0.22 25))'][parseInt(account.id) - 1] }}>
                    {account.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>{account.name}</div>
                    <div className="text-xs text-muted-foreground">{account.tagline} · {account.balance.toLocaleString()} FCFA</div>
                  </div>
                </div>
                {activeDemo === account.id ? (
                  <svg className="animate-spin w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </motion.button>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Plateforme de démonstration · Aucune vraie transaction
          </p>
        </motion.div>
      </div>
    </div>
  );
}
