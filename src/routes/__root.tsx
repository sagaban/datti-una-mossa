import { ClientOnly, HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { initSync } from '../lib/sync'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#1f6f4a' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Datti una mossa' },
      { name: 'description', content: 'Repaso de italiano con repetición espaciada para hispanohablantes' },
      { title: 'Datti una mossa' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

const NAV = [
  { to: '/', label: 'Inicio', icon: '⌂' },
  { to: '/vocab', label: 'Palabras', icon: 'Aa' },
  { to: '/lezioni', label: 'Gramática', icon: '¶' },
  { to: '/verbi', label: 'Verbos', icon: '≡' },
  { to: '/test', label: 'Test', icon: '✓' },
  { to: '/progressi', label: 'Progreso', icon: '↗' },
] as const

function RootLayout() {
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    navigator.storage?.persist?.().catch(() => {})
    initSync()
  }, [])

  return (
    <div className="app">
      <main className="main">
        {/* Todo el estado está en localStorage: se renderiza sólo en el cliente */}
        <ClientOnly fallback={<div className="loading">Caricamento…</div>}>
          <Outlet />
        </ClientOnly>
      </main>
      {/* el shell se prerenderiza en "/": la barra también se dibuja en el cliente para marcar bien la pestaña activa */}
      <ClientOnly>
        <nav className="tabbar">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="tab" activeOptions={{ exact: n.to === '/' }} activeProps={{ className: 'tab active' }}>
              <span className="tab-icon" aria-hidden>
                {n.icon}
              </span>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
      </ClientOnly>
    </div>
  )
}
