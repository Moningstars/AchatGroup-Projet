import { NavLink, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Wallet, ClipboardList, History } from 'lucide-react'

const tabs = [
  { path: '/',             Icon: Home,          label: 'Accueil'    },
  { path: '/opportunites', Icon: ShoppingBag,   label: 'Offres'     },
  { path: '/portefeuille', Icon: Wallet,        label: 'Solde', isCenter: true },
  { path: '/sondages',     Icon: ClipboardList, label: 'Sondages'   },
  { path: '/historique',   Icon: History,       label: 'Historique' },
]

export default function MobileTabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-end justify-around px-2 pt-2 pb-4">
        {tabs.map(({ path, Icon, label, isCenter }) => {
          const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path)

          if (isCenter) {
            return (
              <NavLink
                key={path}
                to={path}
                className={`-mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-white active:scale-90 transition-transform ${
                  isActive ? 'bg-primary' : 'bg-primary/80'
                }`}
              >
                <Icon size={24} color="white" strokeWidth={2} />
              </NavLink>
            )
          }

          return (
            <NavLink
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 pt-1 px-3 active:scale-90 transition-transform"
            >
              <Icon
                size={26}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? '#0A3D62' : '#9CA3AF'}
              />
              {isActive && <span className="w-1 h-1 rounded-full bg-accent" />}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
