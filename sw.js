self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('todoCache').then(function(cache) {
            return cache.addAll([
                'index.html',
                'scripts.js',
                'style.css',
                'manifest.json',
                'icon_192.png',
                'icon_512.png'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
