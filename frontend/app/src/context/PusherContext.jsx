import { createContext, useContext, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import { useAuth } from './AuthContext'
import { BACKEND_ORIGIN } from '../services/api'

const PusherContext = createContext(null)

const PUSHER_KEY    = '81299440ac749487df29'
const PUSHER_CLUSTER = 'eu'

export function PusherProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const pusherRef  = useRef(null)
  const channelRef = useRef(null)
  const handlersRef = useRef({})

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      // Déconnecter si l'utilisateur se déconnecte
      if (pusherRef.current) {
        pusherRef.current.disconnect()
        pusherRef.current = null
        channelRef.current = null
      }
      return
    }

    // Connexion Pusher avec auth JWT
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      channelAuthorization: {
        endpoint: `${BACKEND_ORIGIN}/api/pusher/auth`,
        transport: 'ajax',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('opportunihub-token')}`,
        },
      },
    })

    pusherRef.current = pusher

    // Abonnement au canal privé de l'utilisateur
    const channel = pusher.subscribe(`private-user-${user.id}`)
    channelRef.current = channel

    // Brancher les handlers déjà enregistrés (plusieurs composants peuvent écouter le même événement)
    Object.entries(handlersRef.current).forEach(([event, handlers]) => {
      handlers.forEach(handler => channel.bind(event, handler))
    })

    return () => {
      pusher.disconnect()
      pusherRef.current = null
      channelRef.current = null
    }
  }, [isAuthenticated, user?.id])

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
