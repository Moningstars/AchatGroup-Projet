import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { PusherProvider } from './context/PusherContext.jsx'
import { NotificationsProvider } from './context/NotificationsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PusherProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </PusherProvider>
    </AuthProvider>
  </StrictMode>,
)
