import api from "@/lib/api";

export interface MasterSystemState {
  maintenance_mode: boolean;
  maintenance_reason?: string;
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

/**
 * Fetch live Master System status, permissions and metrics
 */
export async function getMasterSystemStatus(): Promise<MasterSystemStatusResponse> {
  const res = await api.get("/admin/master/status");
  return res.data;
}

/**
 * Toggle Store Maintenance Mode
 */
export async function toggleMaintenanceMode(enabled: boolean, reason?: string) {
  const res = await api.post("/admin/master/toggle-maintenance", { enabled, reason });
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
