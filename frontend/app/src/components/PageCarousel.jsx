import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enregistrerClicBanniere, enregistrerImpressionBanniere } from '../services/api'

export default function PageCarousel({ slides }) {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const impressionsVues = useRef(new Set())

  const goTo = useCallback((idx) => {
    setVisible(false)
    setTimeout(() => {
      setCurrent(idx)
      setVisible(true)
    }, 250)
  }, [])

  useEffect(() => {
    if (slides.length < 2) return undefined
    const id = setInterval(() => goTo((c) => (c + 1) % slides.length), 4000)
    return () => clearInterval(id)
  }, [goTo, slides.length])

  useEffect(() => {
    const id = slides[current]?.id
    if (!id || impressionsVues.current.has(id)) return
    impressionsVues.current.add(id)
    enregistrerImpressionBanniere(id)
  }, [current, slides])

  useEffect(() => {
    if (current >= slides.length) setCurrent(0)
  }, [current, slides.length])

  if (slides.length === 0) return null
  const s = slides[current]

  const ouvrirLien = () => {
    if (!s.lien) return
    enregistrerClicBanniere(s.id)
    if (/^https?:\/\//i.test(s.lien)) {
      window.location.assign(s.lien)
    } else if (s.lien.startsWith('/')) {
      navigate(s.lien)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl h-52 md:h-64 w-full">
      {/* Fond images — crossfade */}
      {slides.map((sl, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{ backgroundImage: `url(${sl.img})`, opacity: i === current ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/60 to-transparent" />

      {/* Contenu */}
      <div
        className="absolute inset-0 flex flex-col justify-center px-8 md:px-12"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.25s ease, transform 0.25s ease' }}
      >
        {s.tag && (
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/80 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/15 w-fit mb-3">
            {s.icon && <i className={`ti ${s.icon} text-accent`} />}
            {s.tag}
          </span>
        )}
        <h2 className="text-white font-heading font-black text-2xl md:text-3xl leading-tight tracking-tighter mb-2 max-w-sm">
          {s.title}
        </h2>
        <p className="text-white/60 text-sm font-medium max-w-xs leading-relaxed">
          {s.desc}
        </p>
        {s.lien && (
          <button
            type="button"
            onClick={ouvrirLien}
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-primary shadow-lg transition hover:-translate-y-0.5 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            En savoir plus <i className="ti ti-arrow-right" />
          </button>
        )}
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-8 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={slides[i].id || i}
            onClick={() => goTo(i)}
            aria-label={`Afficher la bannière ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-1.5 bg-accent' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  )
}
