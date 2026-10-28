// LimeLeaf staff notifications. Only used to show system notifications from an open page
// (mobile Chrome does not allow `new Notification()`); no push, no caching, no fetch handling.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', event => {
    event.notification.close()
    const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        const existing = windows.find(client => client.url.startsWith(targetUrl)) || windows[0]
        if (existing) {
            await existing.focus()
            if (!existing.url.startsWith(targetUrl) && 'navigate' in existing) await existing.navigate(targetUrl)
            return
        }
        await self.clients.openWindow(targetUrl)
    })())
})
