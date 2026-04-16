import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import axios from 'axios';

// Bypass ngrok browser warning for all API calls
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
