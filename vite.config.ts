import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Gera os ícones a partir de public/logo.svg (ver pwa-assets.config.ts)
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Hackathon BCG',
        short_name: 'Hackathon',
        description: 'PWA do Hackathon BCG',
        lang: 'pt-BR',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
})
