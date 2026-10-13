import { create } from 'zustand';

export interface VersionInfo {
  version: string;
  currentVersion?: string;
  build?: string;
  releaseName?: string;
  buildTime?: string;
  releaseDate?: string;
  changelog?: string[];
  forceUpdate?: boolean;
}

interface UpdateState {
  currentVersion: string;
  hasUpdate: boolean;
  updateInfo: VersionInfo | null;
  isChecking: boolean;
  isUpdating: boolean;
  dismissed: boolean;
  lastChecked: number | null;
  waitingWorker: ServiceWorker | null;
  setHasUpdate: (hasUpdate: boolean, info?: VersionInfo | null, worker?: ServiceWorker | null) => void;
  checkForUpdates: (manual?: boolean) => Promise<{ hasUpdate: boolean; message: string; version?: string }>;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  openUpdateModal: () => void;
}

// Official base release version
export const OFFICIAL_APP_VERSION = "1.1.0";

function isNewerVersion(latest: string, current: string): boolean {
  if (!latest || !current) return false;
  const l = latest.replace(/^v/i, "").split(".").map(Number);
  const c = current.replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lNum = l[i] || 0;
    const cNum = c[i] || 0;
    if (lNum > cNum) return true;
    if (lNum < cNum) return false;
  }
  return false;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  currentVersion: OFFICIAL_APP_VERSION,
  hasUpdate: false,
  updateInfo: null,
  isChecking: false,
  isUpdating: false,
  dismissed: false,
  lastChecked: null,
  waitingWorker: null,

  setHasUpdate: (hasUpdate, info = null, worker = null) => {
    set({
      hasUpdate,
      updateInfo: info || get().updateInfo,
      waitingWorker: worker || get().waitingWorker,
      dismissed: false,
    });
  },

  checkForUpdates: async (manual = false) => {
    set({ isChecking: true });

    const installedVersion = typeof window !== 'undefined'
      ? localStorage.getItem('stech_installed_version') || OFFICIAL_APP_VERSION
      : OFFICIAL_APP_VERSION;

    try {
      let foundUpdate = false;
      let detectedInfo: VersionInfo | null = null;
      let workerInstance: ServiceWorker | null = null;

      // 1. Service Worker Update Check
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              foundUpdate = true;
              workerInstance = reg.waiting;
            }
          }
        } catch (swErr) {
          console.warn("SW update check exception:", swErr);
        }
      }

      // 2. Query Live API /app-version (falls back to /version.json)
      try {
        let res = await fetch(`/api/app-version?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });

        if (!res.ok) {
          res = await fetch(`/version.json?_t=${Date.now()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
          });
        }

        if (res.ok) {
          const data = await res.json();
          const remoteVersion = data.version || OFFICIAL_APP_VERSION;

          detectedInfo = {
            version: remoteVersion,
            currentVersion: installedVersion,
            build: data.build,
            releaseName: data.release_name || data.releaseName || `S Tech Store v${remoteVersion}`,
            releaseDate: data.release_date || data.buildTime || "2026-10-13",
            changelog: data.changelog || [
              "Instant Telegram Webhook & 0ms Local-First Cache optimization",
              "Universal NBC Bakong KHQR, ABA Deep-Link & Card Checkout",
              "Real-Time Coin Reward & Auto-Popup for live product browsing",
              "$5.00 USD Welcome Gift directly credited to S-Tech Wallet",
              "Account Settings Real Gmail Sync & Order Notification Dispatch",
              "Grand Master Command Console with Super-Admin Control & Security Vault",
            ],
            forceUpdate: data.force_update || false,
          };

          // Check if remote version is newer than client installed version
          if (isNewerVersion(remoteVersion, installedVersion)) {
            foundUpdate = true;
          } else if (workerInstance) {
            foundUpdate = true;
          }
        }
      } catch (fetchErr) {
        console.warn("Version fetch exception:", fetchErr);
      }

      const finalInfo = detectedInfo || {
        version: OFFICIAL_APP_VERSION,
        currentVersion: installedVersion,
        releaseName: "S Tech Store Official Release v1.1.0",
        releaseDate: "2026-10-13",
        changelog: [
          "Instant Telegram Webhook & 0ms Local-First Cache optimization",
          "Universal NBC Bakong KHQR, ABA Deep-Link & Card Checkout",
          "Real-Time Coin Reward & Auto-Popup for live product browsing",
          "$5.00 USD Welcome Gift directly credited to S-Tech Wallet",
          "Account Settings Real Gmail Sync & Order Notification Dispatch",
          "Grand Master Command Console with Super-Admin Control & Security Vault",
        ],
      };

      set({
        currentVersion: installedVersion,
        isChecking: false,
        lastChecked: Date.now(),
        hasUpdate: foundUpdate,
        updateInfo: finalInfo,
        waitingWorker: workerInstance,
        dismissed: foundUpdate ? false : get().dismissed,
      });

      if (foundUpdate) {
        return {
          hasUpdate: true,
          version: finalInfo.version,
          message: `មានកំណែអាប់ដេតថ្មី v${finalInfo.version} រួចរាល់សម្រាប់ដំឡើង! (New Version Available)`,
        };
      } else {
        return {
          hasUpdate: false,
          version: installedVersion,
          message: `កម្មវិធីដំណើរការលើ Version ចុងក្រោយបំផុត v${installedVersion} រួចរាល់ហើយ! (Up to Date)`,
        };
      }
    } catch (err) {
      set({ isChecking: false });
      return {
        hasUpdate: false,
        version: installedVersion,
        message: `កំណែបច្ចុប្បន្ន v${installedVersion} គឺចុងក្រោយបំផុតហើយ!`,
      };
    }
  },

  applyUpdate: async () => {
    set({ isUpdating: true });
    try {
      const worker = get().waitingWorker;
      if (worker) {
        worker.postMessage({ type: "SKIP_WAITING" });
      }

      // 1. Flush browser cache storage to ensure 100% fresh assets
      if (typeof window !== "undefined" && "caches" in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {}
      }

      // 2. Update installed version in localStorage
      const latestVer = get().updateInfo?.version || OFFICIAL_APP_VERSION;
      if (typeof window !== "undefined") {
        localStorage.setItem("stech_installed_version", latestVer);
        sessionStorage.setItem("stech_app_version", latestVer);

        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload();
          });
        }

        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (e) {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  },

  dismissUpdate: () => {
    set({ dismissed: true });
  },

  openUpdateModal: () => {
    set({ dismissed: false, hasUpdate: true });
  },
}));
