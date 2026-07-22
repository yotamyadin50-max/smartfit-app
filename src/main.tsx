import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { UserProvider } from './context/UserContext'
import { I18nProvider } from './context/I18nContext'
import App from './App'
import './index.css'
import { initCapacitor } from './lib/capacitorInit'

// Initialise Capacitor native features (StatusBar, back-button, safe-area).
// Safe to call in browser — all Capacitor APIs no-op when not running natively.
initCapacitor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>
)
