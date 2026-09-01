import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { menuSections } from '../Pages/adminData'
import { IconDashboard, IconBox, IconSurvey, IconUsers, IconWallet, IconSponsor, IconSettings, IconKyc, IconBanniere } from './icons'
import { useAuth } from '../context/AuthContext'

const iconMap = {
    "Vue d'ensemble": IconDashboard,
    "Opportunités": IconBox,
    "Sondages": IconSurvey,
    "Utilisateurs": IconUsers,
    "Portefeuilles": IconWallet,
    "Commanditaires": IconSponsor,
    "Bannières": IconBanniere,
    "KYC": IconKyc,
    "Paramètres": IconSettings,
}

function SidebarItem({ label, to }) {
    const Icon = iconMap[label] || IconDashboard
    return (
        <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`
            }
        >
            <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-current">
                <Icon className="w-[15px] h-[15px]" />
            </span>
            <span className="leading-none">{label}</span>
        </NavLink>
    )
}

function initiales(nom) {
    if (!nom) return 'AD'
    return nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function NavBar() {
    const { admin, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [open, setOpen] = useState(false)

    useEffect(() => { setOpen(false) }, [location.pathname])

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    return (
        <aside className="relative w-full border-b border-slate-800 bg-slate-950 px-4 py-4 text-slate-100 shadow-xl shadow-slate-950/20 lg:fixed lg:left-0 lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:overflow-y-auto xl:w-80 lg:border-b-0 lg:border-r lg:border-r-slate-800/60 lg:pb-4">
            <div className="flex items-center justify-between gap-3 lg:mb-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                        <span className="text-[13px] font-black leading-none text-white">OH</span>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold leading-none text-slate-100">OpportuniHub</p>
                        <p className="mt-0.5 text-[11px] leading-none text-slate-400">Administration</p>
                    </div>
                </div>
                <button
                    onClick={() => setOpen(o => !o)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-100 lg:hidden"
                    aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            <nav className={`${open ? 'block' : 'hidden'} absolute inset-x-0 top-full z-40 max-h-[70vh] space-y-6 overflow-y-auto border-b border-slate-800/60 bg-slate-950 px-4 py-4 shadow-2xl shadow-slate-950/50 lg:static lg:z-auto lg:block lg:max-h-none lg:flex-1 lg:overflow-visible lg:border-b-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
                {menuSections.map((section) => (
                    <div key={section.title}>
                        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{section.title}</p>
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <SidebarItem key={item.path} label={item.label} to={`/${item.path}`} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="mt-auto hidden lg:block">
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
                            {initiales(admin?.nom)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-none text-slate-100">{admin?.nom || 'Admin'}</p>
                            <p className="mt-0.5 truncate text-[11px] leading-none text-slate-500">{admin?.email || ''}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Se déconnecter"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    )
}
