import api from "@/lib/api";

export interface MasterSystemState {
  mode?: "online" | "vacation" | "maintenance" | "night_lock";
  maintenance_mode: boolean;
  maintenance_title?: string;
  maintenance_reason?: string;
  maintenance_end_time?: string | null;
  vacation_mode: boolean;
  vacation_title?: string;
  vacation_reason?: string;
  vacation_end_time?: string | null;
  vacation_days?: number;
  vacation_started_at?: string | null;
  night_lock_enabled?: boolean;
  night_lock_forced?: boolean;
  night_lock_start?: string;
  night_lock_end?: string;
  night_lock_title?: string;
  night_lock_reason?: string;
  night_lock_updated_at?: string;
  staff_lockdown: boolean;
  staff_lockdown_reason?: string;
  financial_freeze: boolean;
  financial_freeze_reason?: string;
  coin_multiplier: number;
  force_app_version: string;
  last_cache_purge?: string | null;
  last_backup_at?: string | null;
  last_backup_file?: string | null;
  emergency_lockdown?: boolean;
  audit_logs?: any[];
}

export interface MasterSystemMetrics {
  active_staff_sessions: number;
  total_users: number;
  total_orders: number;
  total_products: number;
  php_version: string;
  laravel_version: string;
  server_time: string;
}

export interface MasterSystemStatusResponse {
  success: boolean;
  is_super_admin: boolean;
  current_role: string;
  current_user: string;
  state: MasterSystemState;
  metrics: MasterSystemMetrics;
}

export interface PublicStoreStatusResponse {
  status: "online" | "vacation" | "maintenance" | "night_lock";
  night_lock?: {
    active: boolean;
    enabled: boolean;
    forced: boolean;
    title: string;
    reason: string;
    start_time: string;
    end_time: string;
    reopen_at: string | null;
    cambodia_time?: string;
  };
  vacation: {
    active: boolean;
    title: string;
    reason: string;
    end_time: string | null;
    days: number;
    started_at: string | null;
  };
  maintenance: {
    active: boolean;
    title: string;
    reason: string;
    end_time: string | null;
  };
  staff_lockdown: {
    active: boolean;
    reason: string;
  };
  server_time: string;
}

/**
 * Fetch live Master System status, permissions and metrics
 */
export async function getMasterSystemStatus(): Promise<MasterSystemStatusResponse> {
  const res = await api.get("/admin/master/status");
  return res.data;
}

/**
 * Fetch public store status for customer storefront & PWA guard (Smart Cached)
 */
let memoryStoreStatusCache: { data: PublicStoreStatusResponse; timestamp: number } | null = null;

export async function getPublicStoreStatus(forceRefresh = false): Promise<PublicStoreStatusResponse> {
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL (saves 99.9% of cloud free tier requests)

  // 1. Check in-memory fast cache
  if (!forceRefresh && memoryStoreStatusCache && (Date.now() - memoryStoreStatusCache.timestamp < CACHE_TTL_MS)) {
    return memoryStoreStatusCache.data;
  }

  // 2. Check sessionStorage
  if (!forceRefresh && typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem("stech_store_status_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.timestamp && (Date.now() - parsed.timestamp < CACHE_TTL_MS)) {
          memoryStoreStatusCache = parsed;
          return parsed.data;
        }
      }
    } catch (e) {}
  }

  // 3. Fallback to network request (clean without wasteful anti-cache param)
  try {
    const res = await fetch(`/api/store-status`, {
      headers: { "Accept": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const cacheObj = { data, timestamp: Date.now() };
      memoryStoreStatusCache = cacheObj;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("stech_store_status_cache", JSON.stringify(cacheObj));
        } catch (e) {}
      }
      return data;
    }
  } catch (e) {}

  if (memoryStoreStatusCache) {
    return memoryStoreStatusCache.data;
  }

  return {
    status: "online",
    night_lock: {
      active: false,
      enabled: true,
      forced: false,
      title: "សុវត្ថិភាពពេលរាត្រី (Cybersecurity Night Lockdown)",
      reason: "ប្រព័ន្ធត្រូវបានការពារ និងបិទប្រតិបត្តិការពេលយប់ដោយស្វ័យប្រវត្តិចាប់ពីម៉ោង 02:00 AM ដល់ 06:00 AM",
      start_time: "02:00",
      end_time: "06:00",
      reopen_at: null,
    },
    vacation: { active: false, title: "", reason: "", end_time: null, days: 3, started_at: null },
    maintenance: { active: false, title: "", reason: "", end_time: null },
    staff_lockdown: { active: false, reason: "" },
    server_time: new Date().toISOString(),
  };
}

/**
 * Invalidate store status cache immediately and notify listeners
 */
export function clearStoreStatusCache() {
  memoryStoreStatusCache = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("stech_store_status_cache");
      window.dispatchEvent(new CustomEvent("stech_store_status_changed"));
    } catch (e) {}
  }
}

/**
 * Toggle Cybersecurity Night Lock (02:00 AM - 06:00 AM)
 */
export async function toggleNightLockMode(options: {
  enabled?: boolean;
  forced?: boolean;
  start_time?: string;
  end_time?: string;
  title?: string;
  reason?: string;
}) {
  const res = await api.post("/admin/master/toggle-night-lock", options);
  clearStoreStatusCache();
  return res.data;
}

/**
 * Toggle Store Maintenance Mode
 */
export async function toggleMaintenanceMode(enabled: boolean, reason?: string, title?: string, endTime?: string) {
  const res = await api.post("/admin/master/toggle-maintenance", { enabled, reason, title, end_time: endTime });
  clearStoreStatusCache();
  return res.data;
}

/**
 * Toggle Store Temporary Closure / Vacation with Custom Days & Countdown
 */
export async function toggleVacationMode(
  enabled: boolean,
  options?: { days?: number; hours?: number; end_time?: string; title?: string; reason?: string }
) {
  const res = await api.post("/admin/master/toggle-vacation", {
    enabled,
    days: options?.days ?? 3,
    hours: options?.hours ?? 0,
    end_time: options?.end_time,
    title: options?.title,
    reason: options?.reason,
  });
  clearStoreStatusCache();
  return res.data;
}

/**
 * Toggle Complete Staff & Sub-Admin Activity Lockdown
 */
export async function toggleStaffLockdown(enabled: boolean, reason?: string) {
  const res = await api.post("/admin/master/toggle-staff-lockdown", { enabled, reason });
  return res.data;
}

/**
 * Force Global System & CDN Cache Purge
 */
export async function purgeGlobalCaches() {
  const res = await api.post("/admin/master/purge-caches");
  clearStoreStatusCache();
  return res.data;
}

/**
 * Toggle Financial Transactions Freeze
 */
export async function toggleFinancialFreeze(enabled: boolean, reason?: string) {
  const res = await api.post("/admin/master/toggle-financial-freeze", { enabled, reason });
  return res.data;
}

/**
 * Trigger Instant Database Snapshot & Backup
 */
export async function backupDatabaseSnapshot() {
  const res = await api.post("/admin/master/backup-database");
  return res.data;
}

/**
 * Broadcast Client App Update
 */
export async function forceClientUpdateBroadcast(version: string, force = true, notes?: string[]) {
  const res = await api.post("/admin/master/force-client-update", { version, force, notes });
  return res.data;
}

/**
 * Emergency SOS Broadcast to all Telegram Staff Topics
 */
export async function sendEmergencySos(message?: string) {
  const res = await api.post("/admin/master/sos-broadcast", { message });
  return res.data;
}

/**
 * Emergency Revoke All Staff & Admin Sessions
 */
export async function revokeAllStaffSessions() {
  const res = await api.post("/admin/master/revoke-all-staff-sessions");
  return res.data;
}

/**
 * Adjust Global Reward Coin Multiplier
 */
export async function updateCoinMultiplier(multiplier: number) {
  const res = await api.post("/admin/master/coin-multiplier", { multiplier });
  return res.data;
}
