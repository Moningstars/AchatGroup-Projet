import { createContext, useContext, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import { useAuth } from './AuthContext'

const PusherContext = createContext(null)

const PUSHER_KEY    = '81299440ac749487df29'
const PUSHER_CLUSTER = 'eu'

export function PusherProvider({ children }) {
  const { isAuthenticated, token } = useAuth()
  const pusherRef  = useRef(null)
  const channelRef = useRef(null)
  const handlersRef = useRef({})

  useEffect(() => {
    if (!isAuthenticated) {
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
        endpoint: `http://${window.location.hostname}:8080/api/pusher/auth`,
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
