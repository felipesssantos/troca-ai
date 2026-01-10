import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e: any) {
  document.body.innerHTML = `<div style="color: red; padding: 20px;">
    <h1>Erro ao iniciar aplicação</h1>
    <pre>${e?.message}\n${e?.stack}</pre>
  </div>`
  console.error(e)
}
