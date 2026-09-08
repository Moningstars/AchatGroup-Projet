import { NavLink, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Wallet, ClipboardList, History } from 'lucide-react'

const tabs = [
  { path: '/',             Icon: Home,          label: 'Accueil'    },
  { path: '/opportunites', Icon: ShoppingBag,   label: 'Miitchs'    },
  { path: '/portefeuille', Icon: Wallet,        label: 'Solde', isCenter: true },
  { path: '/sondages',     Icon: ClipboardList, label: 'Miitchs i'  },
  { path: '/historique',   Icon: History,       label: 'Historique' },
]

export default function MobileTabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-[4.6rem] items-end justify-around px-2 pb-2 pt-2">
        {tabs.map(({ path, Icon, label, isCenter }) => {
          const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path)

          if (isCenter) {
            return (
              <NavLink
                key={path}
                to={path}
                aria-label={label}
                className="-mt-6 flex min-w-0 flex-1 flex-col items-center gap-1 active:scale-90 transition-transform"
              >
                <span className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-white shadow-xl ${isActive ? 'bg-primary' : 'bg-primary/80'}`}>
                  <Icon size={24} color="white" strokeWidth={2} />
                </span>
                <span className={`max-w-full truncate text-[9px] font-black leading-none ${isActive ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
              </NavLink>
            )
          }

          return (
            <NavLink
              key={path}
              to={path}
              aria-label={label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pb-0.5 pt-1 active:scale-90 transition-transform"
            >
              <Icon
                size={23}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? '#0A3D62' : '#9CA3AF'}
              />
              <span className={`max-w-full truncate text-[9px] font-black leading-none ${isActive ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
              <span className={`h-1 w-1 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
