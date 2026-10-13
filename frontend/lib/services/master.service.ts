import api from "@/lib/api";

export interface MasterSystemState {
  mode?: "online" | "vacation" | "maintenance";
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
  status: "online" | "vacation" | "maintenance";
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
 * Fetch public store status for customer storefront & PWA guard
 */
export async function getPublicStoreStatus(): Promise<PublicStoreStatusResponse> {
  try {
    const res = await fetch(`/api/store-status?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  return {
    status: "online",
    vacation: { active: false, title: "", reason: "", end_time: null, days: 3, started_at: null },
    maintenance: { active: false, title: "", reason: "", end_time: null },
    staff_lockdown: { active: false, reason: "" },
    server_time: new Date().toISOString(),
  };
}

/**
 * Toggle Store Maintenance Mode
 */
export async function toggleMaintenanceMode(enabled: boolean, reason?: string, title?: string, endTime?: string) {
  const res = await api.post("/admin/master/toggle-maintenance", { enabled, reason, title, end_time: endTime });
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
