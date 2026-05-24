import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { SupabaseProvider } from './context/SupabaseContext.jsx'
import App from './App.jsx'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p style={{color:'#EAF0FB',padding:40}}>Algo salió mal. Recargá la página.</p>}>
      <BrowserRouter>
        <SupabaseProvider>
          <App />
        </SupabaseProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)