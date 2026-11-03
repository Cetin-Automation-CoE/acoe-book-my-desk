import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// On wide screens the app sits in a phone mock-up (see index.css): scale it to the window.
function fitPhone() {
  const zoom = Math.min(1, (window.innerHeight - 48) / 940, (window.innerWidth - 48) / 472)
  document.documentElement.style.setProperty('--phone-zoom', zoom.toFixed(3))
}
fitPhone()
window.addEventListener('resize', fitPhone)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
