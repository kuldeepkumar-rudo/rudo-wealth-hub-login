// TEMPORARY: Force unregister all service workers to fix caching issue
// This ensures users get fresh code after bug fixes
// TODO: Implement proper versioned service worker with skipWaiting/clients.claim

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // First, unregister any existing service workers to clear stale caches
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[PWA] Unregistered stale service worker');
        }
        
        // Clear all caches to ensure fresh code loads
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('[PWA] Deleted cache:', cacheName);
          }
        }
        
        console.log('[PWA] Cache cleared - fresh code will load on next navigation');
        
        // NOTE: Service worker registration is temporarily disabled
        // Uncomment below to re-enable PWA features after implementing proper versioning
        /*
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });
        
        console.log('[PWA] Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, prompt user to refresh
                console.log('[PWA] New version available! Please refresh.');
              }
            });
          }
        });
        */
      } catch (error) {
        console.error('[PWA] Service Worker cleanup failed:', error);
      }
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('[PWA] Service Worker unregistration failed:', error);
      });
  }
}
