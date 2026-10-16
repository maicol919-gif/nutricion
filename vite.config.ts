import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// identificador único de esta compilación: la app lo compara con version.json para saber si hay una versión nueva
const BUILD_ID = Date.now().toString(36)

// versión visible = mayor.menor de package.json (ej. 2.0)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version.split('.').slice(0, 2).join('.')),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  base: '/nutricion/',
  plugins: [
    react(),
    {
      name: 'emit-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: pkg.version.split('.').slice(0, 2).join('.'), build: BUILD_ID }),
        })
      },
    },
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Nutrición',
        short_name: 'Nutrición',
        description: 'Nutrición: registro de alimentación, peso y cintura',
        lang: 'es',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        start_url: '/nutricion/',
        scope: '/nutricion/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: { environment: 'node' },
})
