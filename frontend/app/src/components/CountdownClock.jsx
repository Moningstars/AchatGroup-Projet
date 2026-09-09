import { Clock3 } from 'lucide-react'
import { useCountdown } from '../hooks/useCountdown'

const pad = value => String(value ?? 0).padStart(2, '0')

export default function CountdownClock({
  dateExpiration,
  compact = false,
  fullWidth = false,
  title = '',
  subtitle = '',
  className = '',
}) {
  const countdown = useCountdown(dateExpiration, 1_000)
  if (!countdown) return null

  if (countdown.expired) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-black uppercase text-red-200 ${compact ? 'text-[8px]' : 'text-[10px]'} ${className}`}>
        <Clock3 size={compact ? 10 : 13} />
        Terminé
      </div>
    )
  }

  const units = [
    { label: 'Jours', compactLabel: 'J', value: countdown.days },
    { label: 'Heures', compactLabel: 'H', value: countdown.hours },
    { label: 'Min', compactLabel: 'M', value: countdown.minutes },
    { label: 'Sec', compactLabel: 'S', value: countdown.seconds },
  ]

  return (
    <div className={`min-w-0 ${fullWidth ? 'w-full' : ''} ${className}`}>
      {(title || subtitle) && (
        <div className={`mb-2 flex items-center gap-2 ${compact ? 'hidden' : ''}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Clock3 size={14} />
          </span>
          <div className="min-w-0">
            {title && <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">{title}</p>}
            {subtitle && <p className="truncate text-[9px] font-bold text-white/45">{subtitle}</p>}
          </div>
        </div>
      )}

      <div className={`flex items-center ${fullWidth ? 'w-full' : ''} ${compact ? 'gap-0.5' : 'gap-1.5'}`}>
        {units.map((unit, index) => (
          <div key={unit.label} className={`flex min-w-0 items-center ${fullWidth ? 'flex-1' : ''} ${compact ? 'gap-0.5' : 'gap-1.5'}`}>
            <div className={`border border-white/10 bg-white/10 text-center backdrop-blur-sm ${fullWidth ? 'w-full min-w-0' : ''} ${compact ? 'min-w-[25px] px-1 py-1' : 'min-w-10 px-2 py-1.5'}`}>
              <span className={`block font-heading font-black leading-none text-white tabular-nums ${compact ? 'text-[9px]' : 'text-sm'}`}>
                {pad(unit.value)}
              </span>
              <span className={`mt-1 block font-black uppercase tracking-wider text-white/50 ${compact ? 'text-[5px]' : 'text-[7px]'}`}>
                {compact ? unit.compactLabel : unit.label}
              </span>
            </div>
            {index < units.length - 1 && (
              <span className={`font-heading font-black text-white/35 ${compact ? 'text-[9px]' : 'text-sm'}`}>:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
