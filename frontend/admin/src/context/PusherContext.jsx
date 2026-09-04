import { createContext, useContext, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import { useAuth } from './AuthContext'
import { BASE_URL } from '../services/api'

const PusherContext = createContext(null)

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'eu'

export function PusherProvider({ children }) {
  const { isAuthenticated, token } = useAuth()
  const pusherRef  = useRef(null)
  const channelRef = useRef(null)
  const handlersRef = useRef({})

  useEffect(() => {
    if (!isAuthenticated || !PUSHER_KEY) {
      if (pusherRef.current) {
        pusherRef.current.disconnect()
        pusherRef.current = null
        channelRef.current = null
      }
      return
    }

    // Canal partagé entre tous les admins connectés (pas d'ID personnel dans le nom du canal)
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      channelAuthorization: {
        endpoint: `${BASE_URL}/pusher/auth`,
        transport: 'ajax',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    pusherRef.current = pusher

    const channel = pusher.subscribe('private-admin-global')
    channelRef.current = channel

    Object.entries(handlersRef.current).forEach(([event, handlers]) => {
      handlers.forEach(handler => channel.bind(event, handler))
    })

    return () => {
      pusher.disconnect()
      pusherRef.current = null
      channelRef.current = null
    }
  }, [isAuthenticated, token])

  const on = (event, handler) => {
    if (!handlersRef.current[event]) handlersRef.current[event] = []
    handlersRef.current[event].push(handler)
    if (channelRef.current) {
      channelRef.current.bind(event, handler)
    }
  }

  const off = (event, handler) => {
    if (handlersRef.current[event]) {
      handlersRef.current[event] = handlersRef.current[event].filter(h => h !== handler)
    }
    if (channelRef.current) {
      channelRef.current.unbind(event, handler)
    }
  }

  return (
    <PusherContext.Provider value={{ on, off }}>
      {children}
    </PusherContext.Provider>
  )
}

export const usePusher = () => useContext(PusherContext)
