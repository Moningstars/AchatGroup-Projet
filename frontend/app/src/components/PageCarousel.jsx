import { useCallback, useEffect, useState } from 'react'

export default function PageCarousel({ slides }) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  const goTo = useCallback((idx) => {
    setVisible(false)
    setTimeout(() => {
      setCurrent(idx)
      setVisible(true)
    }, 250)
  }, [])

  useEffect(() => {
    const id = setInterval(() => goTo((c) => (c + 1) % slides.length), 4000)
    return () => clearInterval(id)
  }, [goTo, slides.length])

  const s = slides[current]

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
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-8 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-1.5 bg-accent' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  )
}
