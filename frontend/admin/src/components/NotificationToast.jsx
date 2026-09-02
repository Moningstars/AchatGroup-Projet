import { CheckCircle2, XCircle, Bell, X } from 'lucide-react'
import { useNotifications } from '../context/NotificationsContext'

const ICONS = {
  success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
  error:   <XCircle size={18} className="text-rose-500 shrink-0" />,
  info:    <Bell size={18} className="text-indigo-500 shrink-0" />,
}

export default function NotificationToast() {
  const { toasts, dismissToast } = useNotifications()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-3 bg-white border border-slate-100 rounded-2xl shadow-xl px-4 py-3 max-w-[320px] animate-in slide-in-from-right-5 fade-in duration-300"
        >
          {ICONS[t.style]}
          <p className="text-sm text-slate-700 flex-1 leading-snug">{t.msg}</p>
          <button
            onClick={() => dismissToast(t.id)}
            className="text-slate-300 hover:text-slate-500 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
