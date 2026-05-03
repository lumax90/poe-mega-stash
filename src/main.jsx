import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import appIcon from './assets/app-icon.png'

const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = appIcon
document.head.appendChild(favicon)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
