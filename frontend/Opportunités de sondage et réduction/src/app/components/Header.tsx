import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Wallet, Home, Award, LogOut, ChevronDown, User, Zap } from 'lucide-react';
import type { User as UserType, Screen } from '../App';

interface HeaderProps {
  user: UserType;
  isAuthenticated: boolean;
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onLoginClick: () => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = end;
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}

export function Header({ user, isAuthenticated, currentScreen, onNavigate, onLogout, onLoginClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems: { screen: Screen; label: string; icon: React.ReactNode; authRequired?: boolean }[] = [
    { screen: 'home', label: 'Accueil', icon: <Home className="w-4 h-4" /> },
    { screen: 'wallet', label: 'Portefeuille', icon: <Wallet className="w-4 h-4" />, authRequired: true }
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo + nav */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hidden sm:block"
                style={{ fontFamily: 'Outfit, sans-serif' }}>
                OpportuniHub
              </span>
            </div>

            <nav className="flex gap-1">
              {navItems.filter(item => !item.authRequired || isAuthenticated).map(({ screen, label, icon }) => (
                <button
                  key={screen}
                  onClick={() => onNavigate(screen)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm transition-all font-medium ${
                    currentScreen === screen
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isAuthenticated && (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Se connecter</span>
                <span className="sm:hidden">Connexion</span>
              </button>
            )}
            {isAuthenticated && (<>
            {/* Balance chips */}
            <div className="hidden sm:flex items-center gap-2">
              <motion.div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20"
                style={{ background: 'oklch(0.97 0.02 275)' }}
                key={user.balance}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 0.4 }}
              >
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-primary text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  <AnimatedNumber value={user.balance} />
                </span>
                <span className="text-xs text-muted-foreground">FCFA</span>
              </motion.div>

              <motion.div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warning/20"
                style={{ background: 'oklch(0.98 0.02 75)' }}
                key={user.points}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 0.4 }}
              >
                <Award className="w-3.5 h-3.5 text-warning" />
                <span className="font-semibold text-warning text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  <AnimatedNumber value={user.points} />
                </span>
                <span className="text-xs text-muted-foreground">pts</span>
              </motion.div>
            </div>

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, oklch(0.58 0.24 275), oklch(0.42 0.22 195))' }}>
                  {user.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:block"
                  style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border"
                      style={{ background: 'linear-gradient(135deg, oklch(0.97 0.02 275), oklch(0.97 0.02 195))' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, oklch(0.58 0.24 275), oklch(0.42 0.22 195))' }}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.eligibilities.length} éligibilité(s)</div>
                        </div>
                      </div>

                      {/* Mobile balances */}
                      <div className="flex gap-2 mt-3 sm:hidden">
                        <div className="flex-1 rounded-lg px-2.5 py-2 text-center border border-primary/20"
                          style={{ background: 'oklch(1 0 0)' }}>
                          <div className="text-xs text-muted-foreground">Solde</div>
                          <div className="text-sm font-bold text-primary" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {user.balance.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">FCFA</div>
                        </div>
                        <div className="flex-1 rounded-lg px-2.5 py-2 text-center border border-warning/20"
                          style={{ background: 'oklch(1 0 0)' }}>
                          <div className="text-xs text-muted-foreground">Points</div>
                          <div className="text-sm font-bold text-warning" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {user.points.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">pts</div>
                        </div>
                      </div>
                    </div>

                    {/* Eligibilities */}
                    {user.eligibilities.length > 0 && (
                      <div className="px-4 py-2.5 border-b border-border">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Éligibilités</div>
                        <div className="flex flex-wrap gap-1.5">
                          {user.eligibilities.map(e => (
                            <span key={e} className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: 'oklch(0.92 0.06 150)', color: 'oklch(0.35 0.12 150)' }}>
                              {e.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Menu items */}
                    <div className="p-1.5">
                      <button
                        onClick={() => { onNavigate('wallet'); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                        Mon portefeuille
                      </button>
                      <button
                        onClick={() => { onNavigate('home'); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        Mon profil
                      </button>
                    </div>

                    <div className="border-t border-border p-1.5">
                      <button
                        onClick={() => { setMenuOpen(false); onLogout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                        style={{ color: 'oklch(0.52 0.18 25)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.97 0.02 25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </motion.div>
              )}
            </div>
            </>)}
          </div>
        </div>
      </div>
    </header>
  );
}
