/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => {
  sw.skipWaiting();
});

sw.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(sw.clients.claim());
});

interface PushPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

sw.addEventListener('push', (event: PushEvent) => {
  let data: PushPayload = {};
  const rawText = event.data?.text() || '';
  console.log('[SW] Raw push event data text:', rawText);

  try {
    if (rawText) {
      data = JSON.parse(rawText);
      console.log('[SW] Parsed JSON payload:', data);
    }
  } catch (err) {
    console.warn('[SW] Push payload is not valid JSON, using raw text:', err);
    data = { body: rawText };
  }

  event.waitUntil(
    sw.registration.showNotification(data.title || 'TixTac', {
      body: data.body || 'Bạn có một thông báo mới từ TixTac.',
      icon: '/favicon.ico', // Fixed: use existing favicon.ico
      // @ts-expect-error - vibrate is not included in TS DOM lib but is supported
      vibrate: [200, 100, 200, 100, 200, 100, 200], // Rung mạnh
      requireInteraction: true,
      data: data.data,
    }),
  );
});

sw.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients: readonly WindowClient[]) => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // Note: client.url is absolute. We check if it ends with our relative url
          const target = new URL(url, sw.location.origin);
          const current = new URL(client.url);
          if (
            current.origin === target.origin &&
            current.pathname === target.pathname &&
            'focus' in client
          ) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (sw.clients.openWindow) {
          return sw.clients.openWindow(url);
        }
      }),
  );
});
