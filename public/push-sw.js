// Se importa desde el service worker que genera Workbox (scripts/sw.mjs): recordatorio diario.
self.addEventListener('push', (event) => {
  let msg = { title: 'Datti una mossa', body: '¿Repasamos un ratito?', url: '/' }
  try {
    msg = { ...msg, ...event.data.json() }
  } catch {}
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: 'recordatorio-diario',
      data: { url: msg.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c)
      return open ? open.focus().then((c) => c?.navigate?.(url)) : self.clients.openWindow(url)
    }),
  )
})
