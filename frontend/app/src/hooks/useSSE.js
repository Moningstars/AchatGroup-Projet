import { useEffect, useRef } from 'react'

const SSE_BASE = `http://${window.location.hostname}:8080/api/events`

/**
 * Subscribe to an SSE channel.
 * @param {string|null} path - e.g. "opportunite/uuid" or "sondage/uuid".
 *   Pass null to skip (e.g. when unauthenticated).
 * @param {Record<string, (data: any) => void>} handlers - event name → callback.
 *   The callback receives the parsed JSON payload.
 * @param {string} [token] - JWT for authenticated channels.
 */
export function useSSE(path, handlers, token) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!path) return

    const url = token
      ? `${SSE_BASE}/${path}?token=${encodeURIComponent(token)}`
      : `${SSE_BASE}/${path}`

    const es = new EventSource(url, { withCredentials: true })
    const types = Object.keys(handlersRef.current)

    const dispatch = (e) => {
      const fn = handlersRef.current[e.type]
      if (!fn) return
      try { fn(JSON.parse(e.data)) } catch { fn(e.data) }
    }

    types.forEach(t => es.addEventListener(t, dispatch))

    return () => {
      types.forEach(t => es.removeEventListener(t, dispatch))
      es.close()
    }
  }, [path, token]) // eslint-disable-line react-hooks/exhaustive-deps
}
