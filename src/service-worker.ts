import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache all SvelteKit build assets and prerendered HTML pages
precacheAndRoute(self.__WB_MANIFEST);

// Handle push notification events
self.addEventListener('push', (event) => {
	let data = {
		title: 'Money Notes',
		body: 'Jangan lupa untuk mencatat transaksi keuanganmu hari ini! 💵'
	};

	try {
		if (event.data) {
			data = event.data.json();
		}
	} catch (e) {
		// Event data is plain text
		if (event.data) {
			data.body = event.data.text();
		}
	}

	const options: NotificationOptions = {
		body: data.body,
		icon: '/pwa-192x192.png',
		badge: '/pwa-192x192.png',
		vibrate: [100, 50, 100],
		data: {
			url: '/'
		}
	};

	event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click events (open the PWA)
self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const urlToOpen = event.notification.data?.url || '/';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
			// If a window is already open, focus it
			for (const client of windowClients) {
				if (client.url.includes(urlToOpen) && 'focus' in client) {
					return client.focus();
				}
			}
			// Otherwise, open a new window
			if (self.clients.openWindow) {
				return self.clients.openWindow(urlToOpen);
			}
		})
	);
});
