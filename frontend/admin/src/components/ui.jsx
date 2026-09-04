import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react'

export function Pagination({ page, totalItems, onPageChange, pageSize = 10 }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  useEffect(() => {
    if (page > totalPages) onPageChange(totalPages)
  }, [page, totalPages, onPageChange])

  if (totalItems <= pageSize) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(number => number === 1 || number === totalPages || Math.abs(number - page) <= 1)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] font-semibold text-slate-500">Résultats {start}–{end} sur {totalItems}</p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Page précédente"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /></button>
        {visiblePages.map((number, index) => {
          const previous = visiblePages[index - 1]
          return <span key={number} className="contents">
            {previous && number - previous > 1 && <span className="px-1 text-xs text-slate-400">…</span>}
            <button type="button" onClick={() => onPageChange(number)} aria-current={number === page ? 'page' : undefined}
              className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition ${number === page ? 'bg-violet-700 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700'}`}>{number}</button>
          </span>
        })}
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Page suivante"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={14} /></button>
      </nav>
    </div>
  )
}

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
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold ${cfg.wrap} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', noPad = false }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft ${noPad ? '' : 'p-3.5 sm:p-4'} ${className}`}>
      {children}
    </section>
  )
}

// ── StatCard (KPI avec barre accent) ─────────────────────────────────────────

export function StatCard({ icon: Icon, label, value, sub, accentColor, alert, trend, trendLabel }) {
  return (
    <article className="group relative min-h-28 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-soft transition duration-200 hover:border-violet-200 sm:p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
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
      <div className="text-xl font-black leading-none tracking-tight text-slate-950 tabular-nums">{value}</div>
      <div className="mt-1.5 text-[11px] font-bold text-slate-700">{label}</div>
      {sub && <div className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-slate-400">{sub}</div>}
      <div className="absolute -bottom-7 -right-7 h-20 w-20 rounded-full opacity-10" style={{ background: accentColor }} />
    </article>
  )
}

// ── Table primitives ──────────────────────────────────────────────────────────

export function Table({ children }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">{children}</table>
    </div>
  )
}

export function Th({ children, className = '' }) {
  return (
    <th className={`whitespace-nowrap border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 ${className}`}>
      {children}
    </th>
  )
}

export function Td({ children, className = '' }) {
  return (
    <td className={`border-b border-slate-100 px-4 py-3 text-[12.5px] align-middle ${className}`}>
      {children}
    </td>
  )
}

export function Tr({ children, className = '', ...props }) {
  return (
    <tr {...props} className={`transition-colors hover:bg-violet-50/30 ${className}`}>
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
    <div className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${className}`}>
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
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 size={size} className="animate-spin text-violet-600" />
        <span className="text-xs font-semibold">Chargement…</span>
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, sub, iconClass = '' }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 ring-4 ring-slate-50">
        <Icon size={24} className={`text-slate-300 ${iconClass}`} />
      </div>
      <p className="mt-2 text-sm font-bold text-slate-700">{title}</p>
      {sub && <p className="max-w-sm text-xs leading-5 text-slate-400">{sub}</p>}
    </div>
  )
}

// ── SearchInput ───────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', className = 'w-full sm:w-72' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
      />
    </div>
  )
}

// ── FilterPill ────────────────────────────────────────────────────────────────

export function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
        active
          ? 'border-violet-700 bg-violet-700 text-white shadow-sm'
          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-violet-300 hover:bg-white hover:text-violet-700'
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
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${AB_VARIANTS[variant] || AB_VARIANTS.default} ${className}`}
    >
      {children}
    </button>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {tabs.map((tab, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-bold transition ${
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
  const [hoveredIndex, setHoveredIndex] = useState(null)
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
  const activePoint = hoveredIndex == null ? null : {
    x: xs[hoveredIndex],
    y: ys[hoveredIndex],
    datum: data[hoveredIndex],
    value: values[hoveredIndex],
  }

  const linePath = xs.reduce((acc, x, i) => {
    if (i === 0) return `M${x},${ys[i]}`
    const cpx = (xs[i - 1] + x) / 2
    return `${acc} C${cpx},${ys[i - 1]} ${cpx},${ys[i]} ${x},${ys[i]}`
  }, '')
  const areaPath = `${linePath} L${xs[xs.length - 1]},${pad.top + cH} L${xs[0]},${pad.top + cH}Z`
  const gradId = `ag-${cat?.replace(/\W/g, '')}`

  return (
    <div ref={containerRef} className={`relative select-none ${className}`} style={{ height: H }}>
      <svg width={width} height={H} role="img" aria-label={`Graphique ${cat || ''}`} onMouseLeave={() => setHoveredIndex(null)}>
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

        {activePoint && (
          <>
            <line x1={activePoint.x} x2={activePoint.x} y1={pad.top} y2={pad.top + cH}
              stroke={color} strokeWidth="1" strokeDasharray="3 4" opacity=".45" />
            <circle cx={activePoint.x} cy={activePoint.y} r="6" fill="white" stroke={color} strokeWidth="2.5" />
          </>
        )}

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

        {xs.map((x, i) => {
          const previousX = i === 0 ? pad.left : (xs[i - 1] + x) / 2
          const nextX = i === xs.length - 1 ? width - pad.right : (x + xs[i + 1]) / 2
          return (
            <rect key={`hit-${i}`} x={previousX} y={pad.top} width={Math.max(1, nextX - previousX)} height={cH}
              fill="transparent" tabIndex="0" role="button"
              aria-label={`${data[i][index]} : ${values[i]} ${cat || ''}`}
              onMouseEnter={() => setHoveredIndex(i)} onMouseMove={() => setHoveredIndex(i)}
              onFocus={() => setHoveredIndex(i)} onBlur={() => setHoveredIndex(null)}
              onTouchStart={() => setHoveredIndex(i)} />
          )
        })}
      </svg>

      {activePoint && (
        <div className="pointer-events-none absolute z-10 min-w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lift"
          style={{
            left: activePoint.x,
            top: Math.max(4, activePoint.y - 54),
            transform: activePoint.x > width - 120 ? 'translateX(-100%)' : activePoint.x < 120 ? 'none' : 'translateX(-50%)',
          }}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{activePoint.datum[index]}</p>
          <p className="mt-0.5 whitespace-nowrap text-[12px] font-black text-slate-950">
            {valueFormatter ? valueFormatter(activePoint.value) : activePoint.value} <span className="font-semibold text-slate-500">{cat?.toLowerCase()}</span>
          </p>
        </div>
      )}
    </div>
  )
}
