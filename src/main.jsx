import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import AuthProvider from './AuthProvider'
import PersonnelProvider from './PersonnelProvider'
import SetupNotice from './pages/SetupNotice'
import { isConfigured } from './firebase'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <PersonnelProvider>
            <App />
          </PersonnelProvider>
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <SetupNotice />
    )}
  </StrictMode>,
)
