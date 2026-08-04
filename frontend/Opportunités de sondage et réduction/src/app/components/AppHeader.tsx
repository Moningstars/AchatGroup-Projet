import { useState } from 'react';
import { Zap, Menu, X } from 'lucide-react';
import type { Screen } from '../App';

interface AppHeaderProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const NAV_ITEMS: { label: string; screen: Screen }[] = [
  { label: 'Accueil', screen: 'home' },
  { label: 'Opportunités', screen: 'opportunities' },
  { label: 'Qui sommes-nous', screen: 'about' },
  { label: 'Contact', screen: 'contact' },
];

export function AppHeader({ currentScreen, onNavigate }: AppHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (screen: Screen) =>
    screen === 'home'
      ? currentScreen === 'home' || currentScreen === 'opportunity-detail' || currentScreen === 'survey-detail'
      : currentScreen === screen;

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => { onNavigate('home'); setMobileOpen(false); }}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}
            >
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span
              className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              OpportuniHub
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ label, screen }) => (
              <button
                key={screen}
                onClick={() => onNavigate(screen)}
                className="relative px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: isActive(screen) ? 'oklch(0.48 0.24 275)' : 'oklch(0.45 0.02 280)',
                  fontFamily: 'Outfit, sans-serif'
                }}
              >
                {label}
                {isActive(screen) && (
                  <span
                    className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* CTA desktop */}
          <button
            className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))', fontFamily: 'Outfit, sans-serif' }}
            onClick={() => onNavigate('opportunities')}
          >
            Voir les offres
          </button>

          {/* Mobile burger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          {NAV_ITEMS.map(({ label, screen }) => (
            <button
              key={screen}
              onClick={() => { onNavigate(screen); setMobileOpen(false); }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: isActive(screen) ? 'oklch(0.95 0.03 275)' : 'transparent',
                color: isActive(screen) ? 'oklch(0.48 0.24 275)' : 'oklch(0.35 0.02 280)',
                fontFamily: 'Outfit, sans-serif'
              }}
            >
              {label}
            </button>
          ))}
          <div className="pt-2 pb-1">
            <button
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}
              onClick={() => { onNavigate('opportunities'); setMobileOpen(false); }}
            >
              Voir les offres
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
