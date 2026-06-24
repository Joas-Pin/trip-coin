import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { enforceHttps } from '@/lib/security'

// Enforce HTTPS in production
enforceHttps();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
