const CACHE_NAME = "deadline-buddy-v3";

const APP_FILES = [
    "./",
    "./index.html",
    "./dashboard.html",
    "./deadline.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

// Install and cache app files
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
    );
    self.skipWaiting();
});

// Activate the new service worker
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        )
    );

    self.clients.claim();
});

// Offline caching
self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then(cache =>
                        cache.put(event.request, copy)
                    );
                }

                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Handle test messages from the app
self.addEventListener("message", async event => {
    if (event.data === "TEST_NOTIFICATION") {
        await self.registration.showNotification("🌷 Deadline Buddy", {
            body: "Notifications are working on your phone!",
            icon: "./icon-192.png"
        });
    }
});

// Handle push notifications when the app is closed
self.addEventListener("push", event => {
    let data = {
        title: "🌷 Deadline Buddy Reminder",
        body: "You have an upcoming deadline!",
        url: "./deadline.html"
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (error) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: "./icon-192.png",
            badge: "./icon-192.png",
            data: { url: data.url },
            tag: data.tag || "deadline-reminder"
        })
    );
});

// Open the relevant page when a reminder is tapped
self.addEventListener("notificationclick", event => {
    event.notification.close();

    const targetUrl = new URL(
        event.notification.data?.url || "./deadline.html",
        self.location.origin
    ).href;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(windowClients => {
                for (const client of windowClients) {
                    if (client.url.startsWith(self.location.origin) &&
                        "focus" in client) {
                        return client.focus().then(() => client.navigate(targetUrl));
                    }
                }

                return clients.openWindow(targetUrl);
            })
    );
});