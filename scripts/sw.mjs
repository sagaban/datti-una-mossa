// TanStack Start no tiene integración PWA oficial: generamos el service worker
// sobre la salida estática del modo SPA, después de `vite build`.
import { generateSW } from 'workbox-build'

const { count, size, warnings } = await generateSW({
  globDirectory: 'dist/client',
  globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
  swDest: 'dist/client/sw.js',
  navigateFallback: '/index.html',
  // los assets con hash nunca cambian; no hace falta revalidarlos
  dontCacheBustURLsMatching: /^assets\//,
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  sourcemap: false,
  // recordatorio diario (Web Push)
  importScripts: ['push-sw.js'],
})

for (const w of warnings) console.warn(w)
console.log(`[sw] ${count} archivos precacheados (${(size / 1024).toFixed(0)} KB)`)
