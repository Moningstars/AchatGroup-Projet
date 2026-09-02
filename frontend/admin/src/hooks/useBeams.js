import { useEffect } from 'react'
import * as PusherPushNotifications from '@pusher/push-notifications-web'
import { useAuth } from '../context/AuthContext'

const BEAMS_INSTANCE_ID = import.meta.env.VITE_BEAMS_INSTANCE_ID
const INTERET_ADMIN = 'admin-global'

let beamsClient = null

/**
 * Notifications push navigateur/mobile via Pusher Beams — reçues même l'app fermée,
 * en complément du canal Pusher Channels (PusherContext) qui ne fonctionne que
 * pendant que l'app est ouverte. Les admins partagent un même "intérêt" (pas de
 * ciblage par utilisateur, contrairement au frontend participant).
 */
export function useBeams() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !BEAMS_INSTANCE_ID) return

    if (!beamsClient) {
      beamsClient = new PusherPushNotifications.Client({ instanceId: BEAMS_INSTANCE_ID })
    }

    beamsClient.start()
      .then(() => beamsClient.addDeviceInterest(INTERET_ADMIN))
      .catch(err => console.error('[Beams] Erreur initialisation', err))
  }, [isAuthenticated])
}
