import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'fin-avatar.png'],
      manifest: {
        name: 'Fin — Oren IA',
        short_name: 'Fin',
        description: 'Assistente financeiro inteligente para pequenos negócios',
        theme_color: '#0A1F44',
        background_color: '#0A1F44',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'fin-avatar.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'fin-avatar.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
