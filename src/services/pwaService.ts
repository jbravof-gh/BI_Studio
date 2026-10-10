// Service for PWA registration, persistent storage, offline cache-first syncing, manifest management, and install prompts

export interface ManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: Array<{ src: string; sizes: string; type?: string }>;
}

export interface ManifestConfig {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'any' | 'portrait' | 'landscape' | 'natural';
  background_color: string;
  theme_color: string;
  categories: string[];
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  shortcuts?: ManifestShortcut[];
}

export interface CacheEntryItem {
  id: string;
  cacheName: string;
  url: string;
  relativeUrl: string;
  category: 'page' | 'script' | 'style' | 'icon' | 'database' | 'other';
  status: number;
  sizeBytes?: number;
  contentType?: string;
  isActive: boolean;
}

export const DEFAULT_MANIFEST_CONFIG: ManifestConfig = {
  id: '/?pwa=1',
  name: 'Dexie Canvas Studio',
  short_name: 'Dexie Studio',
  description: 'Editor visual de reportes y dashboards vinculado dinámicamente a bases de datos Dexie IndexedDB con soporte 100% offline.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  background_color: '#111216',
  theme_color: '#5865f2',
  categories: ['productivity', 'utilities', 'business', 'developer'],
  icons: [
    {
      src: '/icon-192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any'
    },
    {
      src: '/icon-512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any'
    },
    {
      src: '/icon-maskable.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'maskable'
    },
    {
      src: '/favicon.svg',
      sizes: '64x64',
      type: 'image/svg+xml',
      purpose: 'any'
    }
  ],
  shortcuts: [
    {
      name: 'Nuevo Dashboard',
      short_name: 'Nuevo',
      description: 'Crear un nuevo dashboard en blanco',
      url: '/?action=new',
      icons: [{ src: '/icon-192.svg', sizes: '192x192' }]
    },
    {
      name: 'Gestor de Bases de Datos',
      short_name: 'Bases de Datos',
      description: 'Administrar tablas y bases de datos Dexie IndexedDB',
      url: '/?action=db',
      icons: [{ src: '/icon-192.svg', sizes: '192x192' }]
    }
  ]
};

const MANIFEST_STORAGE_KEY = 'dexie_pwa_custom_manifest_v1';
const DISABLED_CACHE_URLS_KEY = 'dexie_pwa_disabled_cache_urls_v1';

export interface PwaState {
  isInstalled: boolean;
  canInstall: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  isStoragePersistent: boolean;
  storageUsageMb: number;
  registration: ServiceWorkerRegistration | null;
}

type PwaListener = (state: PwaState) => void;

class PwaService {
  private deferredPrompt: any = null;
  private listeners: Set<PwaListener> = new Set();
  private registration: ServiceWorkerRegistration | null = null;
  private hasUpdate = false;
  private currentManifestBlobUrl: string | null = null;

  private state: PwaState = {
    isInstalled: false,
    canInstall: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    hasUpdate: false,
    isStoragePersistent: false,
    storageUsageMb: 0,
    registration: null
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private async init() {
    // 1. Check if running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    this.state.isInstalled = isStandalone;

    // 2. Load and apply custom manifest if configured
    this.applyStoredManifest();

    // 3. Request persistent storage for IndexedDB & Cache
    await this.requestStoragePersistence();

    // 4. Listen to online / offline events
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notify();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.notify();
    });

    // 5. Listen to beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.state.canInstall = true;
      this.notify();
    });

    // 6. Listen to appinstalled event
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.state.canInstall = false;
      this.state.isInstalled = true;
      this.notify();
    });

    // 7. Register Service Worker & Warm Cache First
    await this.registerServiceWorker();
    this.prewarmAllPagesAndRoutes();
  }

  public async requestStoragePersistence(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        this.state.isStoragePersistent = isPersisted;

        if (navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage) {
            this.state.storageUsageMb = Math.round((estimate.usage / (1024 * 1024)) * 10) / 10;
          }
        }
        this.notify();
        return isPersisted;
      } catch (err) {
        console.warn('[PWA] Storage persist request error:', err);
      }
    }
    return false;
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      // In Vite dev mode, unregister any active service worker to prevent intercepting dynamic TypeScript modules
      const isDev = Boolean((import.meta as any).env?.DEV || process.env.NODE_ENV !== 'production');
      if (isDev) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        } catch {}
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        this.registration = reg;
        this.state.registration = reg;

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.hasUpdate = true;
                this.state.hasUpdate = true;
                this.notify();
              }
            });
          }
        });

        // Periodic update check
        setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000); // 1 hour

        this.notify();
      } catch (err) {
        console.warn('[PWA] Service Worker registration failed:', err);
      }
    }
  }

  // Pre-cache all major routes and pages
  public prewarmAllPagesAndRoutes() {
    const disabledUrls = this.getDisabledCacheUrls();
    const routesToCache = [
      '/',
      '/index.html',
      '/?action=new',
      '/?action=db',
      '/?pwa=1',
      '/manifest.json',
      '/favicon.svg',
      '/icon-192.svg',
      '/icon-512.svg',
      '/icon-maskable.svg'
    ].filter(url => !disabledUrls.includes(url));

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_URLS',
        urls: routesToCache
      });
    } else if (typeof caches !== 'undefined') {
      caches.open('dexie-canvas-studio-v2').then((cache) => {
        cache.addAll(routesToCache).catch(() => {});
      });
    }
  }

  // Cache a database JSON snapshot into the Service Worker cache
  public cacheDatabaseSnapshot(dbName: string, snapshot: any) {
    if (!dbName || !snapshot) return;

    const disabledUrls = this.getDisabledCacheUrls();
    const targetUrl = `/api/db-cache/${encodeURIComponent(dbName)}`;
    if (disabledUrls.includes(targetUrl)) return;

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_DB_SNAPSHOT',
        dbName,
        snapshot
      });
    }

    if (typeof caches !== 'undefined') {
      const response = new Response(JSON.stringify(snapshot), {
        headers: { 'Content-Type': 'application/json' }
      });
      caches.open('dexie-db-snapshots-v1').then((cache) => {
        cache.put(targetUrl, response).catch(() => {});
      });
    }
  }

  /* ----------------------------------------------------
     CACHE INSPECTION & CONTROL
  ---------------------------------------------------- */
  public getDisabledCacheUrls(): string[] {
    try {
      const data = localStorage.getItem(DISABLED_CACHE_URLS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public setDisabledCacheUrls(urls: string[]) {
    try {
      localStorage.setItem(DISABLED_CACHE_URLS_KEY, JSON.stringify(urls));
    } catch (e) {
      console.warn('Error saving disabled cache urls:', e);
    }
  }

  public async getAllCacheEntries(): Promise<{
    entries: CacheEntryItem[];
    cacheNames: string[];
    totalBytes: number;
    disabledCount: number;
  }> {
    const disabledUrls = this.getDisabledCacheUrls();

    if (typeof caches === 'undefined') {
      return { entries: [], cacheNames: [], totalBytes: 0, disabledCount: disabledUrls.length };
    }

    try {
      const cacheNames = await caches.keys();
      const entriesMap = new Map<string, CacheEntryItem>();
      let totalBytes = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const req of requests) {
          const url = req.url;
          let relativeUrl = url;
          try {
            const parsed = new URL(url);
            relativeUrl = parsed.pathname + parsed.search;
          } catch {
            relativeUrl = url;
          }

          let category: CacheEntryItem['category'] = 'other';
          if (url.includes('/api/db-cache/')) {
            category = 'database';
          } else if (url.endsWith('.html') || relativeUrl === '/' || relativeUrl.startsWith('/?')) {
            category = 'page';
          } else if (url.endsWith('.js') || url.endsWith('.mjs') || url.includes('.js?')) {
            category = 'script';
          } else if (url.endsWith('.css') || url.includes('.css?') || url.includes('fonts')) {
            category = 'style';
          } else if (
            url.endsWith('.svg') ||
            url.endsWith('.png') ||
            url.endsWith('.ico') ||
            url.endsWith('.jpg') ||
            url.endsWith('.webp')
          ) {
            category = 'icon';
          }

          let status = 200;
          let sizeBytes = 0;
          let contentType = '';

          try {
            const matchResponse = await cache.match(req);
            if (matchResponse) {
              status = matchResponse.status;
              contentType = matchResponse.headers.get('content-type') || '';
              const blob = await matchResponse.clone().blob();
              sizeBytes = blob.size;
              totalBytes += sizeBytes;
            }
          } catch {
            // ignore error reading single blob
          }

          const id = `${cacheName}::${relativeUrl}`;
          entriesMap.set(id, {
            id,
            cacheName,
            url,
            relativeUrl,
            category,
            status,
            sizeBytes,
            contentType,
            isActive: !disabledUrls.includes(relativeUrl) && !disabledUrls.includes(url)
          });
        }
      }

      // Also include previously disabled items that were deleted from cache but kept in history
      for (const disabledUrl of disabledUrls) {
        const matchingKey = Array.from(entriesMap.values()).find(
          e => e.relativeUrl === disabledUrl || e.url === disabledUrl
        );
        if (!matchingKey) {
          let category: CacheEntryItem['category'] = 'other';
          if (disabledUrl.includes('/api/db-cache/')) category = 'database';
          else if (disabledUrl.endsWith('.html') || disabledUrl === '/' || disabledUrl.startsWith('/?')) category = 'page';
          else if (disabledUrl.endsWith('.js')) category = 'script';
          else if (disabledUrl.endsWith('.css')) category = 'style';
          else if (disabledUrl.endsWith('.svg') || disabledUrl.endsWith('.png')) category = 'icon';

          const id = `disabled::${disabledUrl}`;
          entriesMap.set(id, {
            id,
            cacheName: category === 'database' ? 'dexie-db-snapshots-v1' : 'dexie-canvas-studio-v2',
            url: disabledUrl.startsWith('http') ? disabledUrl : window.location.origin + disabledUrl,
            relativeUrl: disabledUrl,
            category,
            status: 0,
            sizeBytes: 0,
            contentType: 'disabled/offline',
            isActive: false
          });
        }
      }

      const entries = Array.from(entriesMap.values());
      const disabledCount = entries.filter(e => !e.isActive).length;

      return {
        entries,
        cacheNames,
        totalBytes,
        disabledCount
      };
    } catch (err) {
      console.warn('[PWA] Error listing cache entries:', err);
      return { entries: [], cacheNames: [], totalBytes: 0, disabledCount: 0 };
    }
  }

  public async toggleCacheItem(item: CacheEntryItem, shouldBeActive: boolean): Promise<boolean> {
    const disabledUrls = new Set(this.getDisabledCacheUrls());

    if (!shouldBeActive) {
      // Deactivate: delete from cache and add to disabled list
      disabledUrls.add(item.relativeUrl);
      disabledUrls.add(item.url);
      this.setDisabledCacheUrls(Array.from(disabledUrls));

      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(item.cacheName);
          await cache.delete(item.url);
          await cache.delete(item.relativeUrl);
        } catch (e) {
          console.warn('Error deleting cache entry:', e);
        }
      }
      return false;
    } else {
      // Activate: remove from disabled list and re-fetch into cache
      disabledUrls.delete(item.relativeUrl);
      disabledUrls.delete(item.url);
      this.setDisabledCacheUrls(Array.from(disabledUrls));

      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(item.cacheName);
          const response = await fetch(item.url, { cache: 'reload' });
          if (response && response.ok) {
            await cache.put(item.url, response);
          }
        } catch (e) {
          console.warn('Error fetching and caching item:', e);
        }
      }
      return true;
    }
  }

  public async addCustomCacheUrl(url: string, cacheName = 'dexie-canvas-studio-v2'): Promise<boolean> {
    if (typeof caches === 'undefined' || !url) return false;
    try {
      const cache = await caches.open(cacheName);
      const res = await fetch(url);
      if (res && res.ok) {
        await cache.put(url, res);
        // Remove from disabled if it was there
        const disabled = this.getDisabledCacheUrls().filter(u => u !== url);
        this.setDisabledCacheUrls(disabled);
        return true;
      }
    } catch (err) {
      console.warn('Error adding custom URL to cache:', err);
    }
    return false;
  }

  public async deleteCacheEntry(cacheName: string, url: string): Promise<boolean> {
    if (typeof caches === 'undefined') return false;
    try {
      const cache = await caches.open(cacheName);
      const deleted = await cache.delete(url);
      return deleted;
    } catch (err) {
      console.warn('Error deleting cache item:', err);
      return false;
    }
  }

  public async clearAllCache(targetCacheName?: string): Promise<boolean> {
    if (typeof caches === 'undefined') return false;
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        if (!targetCacheName || targetCacheName === key) {
          await caches.delete(key);
        }
      }
      return true;
    } catch (err) {
      console.warn('Error clearing caches:', err);
      return false;
    }
  }

  /* ----------------------------------------------------
     PWA MANIFEST CONFIGURATION & DYNAMIC INJECTION
  ---------------------------------------------------- */
  public getManifestConfig(): ManifestConfig {
    try {
      const stored = localStorage.getItem(MANIFEST_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_MANIFEST_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading stored manifest:', e);
    }
    return { ...DEFAULT_MANIFEST_CONFIG };
  }

  public saveManifestConfig(config: ManifestConfig): boolean {
    try {
      localStorage.setItem(MANIFEST_STORAGE_KEY, JSON.stringify(config, null, 2));
      this.applyManifestToDom(config);
      return true;
    } catch (e) {
      console.warn('Error saving manifest config:', e);
      return false;
    }
  }

  public resetManifestConfig(): ManifestConfig {
    try {
      localStorage.removeItem(MANIFEST_STORAGE_KEY);
      this.applyManifestToDom(DEFAULT_MANIFEST_CONFIG);
    } catch (e) {
      console.warn('Error resetting manifest config:', e);
    }
    return { ...DEFAULT_MANIFEST_CONFIG };
  }

  public applyStoredManifest() {
    const config = this.getManifestConfig();
    this.applyManifestToDom(config);
  }

  public applyManifestToDom(config: ManifestConfig) {
    if (typeof document === 'undefined') return;

    try {
      // 1. Generate dynamic Blob URL for manifest.json
      const manifestJsonString = JSON.stringify(config, null, 2);
      const blob = new Blob([manifestJsonString], { type: 'application/manifest+json' });

      if (this.currentManifestBlobUrl) {
        URL.revokeObjectURL(this.currentManifestBlobUrl);
      }
      this.currentManifestBlobUrl = URL.createObjectURL(blob);

      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = this.currentManifestBlobUrl;

      // 2. Update Theme Color Meta
      let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.content = config.theme_color;

      // 3. Update Apple Mobile Status Bar Style & Title
      let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
      if (appleTitle) {
        appleTitle.content = config.short_name || config.name;
      }
      let appNameMeta = document.querySelector('meta[name="application-name"]') as HTMLMetaElement | null;
      if (appNameMeta) {
        appNameMeta.content = config.name;
      }
    } catch (err) {
      console.warn('Failed to dynamically apply manifest to DOM:', err);
    }
  }

  public downloadManifestJson(config?: ManifestConfig) {
    const data = config || this.getManifestConfig();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ----------------------------------------------------
     SUBSCRIPTIONS & LIFECYCLE
  ---------------------------------------------------- */
  public subscribe(listener: PwaListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = { ...this.state };
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  public getState(): PwaState {
    return { ...this.state };
  }

  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    if (!this.deferredPrompt) {
      return 'unsupported';
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        this.deferredPrompt = null;
        this.state.canInstall = false;
        this.notify();
        return 'accepted';
      } else {
        return 'dismissed';
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
      return 'unsupported';
    }
  }

  public updateApp() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    } else {
      window.location.reload();
    }
  }
}

export const pwaService = new PwaService();


