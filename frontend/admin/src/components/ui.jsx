import { useRef, useState, useEffect } from 'react'
import { Loader2, Search } from 'lucide-react'

// ── Badge ─────────────────────────────────────────────────────────────────────

const BADGE_CFG = {
  emerald: { wrap: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  amber:   { wrap: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500' },
  rose:    { wrap: 'bg-rose-50 text-rose-600',       dot: 'bg-rose-500' },
  sky:     { wrap: 'bg-sky-50 text-sky-700',         dot: 'bg-sky-500' },
  violet:  { wrap: 'bg-violet-50 text-violet-700',   dot: 'bg-violet-600' },
  indigo:  { wrap: 'bg-indigo-50 text-indigo-700',   dot: 'bg-indigo-500' },
  gray:    { wrap: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400' },
}

export function Badge({ color = 'gray', children, className = '' }) {
  const cfg = BADGE_CFG[color] || BADGE_CFG.gray
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${cfg.wrap} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', noPad = false }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl ${noPad ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  )
}

// ── StatCard (KPI avec barre accent) ─────────────────────────────────────────

export function StatCard({ icon: Icon, label, value, sub, accentColor, alert, trend, trendLabel }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accentColor + '1A' }}>
          <Icon size={15} style={{ color: accentColor }} />
        </div>
        {alert > 0 ? (
          <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">⚠ {alert}</span>
        ) : trend != null ? (
          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {trendLabel || Math.abs(trend)}
          </span>
        ) : null}
      </div>
      <div className="text-[21px] font-black text-slate-900 tabular-nums leading-none">{value}</div>
      <div className="text-[11px] font-semibold text-slate-700 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
    </div>
  )
}

// ── Table primitives ──────────────────────────────────────────────────────────

export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  )
}

export function Th({ children, className = '' }) {
  return (
    <th className={`text-left text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap bg-white ${className}`}>
      {children}
    </th>
  )
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-3 py-2.5 border-b border-slate-100 text-[12.5px] align-middle ${className}`}>
      {children}
    </td>
  )
}

export function Tr({ children, className = '' }) {
  return (
    <tr className={`hover:bg-slate-50/80 transition-colors ${className}`}>
      {children}
    </tr>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

const PB_COLORS = {
  violet: 'bg-violet-600', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500',
  sky: 'bg-sky-500', amber: 'bg-amber-500', rose: 'bg-rose-500', slate: 'bg-slate-600',
}

export function ProgressBar({ value = 0, color = 'violet', className = '' }) {
  return (
    <div className={`h-1.5 rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${PB_COLORS[color] || 'bg-violet-600'}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 28, py = 'py-16' }) {
  return (
    <div className={`flex justify-center ${py}`}>
      <Loader2 size={size} className="animate-spin text-violet-600" />
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, sub, iconClass = '' }) {
  return (
    <div className="flex flex-col items-center py-14 gap-3 text-center">
      <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-100">
        <Icon size={24} className={`text-slate-300 ${iconClass}`} />
      </div>
      <p className="font-semibold text-slate-500 text-sm">{title}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

// ── SearchInput ───────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', className = 'w-52' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-[12.5px] bg-slate-50 outline-none focus:border-violet-400 focus:bg-white transition"
      />
    </div>
  )
}

// ── FilterPill ────────────────────────────────────────────────────────────────

export function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
        active
          ? 'bg-violet-700 text-white border-violet-700'
          : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-700'
      }`}
    >
      {label}
    </button>
  )
}

// ── ActionBtn ─────────────────────────────────────────────────────────────────

const AB_VARIANTS = {
  default: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  green:   'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  red:     'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100',
  violet:  'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  amber:   'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
}

export function ActionBtn({ onClick, disabled, variant = 'default', children, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition disabled:opacity-50 ${AB_VARIANTS[variant] || AB_VARIANTS.default} ${className}`}
    >
      {children}
    </button>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      {tabs.map((tab, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${
            active === i
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ── AreaChart SVG ─────────────────────────────────────────────────────────────

const CHART_COLORS = {
  violet: '#6D28D9', indigo: '#4F46E5', emerald: '#059669',
  sky: '#0284C7', amber: '#D97706', rose: '#DC2626',
}

export function AreaChart({
  data = [], index, categories = [], colors = ['violet'],
  showGridLines = false, valueFormatter, className = '',
}) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(400)
  const H = 180
  const pad = { top: 14, right: 16, bottom: 28, left: 40 }

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    ro.observe(containerRef.current)
    setWidth(containerRef.current.offsetWidth || 400)
    return () => ro.disconnect()
  }, [])

  if (!data.length) {
    return (
      <div ref={containerRef} className={`flex items-center justify-center text-slate-300 text-sm ${className}`} style={{ height: H }}>
        Aucune donnée disponible
      </div>
    )
  }

  const cat = categories[0]
  const color = CHART_COLORS[colors[0]] || CHART_COLORS.violet
  const values = data.map(d => Number(d[cat]) || 0)
  const max = Math.max(...values, 1)
  const cW = width - pad.left - pad.right
  const cH = H - pad.top - pad.bottom
  const xs = values.map((_, i) => pad.left + (i / Math.max(values.length - 1, 1)) * cW)
  const ys = values.map(v => pad.top + (1 - v / max) * cH)

  const linePath = xs.reduce((acc, x, i) => {
    if (i === 0) return `M${x},${ys[i]}`
    const cpx = (xs[i - 1] + x) / 2
    return `${acc} C${cpx},${ys[i - 1]} ${cpx},${ys[i]} ${x},${ys[i]}`
  }, '')
  const areaPath = `${linePath} L${xs[xs.length - 1]},${pad.top + cH} L${xs[0]},${pad.top + cH}Z`
  const gradId = `ag-${cat?.replace(/\W/g, '')}`

  return (
    <div ref={containerRef} className={className} style={{ height: H }}>
      <svg width={width} height={H}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {showGridLines && [0, 1, 2, 3].map(i => (
          <line key={i}
            x1={pad.left} x2={width - pad.right}
            y1={pad.top + (i / 3) * cH} y2={pad.top + (i / 3) * cH}
            stroke="#F0F0F8" strokeWidth="1"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

        {xs.map((x, i) => (
          i === xs.length - 1
            ? <circle key={i} cx={x} cy={ys[i]} r="5" fill="white" stroke={color} strokeWidth="2" />
            : <circle key={i} cx={x} cy={ys[i]} r="2.5" fill={color} />
        ))}

        {data.map((d, i) => (
          <text key={i} x={xs[i]} y={H - 7}
            textAnchor={i === 0 ? 'start' : i === xs.length - 1 ? 'end' : 'middle'}
            fontSize="9.5" fontWeight="600" fill="#9898B0">
            {d[index]}
          </text>
        ))}

        {[max, Math.round(max / 2), 0].map((v, i) => (
          <text key={i} x={pad.left - 5} y={pad.top + (i / 2) * cH + 4}
            textAnchor="end" fontSize="9" fontWeight="600" fill="#9898B0">
            {valueFormatter ? valueFormatter(v) : v}
          </text>
        ))}
      </svg>
    </div>
  )
}
