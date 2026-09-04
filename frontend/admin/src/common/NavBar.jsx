import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X, ChevronRight } from 'lucide-react'
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

function SidebarItem({ label, to, onNavigate }) {
    const Icon = iconMap[label] || IconDashboard
    return (
        <NavLink
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-all ${isActive
                    ? 'bg-white text-violet-700 ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`
            }
        >
            <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white text-current ring-1 ring-slate-200 group-hover:ring-violet-200">
                <Icon className="w-3.5 h-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate leading-none">{label}</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-50" />
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
    const [open, setOpen] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    return (
        <aside className="relative z-40 w-full border-b border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 lg:fixed lg:left-0 lg:top-0 lg:flex lg:h-screen lg:w-56 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-4">
            <div className="flex items-center justify-between gap-3 lg:mb-6 lg:px-1">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-600 shadow-sm">
                        <span className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full bg-emerald-400/80" />
                        <span className="relative text-[13px] font-black leading-none text-white">OH</span>
                    </div>
                    <div>
                        <p className="text-[13px] font-extrabold leading-none tracking-tight text-slate-950">OpportuniHub</p>
                        <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-violet-600">Administration</p>
                    </div>
                </div>
                <button
                    onClick={() => setOpen(o => !o)}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden"
                    aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            <nav className={`${open ? 'block' : 'hidden'} absolute inset-x-0 top-full z-40 max-h-[calc(100vh-65px)] space-y-5 overflow-y-auto border-b border-slate-200 bg-slate-50 px-4 py-4 shadow-lift lg:static lg:z-auto lg:block lg:max-h-none lg:flex-1 lg:overflow-visible lg:border-b-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
                {menuSections.map((section) => (
                    <div key={section.title}>
                        <p className="mb-1.5 px-2 text-[8px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{section.title}</p>
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <SidebarItem key={item.path} label={item.label} to={`/${item.path}`} onNavigate={() => setOpen(false)} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="mt-auto hidden lg:block">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                            {initiales(admin?.nom)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-none text-slate-900">{admin?.nom || 'Admin'}</p>
                            <p className="mt-1 truncate text-[10px] leading-none text-slate-400">{admin?.email || ''}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Se déconnecter"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-rose-600 hover:shadow-sm"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    )
}
