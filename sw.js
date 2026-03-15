self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());

self.addEventListener('message', e => {
    if (e.data && e.data.type === 'schedule-feed-reminder') {
        const delay = e.data.delay;
        setTimeout(() => {
            self.registration.showNotification('🍼 Time to feed!', {
                body: 'It\'s been 3 hours since the last feeding.',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍼</text></svg>',
                tag: 'feed-reminder',
                requireInteraction: true,
            });
        }, delay);
    }
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            if (clients.length > 0) {
                clients[0].focus();
            } else {
                self.clients.openWindow('/');
            }
        })
    );
});
