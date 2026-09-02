import { useState, useEffect } from 'react'

function compute(dateExpiration) {
  if (!dateExpiration) return null
  const diff = new Date(dateExpiration) - Date.now()
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return { expired: false, days, hours, minutes, seconds, total: diff }
}

export function useCountdown(dateExpiration, intervalMs = 1000) {
  const [state, setState] = useState(() => compute(dateExpiration))

  useEffect(() => {
    if (!dateExpiration) return
    setState(compute(dateExpiration))
    const id = setInterval(() => setState(compute(dateExpiration)), intervalMs)
    return () => clearInterval(id)
  }, [dateExpiration, intervalMs])

  return state
}
