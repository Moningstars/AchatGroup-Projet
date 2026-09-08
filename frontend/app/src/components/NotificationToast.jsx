import { CheckCircle2, XCircle, Bell, TriangleAlert, X } from 'lucide-react'
import { useNotifications } from '../context/NotificationsContext'

const ICONS = {
  success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
  error:   <XCircle size={18} className="text-rose-500 shrink-0" />,
  info:    <Bell size={18} className="text-indigo-500 shrink-0" />,
  warning: <TriangleAlert size={18} className="text-amber-500 shrink-0" />,
}

export default function NotificationToast() {
  const { toasts, dismissToast } = useNotifications()

  if (!toasts.length) return null

  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed left-3 right-3 top-20 z-[200] flex flex-col items-stretch gap-2 sm:left-auto sm:w-[min(24rem,calc(100vw-2rem))] sm:items-end">
      {toasts.map(t => (
        <div
          key={t.id}
          role={t.style === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl animate-in slide-in-from-right-5 fade-in duration-300 dark:border-slate-700 dark:bg-slate-800"
        >
          {ICONS[t.style]}
          <p className="text-sm text-gray-700 dark:text-gray-200 flex-1 leading-snug">{t.msg}</p>
          <button
            type="button"
            aria-label="Fermer la notification"
            onClick={() => dismissToast(t.id)}
            className="text-gray-300 hover:text-gray-500 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
