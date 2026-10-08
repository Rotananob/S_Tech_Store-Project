import { create } from 'zustand';

export interface VersionInfo {
  version: string;
  build?: string;
  releaseName?: string;
  buildTime?: string;
  changelog?: string[];
}

interface UpdateState {
  hasUpdate: boolean;
  updateInfo: VersionInfo | null;
  isChecking: boolean;
  isUpdating: boolean;
  dismissed: boolean;
  lastChecked: number | null;
  waitingWorker: ServiceWorker | null;
  setHasUpdate: (hasUpdate: boolean, info?: VersionInfo | null, worker?: ServiceWorker | null) => void;
  checkForUpdates: (manual?: boolean) => Promise<{ hasUpdate: boolean; message: string }>;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

// Stored current runtime version (matches public/version.json initial load)
const CURRENT_VERSION = "2.4.2";
let clientBootTime = Date.now();

export const useUpdateStore = create<UpdateState>((set, get) => ({
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
    try {
      let foundUpdate = false;
      let detectedInfo: VersionInfo | null = null;
      let workerInstance: ServiceWorker | null = null;

      // 1. Service Worker check
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
          console.warn("SW update check error:", swErr);
        }
      }

      // 2. Static version.json check with anti-cache query
      try {
        const res = await fetch(`/version.json?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });
        if (res.ok) {
          const data: VersionInfo = await res.json();
          detectedInfo = data;
          
          // Check if version changed or build is newer
          const storedVersion = typeof window !== 'undefined' ? sessionStorage.getItem('stech_app_version') : null;
          if (storedVersion && storedVersion !== data.version) {
            foundUpdate = true;
          } else if (data.version !== CURRENT_VERSION) {
            foundUpdate = true;
          }
          if (typeof window !== 'undefined' && !storedVersion) {
            sessionStorage.setItem('stech_app_version', data.version);
          }
        }
      } catch (fetchErr) {
        // Offline or fetch issue
      }

      // If manual check and user forced check, simulate/demonstrate active state if requested
      set({
        isChecking: false,
        lastChecked: Date.now(),
        hasUpdate: foundUpdate,
        updateInfo: detectedInfo || {
          version: CURRENT_VERSION,
          releaseName: "S Tech Store Official",
          changelog: ["Performance & Edge speed optimizations", "Taobao visual camera lens", "Security updates"],
        },
        waitingWorker: workerInstance,
      });

      if (foundUpdate) {
        return { hasUpdate: true, message: `New version ${detectedInfo?.version || 'update'} is ready to install!` };
      } else {
        return { hasUpdate: false, message: `You are on the latest version v${CURRENT_VERSION} (Up to date).` };
      }
    } catch (err) {
      set({ isChecking: false });
      return { hasUpdate: false, message: "Checked for updates. System is up to date." };
    }
  },

  applyUpdate: () => {
    set({ isUpdating: true });
    try {
      const worker = get().waitingWorker;
      if (worker) {
        worker.postMessage({ type: "SKIP_WAITING" });
      }
      if (typeof window !== "undefined") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload();
          });
        }
        // Fallback reload after brief delay
        setTimeout(() => {
          window.location.reload();
        }, 600);
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
}));
