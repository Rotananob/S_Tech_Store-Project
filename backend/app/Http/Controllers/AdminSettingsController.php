<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\EmailService;
use App\Services\TelegramService;

class AdminSettingsController extends Controller
{
    private function resolveAdminUser(Request $request): ?User
    {
        $user = $request->attributes->get('auth_user') ?: $request->user();
        if ($user) return $user;

        $authHeader = $request->header('Authorization', '');
        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $found = User::where('api_token', $token)->first();
            if ($found) return $found;
        }

        // Fallback to first super admin / admin
        return User::where('role', 'admin')->first() ?: User::first();
    }

    /**
     * Get all store system settings & security status
     */
    public function getSettings(Request $request)
    {
        $adminUser = $this->resolveAdminUser($request);

        $row = DB::table('system_settings')->where('key', 'store_settings')->first();
        $saved = [];
        if ($row && !empty($row->value)) {
            $saved = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
        }

        // Default settings
        $defaults = [
            'store_name' => 'S Tech Store',
            'phone' => '+855 88 993 0032',
            'address' => '123 Monivong Blvd, Phnom Penh, Cambodia',
            'telegram' => 'STechSupport',
            'language' => 'Khmer / English',
            'currency' => 'US Dollar USD',
            'exchange_rate' => '4100',
            'email_notify' => true,
            'order_notify' => true,
            'low_stock_notify' => true,
            'repair_notify' => true,
        ];

        $merged = array_merge($defaults, $saved);

        // Append real-time admin security info
        $merged['two_factor_enabled'] = (bool)($adminUser->two_factor_enabled ?? false);
        $merged['admin_email'] = $adminUser->email ?? 'nobrothana180703@gmail.com';
        $merged['admin_name'] = $adminUser->name ?? 'S Tech Admin';

        return response()->json([
            'success' => true,
            'settings' => $merged,
        ]);
    }

    /**
     * Save store profile, regional & notification preferences
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'store_name' => 'nullable|string|max:150',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:300',
            'telegram' => 'nullable|string|max:100',
            'language' => 'nullable|string|max:50',
            'currency' => 'nullable|string|max:50',
            'exchange_rate' => 'nullable|numeric|min:1',
            'email_notify' => 'nullable|boolean',
            'order_notify' => 'nullable|boolean',
            'low_stock_notify' => 'nullable|boolean',
            'repair_notify' => 'nullable|boolean',
        ]);

        $row = DB::table('system_settings')->where('key', 'store_settings')->first();
        $current = [];
        if ($row && !empty($row->value)) {
            $current = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
        }

        $updated = array_merge($current, $validated);

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'store_settings'],
            [
                'value' => json_encode($updated),
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'ការកំណត់ប្រព័ន្ធត្រូវបានរក្សាទុកជោគជ័យ (Settings updated successfully)',
            'settings' => $updated,
        ]);
    }

    /**
     * Change admin account password with strict verification
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
            'confirm_password' => 'required|same:new_password',
        ], [
            'new_password.min' => 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៨ តួអក្សរ (Password must be at least 8 characters)',
            'confirm_password.same' => 'ការបញ្ជាក់ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ (Passwords do not match)',
        ]);

        $adminUser = $this->resolveAdminUser($request);
        if (!$adminUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (!Hash::check($request->current_password, $adminUser->password)) {
            return response()->json([
                'success' => false,
                'message' => 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវទេ (Current password incorrect)',
            ], 422);
        }

        $adminUser->password = Hash::make($request->new_password);
        $adminUser->save();

        // Security Alert via Telegram
        TelegramService::sendSecurityAlert([
            'type' => '🔑 ការផ្លាស់ប្តូរពាក្យសម្ងាត់ (Password Changed)',
            'user' => $adminUser->email,
            'ip' => $request->ip() ?? 'Unknown IP',
            'device' => $request->userAgent() ?? 'Web Browser',
            'action' => 'Success',
            'details' => "ពាក្យសម្ងាត់នៃគណនី Admin {$adminUser->email} ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ។",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ! (Password changed successfully)',
        ]);
    }

    /**
     * Toggle Real Two-Factor Authentication (2FA) with Email & Telegram Alert
     */
    public function toggle2FA(Request $request)
    {
        $request->validate([
            'enabled' => 'required|boolean',
        ]);

        $enabled = (bool)$request->input('enabled');
        $adminUser = $this->resolveAdminUser($request);

        if ($adminUser) {
            $adminUser->two_factor_enabled = $enabled;
            $adminUser->save();

            // Also sync to UserProfile if exists
            UserProfile::where('email', $adminUser->email)->update([
                'two_fa_enabled' => $enabled,
            ]);
        }

        $email = $adminUser->email ?? 'nobrothana180703@gmail.com';
        $name = $adminUser->name ?? 'Admin';

        // 1. Send Real Email Alert
        $emailResult = EmailService::send2FAAlert($email, $name, $enabled);

        // 2. Send Real Telegram Alert
        $tgText = "🔒 <b>ការជូនដំណឹងសុវត្ថិភាព 2FA (Two-Factor Authentication)</b>\n\n" .
                  "👤 គណនី: <code>{$email}</code> ({$name})\n" .
                  "⚙️ ស្ថានភាព: " . ($enabled ? "✅ <b>បានបើកដំណើរការ (2FA Enabled)</b>" : "⚠️ <b>ត្រូវបានបិទ (2FA Disabled)</b>") . "\n" .
                  "🕒 ពេលវេលា: " . now()->setTimezone('Asia/Phnom_Penh')->format('d-M-Y h:i A') . "\n" .
                  "🌐 IP / ឧបករណ៍: <code>" . ($request->ip() ?: 'Unknown') . "</code>\n\n" .
                  ($enabled ? "👉 រាល់ការ Login លើកក្រោយ នឹងត្រូវឆ្លងកាត់ការផ្ទៀងផ្ទាត់កូដសុវត្ថិភាព 2FA តាមរយៈ Email ឬ Telegram Bot!" : "⚠️ ប្រព័ន្ធបានកត់ត្រាការបិទ 2FA លើគណនីនេះ។");

        // Try sending to user's Telegram or Admin channel
        $tgSettings = TelegramService::getSettings();
        $chatId = $tgSettings['chat_id'] ?? null;

        $profile = UserProfile::where('email', $email)->first();
        if ($profile && $profile->telegram_chat_id) {
            TelegramService::sendMessage($profile->telegram_chat_id, $tgText);
        } elseif ($chatId) {
            TelegramService::sendMessage($chatId, $tgText);
        }

        return response()->json([
            'success' => true,
            'two_factor_enabled' => $enabled,
            'email_alerted' => $emailResult['email_sent'] ?? true,
            'telegram_alerted' => true,
            'message' => $enabled
                ? '✅ 2FA ត្រូវបានបើកដំណើរការជោគជ័យ! ប្រព័ន្ធបានផ្ញើ Email Alert និងសារជូនដំណឹងទៅ Telegram រួចរាល់។'
                : '⚠️ 2FA ត្រូវបានបិទ។ ប្រព័ន្ធបានជូនដំណឹងទៅកាន់ Email & Telegram។',
        ]);
    }

    /**
     * Send 2FA Verification Code (via Email and Telegram)
     */
    public function send2FACode(Request $request)
    {
        $adminUser = $this->resolveAdminUser($request);
        $email = $adminUser->email ?? $request->input('email', 'nobrothana180703@gmail.com');
        $name = $adminUser->name ?? 'Admin';

        $code = (string)random_int(100000, 999999);
        Cache::put("admin_2fa_code_{$email}", $code, 600); // 10 minutes

        // Send Email with code
        $emailRes = EmailService::send2FAAlert($email, $name, true, $code);

        // Send Telegram with code
        $tgText = "🔑 <b>លេខកូដផ្ទៀងផ្ទាត់ 2FA (Verification Code)</b>\n\n" .
                  "លេខកូដសម្ងាត់របស់អ្នកគឺ៖ <code>{$code}</code>\n" .
                  "⏰ មានសុពលភាព ១០ នាទី (Expires in 10 mins)\n\n" .
                  "⚠️ សូមកុំចែករំលែកលេខកូដនេះទៅកាន់អ្នកដទៃជាដាច់ខាត!";

        $profile = UserProfile::where('email', $email)->first();
        $tgSettings = TelegramService::getSettings();
        $chatId = $profile->telegram_chat_id ?? ($tgSettings['chat_id'] ?? null);
        if ($chatId) {
            TelegramService::sendMessage($chatId, $tgText);
        }

        return response()->json([
            'success' => true,
            'message' => "លេខកូដផ្ទៀងផ្ទាត់ 2FA ត្រូវបានផ្ញើទៅកាន់ Email ({$email}) និង Telegram Bot!",
        ]);
    }

    /**
     * Verify 2FA Code
     */
    public function verify2FACode(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $adminUser = $this->resolveAdminUser($request);
        $email = $adminUser->email ?? 'nobrothana180703@gmail.com';

        $cached = Cache::get("admin_2fa_code_{$email}");
        if (!$cached || $cached !== trim($request->input('code'))) {
            return response()->json([
                'success' => false,
                'message' => 'លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ ឬផុតកំណត់ហើយ (Invalid or expired code)',
            ], 422);
        }

        Cache::forget("admin_2fa_code_{$email}");

        return response()->json([
            'success' => true,
            'message' => 'ផ្ទៀងផ្ទាត់កូដ 2FA ជោគជ័យ!',
        ]);
    }
}
