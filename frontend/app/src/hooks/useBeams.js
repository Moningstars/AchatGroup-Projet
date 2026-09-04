import { useEffect } from 'react'
import * as PusherPushNotifications from '@pusher/push-notifications-web'
import { useAuth } from '../context/AuthContext'
import { BACKEND_ORIGIN, getToken } from '../services/api'

const BEAMS_INSTANCE_ID = '91f310a4-24e6-49e4-b83f-eec41cad76e5'

let beamsClient = null

/**
 * Notifications push navigateur/mobile via Pusher Beams — reçues même app fermée,
 * en complément du canal Pusher Channels (PusherContext) qui ne fonctionne que
 * pendant que l'app est ouverte.
 */
export function useBeams() {
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !window.isSecureContext) return

    try {
      if (!beamsClient) {
        beamsClient = new PusherPushNotifications.Client({ instanceId: BEAMS_INSTANCE_ID })
      }

      const tokenProvider = new PusherPushNotifications.TokenProvider({
        url: `${BACKEND_ORIGIN}/api/beams-auth`,
        headers: { Authorization: `Bearer ${getToken()}` },
      })

      beamsClient.start()
        .then(() => beamsClient.setUserId(user.id, tokenProvider))
        .catch(err => console.error('[Beams] Erreur initialisation', err))
    } catch (err) {
      console.error('[Beams] Erreur initialisation', err)
    }

    return () => {
      beamsClient?.stop().catch(() => {})
    }
  }, [isAuthenticated, user?.id])
}
