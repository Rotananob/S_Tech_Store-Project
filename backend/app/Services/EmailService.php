<?php

namespace App\Services;

use App\Models\UserProfile;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmailService
{
    const DOMAIN = 'https://www.s-tech-store.tech';
    const STORE_NAME = 'S Tech Store Cambodia';
    const SUPPORT_EMAIL = 'support@s-tech-store.tech';
    const HOTLINE = '+855 88 993 0032';

    /**
     * Generate secure 1-click Telegram Bot deep-link token and metadata for email integration
     */
    public static function generateTelegramDirectDeepLink(string $email, ?UserProfile $user = null): array
    {
        if (!$user) {
            $user = UserProfile::where('email', $email)->first();
        }

        $botUsername = TelegramService::getCustomerBotUsername();
        $tgToken = 'tglink_' . Str::random(24);

        if ($user) {
            $payload = [
                'user_id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
                'email' => $user->email,
                'display_name' => $user->display_name ?: $user->username,
                'status' => 'pending',
                'created_at' => time(),
            ];
            Cache::put("tg_link_{$tgToken}", $payload, 86400 * 7); // 7 days
            try {
                DB::table('system_settings')->updateOrInsert(
                    ['key' => "tg_link_{$tgToken}"],
                    ['value' => json_encode($payload), 'updated_at' => now()]
                );
            } catch (\Throwable $t) {}
        }

        return [
            'bot_username' => $botUsername,
            'deep_link' => "https://t.me/{$botUsername}?start={$tgToken}",
            'has_telegram_linked' => $user ? !empty($user->telegram_chat_id) : false,
            'telegram_chat_id' => $user ? $user->telegram_chat_id : null,
            'user' => $user,
        ];
    }

    /**
     * Render sleek 1-Click Telegram Bot Direct Action Card for emails
     */
    public static function renderTelegramDeepLinkCard(string $deepLink, string $botUsername, bool $isAlreadyLinked = false): string
    {
        $btnText = $isAlreadyLinked 
            ? "បើក Telegram Bot ទទួលដំណឹង (@{$botUsername})" 
            : "ភ្ជាប់ Telegram Bot 1-Click (@{$botUsername})";
        $badgeText = $isAlreadyLinked 
            ? "TELEGRAM BOT CONNECTED" 
            : "1-CLICK TELEGRAM BOT LINK";
        $descText = $isAlreadyLinked
            ? "គណនីរបស់អ្នកត្រូវបានភ្ជាប់ជាមួយ Telegram រួចរាល់! ចុចដើម្បីបើកមើលការជូនដំណឹង និងសេវាកម្មដោយផ្ទាល់ក្នុង 1-on-1 Inbox។"
            : "ភ្ជាប់គណនីជាមួយ Telegram Bot ផ្លូវការ ដើម្បីឲ្យ Bot ស្គាល់គណនីរបស់អ្នកភ្លាមៗ និងផ្ញើវិក្កយបត្រ ដំណឹងទិញទំនិញ ឬលេខកូដសុវត្ថិភាព 2FA ចូលក្នុង Inbox របស់អ្នកស្វ័យប្រវត្តិ។";

        return <<<HTML
      <div style="background: #0c1424; border: 1px solid rgba(56,189,248,0.28); border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
        <div style="display: inline-block; background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 10px;">
          {$badgeText}
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
          📱 ទទួលដំណឹងបន្ទាន់តាម Telegram Bot (@{$botUsername})
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 16px; line-height: 1.6;">
          {$descText}
        </p>
        <a href="{$deepLink}" style="display: inline-block; background: #0088cc; color: #ffffff !important; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 6px 20px rgba(0,136,204,0.4);" target="_blank">
          {$btnText}
        </a>
      </div>
HTML;
    }

    /**
     * Send Warm Khmer Welcome Email to Newly Registered User
     */
    public static function sendWelcomeEmail(string $email, ?string $username = null): array
    {
        $cleanUsername = !empty($username) ? ltrim($username, '@') : 'អតិថិជនកិត្តិយស';
        $domain = self::DOMAIN;
        $subject = '[S Tech Store] សូមស្វាគមន៍មកកាន់គេហទំព័រផ្លូវការ';

        $user = UserProfile::where('email', $email)->first();
        $tgData = self::generateTelegramDirectDeepLink($email, $user);
        $tgCard = self::renderTelegramDeepLinkCard($tgData['deep_link'], $tgData['bot_username'], $tgData['has_telegram_linked']);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080a0f; color: #e2e8f0; margin: 0; padding: 28px 12px; }
    .card { max-width: 600px; margin: 0 auto; background: #0f131d; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.6); }
    .header { background: linear-gradient(180deg, #181d2a 0%, #0f131d 100%); padding: 36px 24px 28px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .logo-img { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; border: 2px solid rgba(220,38,38,0.4); box-shadow: 0 10px 25px rgba(220,38,38,0.25); display: inline-block; margin-bottom: 14px; }
    .brand-title { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase; }
    .brand-sub { margin: 5px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 0.5px; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.3); color: #f87171; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px; }
    .greeting { font-size: 19px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .lead { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px; }
    .voucher-card { background: linear-gradient(135deg, rgba(220,38,38,0.1) 0%, rgba(139,26,26,0.04) 100%); border: 1px dashed rgba(239,68,68,0.5); border-radius: 16px; padding: 22px; text-align: center; margin-bottom: 28px; }
    .voucher-label { font-size: 11px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
    .voucher-code { font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: 4px; background: #161b26; border: 1px solid rgba(255,255,255,0.08); padding: 8px 24px; border-radius: 10px; display: inline-block; margin-bottom: 8px; }
    .voucher-desc { font-size: 12px; color: #94a3b8; margin: 0; }
    .section-title { font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
    .grid-item { background: #141923; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; }
    .grid-tag { font-size: 10px; font-weight: 700; color: #ef4444; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 4px; }
    .grid-title { font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
    .grid-text { font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0; }
    .btn-row { text-align: center; margin: 30px 0 10px; }
    .btn-primary { display: inline-block; background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 13px 26px; border-radius: 10px; box-shadow: 0 8px 20px rgba(220,38,38,0.3); }
    .btn-secondary { display: inline-block; background: #1a202c; color: #cbd5e1 !important; text-decoration: none; font-weight: 600; font-size: 13px; padding: 13px 22px; border-radius: 10px; margin-left: 8px; border: 1px solid rgba(255,255,255,0.08); }
    .footer { background: #0a0d14; padding: 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); line-height: 1.7; }
    .footer a { color: #f87171; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="{$domain}/logo.jpg" alt="S Tech Store" class="logo-img" />
      <h1 class="brand-title">S Tech Store Cambodia</h1>
      <p class="brand-sub">មជ្ឈមណ្ឌលកុំព្យូទ័រ និងបច្ចេកវិទ្យាឈានមុខគេ • www.s-tech-store.tech</p>
    </div>
    <div class="content">
      <div class="badge">OFFICIAL WELCOME</div>
      <div class="greeting">សួស្តីលោកអ្នក @{$cleanUsername}</div>
      <p class="lead">
        សូមស្វាគមន៍មកកាន់ <strong>S Tech Store Cambodia</strong>។ គណនីរបស់អ្នកត្រូវបានបង្កើតឡើងដោយជោគជ័យ និងមានសុវត្ថិភាពពេញលេញ។ លោកអ្នកអាចចាប់ផ្តើមរុករកផលិតផលបច្ចេកវិទ្យា ផ្គុំម៉ាស៊ីនកុំព្យូទ័រ ឬទិញទំនិញបានភ្លាមៗ។
      </p>

      <div class="voucher-card">
        <div class="voucher-label">កាដូស្វាគមន៍សមាជិកថ្មី ($5.00 USD OFF)</div>
        <div class="voucher-code">WELCOME5</div>
        <p class="voucher-desc">ទទួលបានការបញ្ចុះតម្លៃ $5.00 ភ្លាមៗលើការបញ្ជាទិញដំបូងរបស់អ្នកលើគេហទំព័រ</p>
      </div>

      <div class="section-title">សេវាកម្ម និងមុខងារសំខាន់ៗ</div>
      <div class="grid">
        <div class="grid-item">
          <div class="grid-tag">PC Builder</div>
          <div class="grid-title">ឧបករណ៍ផ្គុំកុំព្យូទ័រ</div>
          <p class="grid-text">ជ្រើសរើសគ្រឿងបន្លាស់តាមចំណង់ចំណូលចិត្ត ជាមួយប្រព័ន្ធត្រួតពិនិត្យភាពស៊ីគ្នារវាង Hardware ១០០%។</p>
        </div>
        <div class="grid-item">
          <div class="grid-tag">Daily Rewards</div>
          <div class="grid-title">រង្វាន់កាក់ប្រចាំថ្ងៃ</div>
          <p class="grid-text">ចូល Login រាល់ថ្ងៃ ទទួលបានកាក់សន្សំ Coin ភ្លាមៗ អាចប្តូរជាទឹកប្រាក់សុទ្ធក្នុង Wallet បាន។</p>
        </div>
        <div class="grid-item">
          <div class="grid-tag">Fast Delivery</div>
          <div class="grid-title">ដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត-ក្រុង</div>
          <p class="grid-text">ទំនិញសុទ្ធ ១០០% ធានាផ្លូវការពីក្រុមហ៊ុន និងការវេចខ្ចប់យ៉ាងមានសុវត្ថិភាពខ្ពស់។</p>
        </div>
        <div class="grid-item">
          <div class="grid-tag">Smart Assistant</div>
          <div class="grid-title">Telegram Bot ២៤/៧</div>
          <p class="grid-text">ភ្ជាប់គណនីជាមួយ @S_TECH_ASSISTANTBOT ដើម្បីទទួលដំណឹងទំនិញ និងទិញទំនិញរហ័ស។</p>
        </div>
      </div>

      <!-- 1-Click Telegram Bot Direct Action Card -->
      {$tgCard}

      <div class="btn-row">
        <a href="{$domain}/products" class="btn-primary" target="_blank">រុករកទំនិញ (Products)</a>
        <a href="{$domain}/build-pc" class="btn-secondary" target="_blank">ផ្គុំ PC Builder</a>
      </div>
    </div>

    <div class="footer">
      <p>ទូរស័ព្ទទំនាក់ទំនង: +855 88 993 0032 | ទីតាំង: រាជធានីភ្នំពេញ កម្ពុជា</p>
      <p>គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
      <p style="margin-top: 6px; color: #475569;">© 2026 S Tech Store Cambodia. រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
    </div>
  </div>
</body>
</html>
HTML;

        // 1. In-app notification
        try {
            $user = UserProfile::where('email', $email)->first();
            if ($user) {
                UserNotification::create([
                    'firebase_uid' => $user->firebase_uid ?: ('usr_' . $user->id),
                    'title' => '🎉 សូមស្វាគមន៍មកកាន់ S Tech Store!',
                    'message' => "សួស្តី @{$cleanUsername}! កាដូស្វាគមន៍ $5 (Voucher: WELCOME5) និងកាក់ប្រចាំថ្ងៃត្រូវបានត្រៀមរួចជាស្រេចសម្រាប់អ្នក។",
                    'type' => 'welcome',
                    'read' => false,
                ]);

                // Telegram companion alert if connected
                if (!empty($user->telegram_chat_id)) {
                    TelegramService::sendMessage(
                        $user->telegram_chat_id,
                        "🎉 <b>សូមស្វាគមន៍មកកាន់ S Tech Store!</b>\n\nសួស្តី @{$cleanUsername}! គណនីរបស់អ្នកបានភ្ជាប់រួចរាល់។ កាដូស្វាគមន៍ $5 (Voucher: <code>WELCOME5</code>) អាចប្រើប្រាស់បានភ្លាមៗលើវេបសាយ https://www.s-tech-store.tech",
                        'HTML',
                        null,
                        TelegramService::getCustomerBotToken()
                    );
                }
            }
        } catch (\Exception $e) {
            Log::warning("Welcome notification creation warning: " . $e->getMessage());
        }

        // 2. Dispatch Email
        $sent = self::tryDispatchMail($email, $subject, $html);

        return [
            'success' => true,
            'email_sent' => $sent,
            'recipient' => $email,
            'username' => $cleanUsername,
            'voucher' => 'WELCOME5',
        ];
    }

    /**
     * Send Luxury Password Reset Link Email
     */
    public static function sendPasswordResetEmail(string $email, ?string $username = null, ?string $token = null): array
    {
        $cleanUsername = !empty($username) ? ltrim($username, '@') : 'អតិថិជនកិត្តិយស';
        $domain = self::DOMAIN;
        $resetToken = $token ?: Str::random(60);

        // Store reset token in cache for 60 minutes
        Cache::put("pwd_reset_{$resetToken}", [
            'email' => $email,
            'created_at' => now()->toIso8601String(),
        ], 60 * 60);

        $resetLink = "{$domain}/reset-password?token={$resetToken}&email=" . urlencode($email);
        $subject = '[S Tech Store] សំណើសុំផ្លាស់ប្តូរពាក្យសម្ងាត់គណនី';

        $user = UserProfile::where('email', $email)->first();
        $tgData = self::generateTelegramDirectDeepLink($email, $user);
        $tgCard = self::renderTelegramDeepLinkCard($tgData['deep_link'], $tgData['bot_username'], $tgData['has_telegram_linked']);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080a0f; color: #e2e8f0; margin: 0; padding: 28px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #0f131d; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.6); }
    .header { background: linear-gradient(180deg, #181d2a 0%, #0f131d 100%); padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .logo-img { width: 68px; height: 68px; border-radius: 14px; object-fit: cover; border: 2px solid rgba(220,38,38,0.4); box-shadow: 0 8px 20px rgba(220,38,38,0.25); display: inline-block; margin-bottom: 12px; }
    .brand-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase; }
    .brand-sub { margin: 4px 0 0; font-size: 11px; color: #94a3b8; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.3); color: #f87171; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .lead { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px; }
    .cta-box { text-align: center; margin: 28px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 8px 24px rgba(220,38,38,0.35); }
    .security-notice { background: #141923; border-left: 3px solid #ef4444; border-radius: 0 10px 10px 0; padding: 14px 18px; margin: 24px 0; font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .alt-link { word-break: break-all; font-family: monospace; font-size: 11px; background: #080a0f; padding: 10px 14px; border-radius: 8px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.06); margin-top: 8px; }
    .footer { background: #0a0d14; padding: 22px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #f87171; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="{$domain}/logo.jpg" alt="S Tech Store" class="logo-img" />
      <h1 class="brand-title">S Tech Store Cambodia</h1>
      <p class="brand-sub">ការកំណត់សុវត្ថិភាពគណនី • Account Security Center</p>
    </div>
    <div class="content">
      <div class="badge">PASSWORD RESET REQUEST</div>
      <div class="greeting">សួស្តីលោកអ្នក @{$cleanUsername}</div>
      <p class="lead">
        យើងខ្ញុំបានទទួលសំណើសុំផ្លាស់ប្តូរពាក្យសម្ងាត់សម្រាប់គណនី S Tech Store ដែលភ្ជាប់ជាមួយអាសយដ្ឋានអ៊ីមែល <strong>{$email}</strong>។
      </p>

      <div class="cta-box">
        <a href="{$resetLink}" class="cta-btn" target="_blank">ផ្លាស់ប្តូរពាក្យសម្ងាត់ (Reset Password)</a>
      </div>

      <div class="security-notice">
        <strong style="color: #f1f5f9;">ការណែនាំអំពីសុវត្ថិភាព:</strong><br>
        • តំណភ្ជាប់នេះមានសុពលភាពត្រឹមតែ <strong>60 នាទី</strong> ប៉ុណ្ណោះ។<br>
        • ប្រសិនបើអ្នកមិនបានស្នើសុំផ្លាស់ប្តូរទេ សូមកុំចែករំលែកតំណភ្ជាប់នេះឱ្យអ្នកដទៃជាដាច់ខាត។ គណនីរបស់អ្នកនៅតែមានសុវត្ថិភាពដដែល។
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 20px; margin-bottom: 4px;">
        ប្រសិនបើប៊ូតុងខាងលើមិនដំណើរការ សូមចម្លងតំណភ្ជាប់ (URL) នេះទៅបើកក្នុង Browser របស់អ្នក:
      </p>
      <div class="alt-link">{$resetLink}</div>

      <!-- 1-Click Telegram Bot Direct Action Card -->
      {$tgCard}
    </div>

    <div class="footer">
      <p>គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
      <p style="margin-top: 6px; color: #475569;">សារជូនដំណឹងសុវត្ថិភាពស្វ័យប្រវត្តពី S Tech Store Cambodia</p>
    </div>
  </div>
</body>
</html>
HTML;

        // In-app alert
        try {
            $user = UserProfile::where('email', $email)->first();
            if ($user) {
                $user->last_password_reset_at = now();
                $user->save();

                UserNotification::create([
                    'firebase_uid' => $user->firebase_uid ?: ('usr_' . $user->id),
                    'title' => '🔒 សំណើសុំប្តូរពាក្យសម្ងាត់',
                    'message' => "តំណភ្ជាប់ផ្លាស់ប្តូរពាក្យសម្ងាត់ត្រូវបានផ្ញើទៅកាន់អ៊ីមែល {$email}។ សុពលភាព 60 នាទី។",
                    'type' => 'security',
                    'read' => false,
                ]);

                if (!empty($user->telegram_chat_id)) {
                    TelegramService::sendMessage(
                        $user->telegram_chat_id,
                        "🔒 <b>ការជូនដំណឹងសុវត្ថិភាព!</b>\n\nសំណើសុំផ្លាស់ប្តូរពាក្យសម្ងាត់សម្រាប់គណនី @{$cleanUsername} ត្រូវបានផ្ញើទៅកាន់ {$email}។ ប្រសិនបើលោកអ្នកមិនបានស្នើសុំទេ សូមទាក់ទងមកកាន់ក្រុមការងារបន្ទាន់។",
                        'HTML',
                        null,
                        TelegramService::getCustomerBotToken()
                    );
                }
            }
        } catch (\Exception $e) {
            Log::warning("Reset alert notification warning: " . $e->getMessage());
        }

        $sent = self::tryDispatchMail($email, $subject, $html);

        return [
            'success' => true,
            'email_sent' => $sent,
            'recipient' => $email,
            'reset_link' => $resetLink,
            'token' => $resetToken,
        ];
    }

    /**
     * Send Luxury Two-Factor Authentication OTP Email Alert
     */
    public static function sendTwoFactorOtpEmail(string $email, ?string $username = null, ?string $action = 'verify', ?string $customOtp = null): array
    {
        $cleanUsername = !empty($username) ? ltrim($username, '@') : 'អតិថិជនកិត្តិយស';
        $domain = self::DOMAIN;
        $otp = $customOtp ?: sprintf('%06d', mt_rand(100000, 999999));

        // Cache OTP for 10 minutes
        Cache::put("2fa_otp_{$email}", $otp, 10 * 60);

        $subject = "[S Tech Store] លេខកូដសុវត្ថិភាពផ្ទៀងផ្ទាត់ OTP ({$otp})";

        $user = UserProfile::where('email', $email)->first();
        $tgData = self::generateTelegramDirectDeepLink($email, $user);
        $tgCard = self::renderTelegramDeepLinkCard($tgData['deep_link'], $tgData['bot_username'], $tgData['has_telegram_linked']);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080a0f; color: #e2e8f0; margin: 0; padding: 28px 12px; }
    .card { max-width: 560px; margin: 0 auto; background: #0f131d; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.6); }
    .header { background: linear-gradient(180deg, #181d2a 0%, #0f131d 100%); padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .logo-img { width: 68px; height: 68px; border-radius: 14px; object-fit: cover; border: 2px solid rgba(220,38,38,0.4); box-shadow: 0 8px 20px rgba(220,38,38,0.25); display: inline-block; margin-bottom: 12px; }
    .brand-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase; }
    .brand-sub { margin: 4px 0 0; font-size: 11px; color: #94a3b8; }
    .content { padding: 32px 28px; text-align: center; }
    .badge { display: inline-block; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3); color: #60a5fa; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .lead { font-size: 13px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .otp-box { background: #0b1120; border: 2px dashed rgba(56,189,248,0.4); border-radius: 16px; padding: 22px; margin: 24px auto; max-width: 300px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; margin: 0; }
    .otp-expiry { font-size: 11px; color: #94a3b8; margin-top: 8px; }
    .security-tips { text-align: left; background: #141923; border-radius: 10px; padding: 16px; margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.6; border-left: 3px solid #38bdf8; }
    .footer { background: #0a0d14; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="{$domain}/logo.jpg" alt="S Tech Store" class="logo-img" />
      <h1 class="brand-title">S Tech Store Cambodia</h1>
      <p class="brand-sub">ការផ្ទៀងផ្ទាត់ពីរកត្តា • Two-Factor Authentication</p>
    </div>
    <div class="content">
      <div class="badge">SECURITY PASSCODE</div>
      <div class="greeting">សួស្តីលោកអ្នក @{$cleanUsername}</div>
      <p class="lead">
        នេះជាលេខកូដសុវត្ថិភាព 2FA របស់អ្នកសម្រាប់ផ្ទៀងផ្ទាត់គណនីលើគេហទំព័រ <strong>S Tech Store</strong>:
      </p>

      <div class="otp-box">
        <div class="otp-code">{$otp}</div>
        <div class="otp-expiry">សុពលភាពត្រឹម 10 នាទី (Valid for 10 minutes)</div>
      </div>

      <div class="security-tips">
        <strong style="color: #f1f5f9;">ការណែនាំអំពីសុវត្ថិភាព:</strong><br>
        • កុំចែករំលែកលេខកូដនេះទៅកាន់បុគ្គលណាផ្សេងជាដាច់ខាត។<br>
        • បុគ្គលិក S Tech Store នឹងមិនទាមទារសួររកលេខកូដ OTP ពីអ្នកឡើយ។
      </div>

      <!-- 1-Click Telegram Bot Direct Action Card -->
      {$tgCard}
    </div>

    <div class="footer">
      <p>គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
      <p style="margin-top: 4px; color: #475569;">© 2026 S Tech Store Cambodia. រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
    </div>
  </div>
</body>
</html>
HTML;

        // In-app alert
        try {
            $user = UserProfile::where('email', $email)->first();
            if ($user) {
                UserNotification::create([
                    'firebase_uid' => $user->firebase_uid ?: ('usr_' . $user->id),
                    'title' => '🛡️ លេខកូដសុវត្ថិភាព 2FA',
                    'message' => "លេខកូដ OTP របស់អ្នកគឺ: {$otp} (សុពលភាព 10 នាទី)",
                    'type' => 'security',
                    'read' => false,
                ]);

                if (!empty($user->telegram_chat_id)) {
                    TelegramService::sendCustomerTwoFactorOtp($user->telegram_chat_id, $otp, $cleanUsername);
                }
            }
        } catch (\Exception $e) {
            Log::warning("2FA notification creation warning: " . $e->getMessage());
        }

        $sent = self::tryDispatchMail($email, $subject, $html);

        return [
            'success' => true,
            'email_sent' => $sent,
            'recipient' => $email,
            'otp' => $otp,
        ];
    }
    /**
     * Send 2FA Activation / Security Alert Email
     */
    public static function send2FAAlert(string $email, string $username, bool $enabled, ?string $code = null): array
    {
        $domain = self::DOMAIN;
        $statusText = $enabled ? "បានបើកដំណើរការ (ENABLED)" : "ត្រូវបានបិទ (DISABLED)";
        $statusColor = $enabled ? "#10b981" : "#ef4444";
        $subject = ($enabled ? '[S Tech Store] បានបើកដំណើរការសុវត្ថិភាព 2FA' : '[S Tech Store] ការជូនដំណឹងបិទសុវត្ថិភាព 2FA');

        $codeHtml = '';
        if (!empty($code)) {
            $codeHtml = <<<HTML
            <div style="background: #0b1120; border: 2px dashed rgba(56,189,248,0.4); border-radius: 14px; padding: 18px; text-align: center; margin: 20px 0;">
                <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">លេខកូដផ្ទៀងផ្ទាត់ 2FA (Verification Code)</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; color: #38bdf8; letter-spacing: 8px;">{$code}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">មានសុពលភាពរយៈពេល ១០ នាទី (Valid for 10 minutes)</div>
            </div>
HTML;
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080a0f; color: #e2e8f0; margin: 0; padding: 28px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #0f131d; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.6); }
    .header { background: linear-gradient(180deg, #181d2a 0%, #0f131d 100%); padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .logo-img { width: 68px; height: 68px; border-radius: 14px; object-fit: cover; border: 2px solid rgba(220,38,38,0.4); box-shadow: 0 8px 20px rgba(220,38,38,0.25); display: inline-block; margin-bottom: 12px; }
    .brand-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase; }
    .brand-sub { margin: 4px 0 0; font-size: 11px; color: #94a3b8; }
    .content { padding: 30px 26px; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
    .badge { display: inline-block; background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px; }
    .status-badge { display: inline-block; background: {$statusColor}18; color: {$statusColor}; border: 1px solid {$statusColor}44; padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 12px; margin: 12px 0; letter-spacing: 0.5px; }
    .security-tips { background: #141923; border-left: 3px solid #38bdf8; border-radius: 0 10px 10px 0; padding: 14px 18px; margin-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .footer { background: #0a0d14; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="{$domain}/logo.jpg" alt="S Tech Store" class="logo-img" />
      <h1 class="brand-title">S Tech Store Cambodia</h1>
      <p class="brand-sub">ការកំណត់សុវត្ថិភាពគណនី • Account Security Center</p>
    </div>
    <div class="content">
      <div class="badge">SECURITY NOTIFICATION</div>
      <p style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 0;">សួស្តីលោកអ្នក <b>{$username}</b>,</p>
      <p>
        នេះជាការជូនដំណឹងសុវត្ថិភាពពីប្រព័ន្ធ <strong>S Tech Store Cambodia</strong>៖ មុខងារផ្ទៀងផ្ទាត់ពីរកត្តា (Two-Factor Authentication - 2FA) លើគណនីរបស់អ្នក <strong>{$email}</strong> ត្រូវបាន៖
      </p>
      <div style="text-align: center;">
        <span class="status-badge">{$statusText}</span>
      </div>
      {$codeHtml}
      <div class="security-tips">
        <strong style="color: #f1f5f9;">ការណែនាំអំពីសុវត្ថិភាព:</strong><br>
        ប្រសិនបើនេះមិនមែនជាសកម្មភាពរបស់អ្នក សូមទាក់ទងមកកាន់ក្រុមការងារ Support បន្ទាន់តាមរយៈ Telegram ឬអ៊ីមែល <strong>support@s-tech-store.tech</strong>។
      </div>
    </div>
    <div class="footer">
      <p>© 2026 S Tech Store Cambodia. រក្សាសិទ្ធិគ្រប់យ៉ាង។<br>
      គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
    </div>
  </div>
</body>
</html>
HTML;

        $sent = self::tryDispatchMail($email, $subject, $html);
        return [
            'success' => true,
            'email_sent' => $sent,
            'recipient' => $email,
            'status' => $statusText,
        ];
    }

    /**
     * Send Luxury Email Confirmation & Verification Code to Customer's Gmail
     */
    public static function sendEmailConfirmation(string $email, ?string $username = null, ?string $customOtp = null): array
    {
        $cleanUsername = !empty($username) ? ltrim($username, '@') : 'អតិថិជនកិត្តិយស';
        $domain = self::DOMAIN;
        $otp = $customOtp ?: sprintf('%06d', mt_rand(100000, 999999));
        $token = Str::random(60);

        // Cache verification OTP for 15 minutes
        Cache::put("email_verify_otp_{$email}", $otp, 15 * 60);
        // Cache verification token for 24 hours
        Cache::put("email_verify_token_{$token}", [
            'email' => $email,
            'created_at' => now()->toIso8601String(),
        ], 24 * 60 * 60);

        $confirmLink = "{$domain}/confirm-email?token={$token}&email=" . urlencode($email);
        $subject = "[S Tech Store] ផ្ទៀងផ្ទាត់អាសយដ្ឋានអ៊ីមែល ({$otp})";

        $user = UserProfile::where('email', $email)->first();
        $tgData = self::generateTelegramDirectDeepLink($email, $user);
        $tgCard = self::renderTelegramDeepLinkCard($tgData['deep_link'], $tgData['bot_username'], $tgData['has_telegram_linked']);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080a0f; color: #e2e8f0; margin: 0; padding: 28px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #0f131d; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.6); }
    .header { background: linear-gradient(180deg, #181d2a 0%, #0f131d 100%); padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .logo-img { width: 68px; height: 68px; border-radius: 14px; object-fit: cover; border: 2px solid rgba(220,38,38,0.4); box-shadow: 0 8px 20px rgba(220,38,38,0.25); display: inline-block; margin-bottom: 12px; }
    .brand-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase; }
    .brand-sub { margin: 4px 0 0; font-size: 11px; color: #94a3b8; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .lead { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px; }
    .otp-box { background: #064e3b15; border: 2px dashed rgba(16,185,129,0.4); border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #10b981; margin: 0; }
    .otp-sub { font-size: 11px; color: #94a3b8; margin-top: 6px; }
    .cta-box { text-align: center; margin: 26px 0 10px; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 8px 20px rgba(16,185,129,0.3); }
    .alt-link { word-break: break-all; font-family: monospace; font-size: 11px; background: #080a0f; padding: 10px 14px; border-radius: 8px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.06); margin-top: 8px; }
    .footer { background: #0a0d14; padding: 22px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #10b981; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="{$domain}/logo.jpg" alt="S Tech Store" class="logo-img" />
      <h1 class="brand-title">S Tech Store Cambodia</h1>
      <p class="brand-sub">ផ្ទៀងផ្ទាត់អាសយដ្ឋានអ៊ីមែល • Email Address Verification</p>
    </div>
    <div class="content">
      <div class="badge">EMAIL VERIFICATION</div>
      <div class="greeting">សួស្តីលោកអ្នក @{$cleanUsername}</div>
      <p class="lead">
        សូមប្រើប្រាស់លេខកូដសម្ងាត់ ៦ ខ្ទង់ខាងក្រោម ឬចុចប៊ូតុងដើម្បីផ្ទៀងផ្ទាត់ថាអាសយដ្ឋាន <strong>{$email}</strong> ពិតជាកម្មសិទ្ធិស្របច្បាប់របស់អ្នក៖
      </p>

      <div class="otp-box">
        <div class="otp-label">លេខកូដផ្ទៀងផ្ទាត់ (Verification Code)</div>
        <div class="otp-code">{$otp}</div>
        <div class="otp-sub">សុពលភាពត្រឹម 15 នាទី (Valid for 15 minutes)</div>
      </div>

      <div class="cta-box">
        <a href="{$confirmLink}" class="cta-btn" target="_blank">ផ្ទៀងផ្ទាត់គណនី (Confirm Email)</a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 20px; margin-bottom: 4px;">
        ប្រសិនបើប៊ូតុងខាងលើមិនដំណើរការ សូមចម្លងតំណភ្ជាប់ (URL) នេះទៅបើកក្នុង Browser របស់អ្នក:
      </p>
      <div class="alt-link">{$confirmLink}</div>

      <!-- 1-Click Telegram Bot Direct Action Card -->
      {$tgCard}
    </div>

    <div class="footer">
      <p>គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
      <p style="margin-top: 6px; color: #475569;">សារជូនដំណឹងសុវត្ថិភាពស្វ័យប្រវត្តពី S Tech Store Cambodia</p>
    </div>
  </div>
</body>
</html>
HTML;

        // In-app alert & Telegram companion
        try {
            if ($user) {
                UserNotification::create([
                    'firebase_uid' => $user->firebase_uid ?: ('usr_' . $user->id),
                    'title' => '✉️ ផ្ទៀងផ្ទាត់ Gmail របស់អ្នក',
                    'message' => "លេខកូដបញ្ជាក់អ៊ីមែលគឺ {$otp}។ សូមបញ្ចូលក្នុងទំព័រដើម្បីបញ្ចប់ការផ្ទៀងផ្ទាត់។",
                    'type' => 'security',
                    'read' => false,
                ]);

                if (!empty($user->telegram_chat_id)) {
                    TelegramService::sendMessage(
                        $user->telegram_chat_id,
                        "🔐 <b>[S TECH STORE] លេខកូដផ្ទៀងផ្ទាត់ Gmail ({$email})</b>\n\nលេខកូដ OTP របស់អ្នកគឺ: <code>{$otp}</code> (សុពលភាព 15 នាទី)។\n\n👉 <i>លោកអ្នកអាចបញ្ចូលលេខកូដនេះលើគេហទំព័រ ឬចុច Confirm ភ្លាមៗ។</i>",
                        'HTML',
                        null,
                        TelegramService::getCustomerBotToken()
                    );
                }
            }
        } catch (\Throwable $e) {}

        $sent = self::tryDispatchMail($email, $subject, $html);

        return [
            'success' => true,
            'email_sent' => $sent,
            'recipient' => $email,
            'otp' => $otp,
            'token' => $token,
            'confirm_link' => $confirmLink,
        ];
    }

    /**
     * Send Real Khmer Ticket Email (Repair / Support / Warranty)
     */
    public static function sendTicketConfirmationEmail(array $ticketData): array
    {
        $email = $ticketData['customer_email'] ?? $ticketData['email'] ?? null;
        if (empty($email)) {
            return ['success' => false, 'error' => 'No customer email provided for ticket'];
        }

        $customerName = $ticketData['customer_name'] ?? 'អតិថិជនកិត្តិយស';
        $ticketCode = $ticketData['ticket_code'] ?? ('TKT-' . rand(1000, 9999));
        $deviceName = $ticketData['device_name'] ?? ($ticketData['subject'] ?? 'ឧបករណ៍បច្ចេកវិទ្យា');
        $status = $ticketData['status'] ?? 'Pending Assessment';
        $technician = $ticketData['technician_name'] ?? 'ក្រុមការងារបច្ចេកទេស S Tech';
        $cost = isset($ticketData['estimated_cost']) ? '$' . number_format((float)$ticketData['estimated_cost'], 2) : 'Under Assessment';
        $issue = $ticketData['issue_description'] ?? ($ticketData['message'] ?? 'កំពុងពិនិត្យស្ថានភាព');
        $domain = self::DOMAIN;
        $trackingUrl = "{$domain}/warranty?ticket=" . urlencode($ticketCode);

        $statusColor = '#f59e0b';
        if (in_array(strtolower($status), ['ready', 'completed', 'resolved'])) {
            $statusColor = '#10b981';
        } elseif (in_array(strtolower($status), ['in progress', 'repairing'])) {
            $statusColor = '#3b82f6';
        }

        $user = UserProfile::where('email', $email)->first();
        $tgData = self::generateTelegramDirectDeepLink($email, $user);
        $tgCard = self::renderTelegramDeepLinkCard($tgData['deep_link'], $tgData['bot_username'], $tgData['has_telegram_linked']);

        $subject = "[S Tech Store] {$ticketCode} — បច្ចុប្បន្នភាពសំបុត្រជួសជុល & សេវាកម្ម";

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080a0f; color: #e2e8f0; margin: 0; padding: 28px 12px; }
    .card { max-width: 600px; margin: 0 auto; background: #0f131d; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.6); }
    .header { background: linear-gradient(180deg, #181d2a 0%, #0f131d 100%); padding: 34px 24px 26px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .logo-img { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; border: 2px solid rgba(220,38,38,0.4); box-shadow: 0 10px 25px rgba(220,38,38,0.25); display: inline-block; margin-bottom: 14px; }
    .brand-title { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase; }
    .brand-sub { margin: 5px 0 0; font-size: 12px; color: #94a3b8; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.3); color: #f87171; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px; }
    .status-badge { display: inline-block; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #fff; background-color: {$statusColor}; text-transform: uppercase; }
    .ticket-card { background: #141923; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 22px; margin: 20px 0; }
    .ticket-code { font-family: monospace; font-size: 22px; font-weight: 900; color: #f87171; }
    .info-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
    .info-label { color: #94a3b8; font-weight: 600; }
    .info-val { font-weight: 700; color: #f8fafc; text-align: right; }
    .issue-box { background: #0b1120; border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 16px; margin-top: 16px; font-size: 13px; color: #cbd5e1; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
    .grid-item { background: #141923; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 14px; }
    .grid-tag { font-size: 10px; font-weight: 700; color: #ef4444; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 4px; }
    .grid-title { font-size: 12px; font-weight: 700; color: #f1f5f9; margin-bottom: 3px; }
    .grid-text { font-size: 11px; color: #94a3b8; line-height: 1.4; margin: 0; }
    .btn-row { text-align: center; margin: 26px 0 10px; }
    .btn-primary { display: inline-block; background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 13px 26px; border-radius: 10px; box-shadow: 0 8px 20px rgba(220,38,38,0.3); }
    .btn-secondary { display: inline-block; background: #1a202c; color: #cbd5e1 !important; text-decoration: none; font-weight: 600; font-size: 13px; padding: 13px 22px; border-radius: 10px; margin-left: 8px; border: 1px solid rgba(255,255,255,0.08); }
    .footer { background: #0a0d14; padding: 22px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); line-height: 1.6; }
    .footer a { color: #f87171; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="{$domain}/logo.jpg" alt="S Tech Store" class="logo-img" />
      <h1 class="brand-title">S Tech Store Cambodia</h1>
      <p class="brand-sub">មជ្ឈមណ្ឌលសេវាកម្មជួសជុល & សំបុត្រជំនួយ • www.s-tech-store.tech</p>
    </div>
    <div class="content">
      <div class="badge">SERVICE TICKET</div>
      <p style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 0;">ជំរាបសួរលោកអ្នក <b>{$customerName}</b>,</p>
      <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">
        យើងខ្ញុំសូមជម្រាបជូននូវព័ត៌មានលម្អិតនៃសំបុត្រជួសជុល / សេវាកម្មបច្ចេកទេសរបស់អ្នកដូចខាងក្រោម៖
      </p>

      <div class="ticket-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <span class="ticket-code">{$ticketCode}</span>
          <span class="status-badge">{$status}</span>
        </div>

        <div class="info-row">
          <span class="info-label">ឧបករណ៍ (Device):</span>
          <span class="info-val">{$deviceName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ជាងទទួលបន្ទុក (Technician):</span>
          <span class="info-val">{$technician}</span>
        </div>
        <div class="info-row">
          <span class="info-label">តម្លៃប៉ាន់ស្មាន (Est. Cost):</span>
          <span class="info-val" style="color: #4ade80;">{$cost}</span>
        </div>

        <div class="issue-box">
          <strong style="color: #f1f5f9;">រោគសញ្ញា / ការពិពណ៌នាបញ្ហា:</strong><br>
          {$issue}
        </div>
      </div>

      <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">រុករកសេវាកម្មបន្ថែម</div>
      <div class="grid">
        <div class="grid-item">
          <div class="grid-tag">PC Builder</div>
          <div class="grid-title">ផ្គុំកុំព្យូទ័រ</div>
          <p class="grid-text">ជ្រើសរើសគ្រឿងបន្លាស់តាមចិត្ត ពិនិត្យភាពស៊ីគ្នារវាង Hardware ១០០%។</p>
        </div>
        <div class="grid-item">
          <div class="grid-tag">Daily Rewards</div>
          <div class="grid-title">រង្វាន់កាក់ប្រចាំថ្ងៃ</div>
          <p class="grid-text">Login ប្រចាំថ្ងៃ ទទួលបានកាក់សន្សំ Coin ប្តូរជាទឹកប្រាក់សុទ្ធ។</p>
        </div>
        <div class="grid-item">
          <div class="grid-tag">Fast Delivery</div>
          <div class="grid-title">ដឹកជញ្ជូនរហ័ស</div>
          <p class="grid-text">ទំនិញសុទ្ធ ១០០% ធានាផ្លូវការពីក្រុមហ៊ុនទូទាំងប្រទេស។</p>
        </div>
        <div class="grid-item">
          <div class="grid-tag">Telegram Bot</div>
          <div class="grid-title">ជំនួយការ ២៤/៧</div>
          <p class="grid-text">ភ្ជាប់ @S_TECH_ASSISTANTBOT ទទួលដំណឹងសេវាកម្មរហ័ស។</p>
        </div>
      </div>

      <!-- 1-Click Telegram Bot Direct Action Card -->
      {$tgCard}

      <div class="btn-row">
        <a href="{$trackingUrl}" class="btn-primary" target="_blank">តាមដានស្ថានភាពសំបុត្រ (Track Ticket)</a>
        <a href="{$domain}/products" class="btn-secondary" target="_blank">រុករកទំនិញ (Products)</a>
      </div>
    </div>
    <div class="footer">
      <p>ទូរស័ព្ទ: +855 88 993 0032 | ទីតាំង: រាជធានីភ្នំពេញ កម្ពុជា</p>
      <p>© 2026 S Tech Store Cambodia. រក្សាសិទ្ធិគ្រប់យ៉ាង។<br>
      គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
    </div>
  </div>
</body>
</html>
HTML;

        $sent = self::tryDispatchMail($email, $subject, $html);
        return [
            'success' => true,
            'email_sent' => $sent,
            'recipient' => $email,
            'ticket_code' => $ticketCode,
            'tracking_url' => $trackingUrl,
        ];
    }

    /**
     * Retrieve global email settings from database (system_settings) with .env fallbacks
     */
    public static function getSettings(): array
    {
        $dbRow = null;
        try {
            $dbRow = DB::table('system_settings')->where('key', 'email_settings')->first();
        } catch (\Throwable $e) {
            Log::warning("Could not query system_settings for email: " . $e->getMessage());
        }

        $saved = [];
        if ($dbRow && !empty($dbRow->value)) {
            $saved = is_string($dbRow->value) ? json_decode($dbRow->value, true) : (array)$dbRow->value;
        }

        $resendApiKey = $saved['resend_api_key'] ?? env('RESEND_API_KEY');
        $brevoApiKey = $saved['brevo_api_key'] ?? env('BREVO_API_KEY');
        $smtpHost = $saved['smtp_host'] ?? env('MAIL_HOST');
        $smtpPort = (int)($saved['smtp_port'] ?? env('MAIL_PORT', 587));
        $smtpUsername = $saved['smtp_username'] ?? env('MAIL_USERNAME');
        $smtpPassword = $saved['smtp_password'] ?? env('MAIL_PASSWORD');
        $smtpEncryption = $saved['smtp_encryption'] ?? env('MAIL_ENCRYPTION', 'tls');
        $fromEmail = $saved['from_email'] ?? env('MAIL_FROM_ADDRESS', 'orders@s-tech-store.tech');
        $fromName = $saved['from_name'] ?? env('MAIL_FROM_NAME', self::STORE_NAME);

        $cleanPassword = str_replace(' ', '', (string)$smtpPassword);

        // Check if SMTP credentials are real or placeholder
        $isDummySmtp = empty($smtpHost) || 
                       $smtpHost === '127.0.0.1' || 
                       str_contains($smtpHost, 'mailtrap.io') || 
                       $smtpUsername === 'your_mail_username' || 
                       empty($smtpUsername) || 
                       empty($cleanPassword);

        $isGmail = ($saved['provider'] ?? '') === 'gmail' || str_contains((string)$smtpHost, 'gmail');
        $hasResend = !empty($resendApiKey) && str_starts_with(trim($resendApiKey), 're_');
        $hasBrevo = !empty($brevoApiKey) && strlen(trim($brevoApiKey)) > 10;
        $hasSmtp = !$isDummySmtp;
        $hasGmail = $isGmail && !$isDummySmtp;

        $activeEngine = 'none';
        $savedProvider = $saved['provider'] ?? 'auto';

        if ($savedProvider === 'gmail' && $hasGmail) {
            $activeEngine = 'gmail';
        } elseif ($savedProvider === 'smtp' && $hasSmtp) {
            $activeEngine = 'smtp';
        } elseif ($savedProvider === 'resend' && $hasResend) {
            $activeEngine = 'resend';
        } elseif ($savedProvider === 'brevo' && $hasBrevo) {
            $activeEngine = 'brevo';
        } else {
            // Auto detection priority: Gmail/SMTP > Resend > Brevo
            if ($hasGmail) {
                $activeEngine = 'gmail';
            } elseif ($hasResend) {
                $activeEngine = 'resend';
            } elseif ($hasSmtp) {
                $activeEngine = 'smtp';
            } elseif ($hasBrevo) {
                $activeEngine = 'brevo';
            }
        }

        return [
            'provider' => $savedProvider,
            'resend_api_key' => $resendApiKey ? substr($resendApiKey, 0, 7) . '••••••••' : null,
            'has_resend_key' => $hasResend,
            'brevo_api_key' => $brevoApiKey ? substr($brevoApiKey, 0, 6) . '••••••••' : null,
            'has_brevo_key' => $hasBrevo,
            'smtp_host' => $smtpHost,
            'smtp_port' => $smtpPort,
            'smtp_username' => $smtpUsername ? (str_contains($smtpUsername, '@') ? $smtpUsername : 'configured') : null,
            'smtp_encryption' => $smtpEncryption,
            'has_smtp' => $hasSmtp,
            'is_gmail' => $isGmail,
            'has_gmail' => $hasGmail,
            'gmail_address' => $isGmail ? $smtpUsername : null,
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'active_engine' => $activeEngine,
            'is_ready' => $activeEngine !== 'none',
            'render_port_blocked' => true,
            // Raw internal values
            '_raw_resend_key' => $resendApiKey,
            '_raw_brevo_key' => $brevoApiKey,
            '_raw_smtp_password' => $cleanPassword,
            '_raw_smtp_username' => $smtpUsername,
            '_raw_smtp_host' => $smtpHost,
            '_raw_smtp_port' => $smtpPort,
            '_raw_smtp_encryption' => $smtpEncryption,
        ];
    }

    /**
     * Save email configuration into database
     */
    public static function saveSettings(array $data): array
    {
        $current = self::getSettings();
        $provider = $data['provider'] ?? $current['provider'] ?? 'auto';
        
        $toSave = [
            'provider' => $provider,
            'from_email' => !empty($data['from_email']) ? trim($data['from_email']) : ($current['from_email'] ?? 'orders@s-tech-store.tech'),
            'from_name' => !empty($data['from_name']) ? trim($data['from_name']) : ($current['from_name'] ?? self::STORE_NAME),
        ];

        // Gmail Preset Auto-Configuration
        if ($provider === 'gmail') {
            $toSave['smtp_host'] = 'smtp.gmail.com';
            $toSave['smtp_port'] = (int)($data['smtp_port'] ?? 587);
            $toSave['smtp_encryption'] = ($toSave['smtp_port'] === 465) ? 'ssl' : 'tls';
            
            $gmailUser = !empty($data['gmail_address']) ? trim($data['gmail_address']) : (!empty($data['smtp_username']) ? trim($data['smtp_username']) : '');
            if ($gmailUser) {
                $toSave['smtp_username'] = $gmailUser;
                // Gmail requires sender address to match the authenticated Google account
                if (empty($data['from_email']) || str_contains($data['from_email'], 's-tech-store.tech')) {
                    $toSave['from_email'] = $gmailUser;
                }
            } elseif (!empty($current['_raw_smtp_username'])) {
                $toSave['smtp_username'] = $current['_raw_smtp_username'];
            }

            $rawPass = $data['gmail_app_password'] ?? $data['smtp_password'] ?? null;
            if (!empty($rawPass) && !str_contains($rawPass, '••••')) {
                $toSave['smtp_password'] = str_replace(' ', '', trim($rawPass));
            } elseif (!empty($current['_raw_smtp_password'])) {
                $toSave['smtp_password'] = $current['_raw_smtp_password'];
            }
        } elseif (isset($data['smtp_host'])) {
            $toSave['smtp_host'] = trim($data['smtp_host']);
            $toSave['smtp_port'] = (int)($data['smtp_port'] ?? 587);
            $toSave['smtp_username'] = trim($data['smtp_username'] ?? '');
            $toSave['smtp_encryption'] = trim($data['smtp_encryption'] ?? 'tls');
            if (!empty($data['smtp_password']) && !str_contains($data['smtp_password'], '••••')) {
                $toSave['smtp_password'] = str_replace(' ', '', trim($data['smtp_password']));
            } elseif (!empty($current['_raw_smtp_password'])) {
                $toSave['smtp_password'] = $current['_raw_smtp_password'];
            }
        }

        if (!empty($data['resend_api_key']) && !str_contains($data['resend_api_key'], '••••')) {
            $toSave['resend_api_key'] = trim($data['resend_api_key']);
        } elseif (!empty($current['_raw_resend_key'])) {
            $toSave['resend_api_key'] = $current['_raw_resend_key'];
        }

        if (!empty($data['brevo_api_key']) && !str_contains($data['brevo_api_key'], '••••')) {
            $toSave['brevo_api_key'] = trim($data['brevo_api_key']);
        } elseif (!empty($current['_raw_brevo_key'])) {
            $toSave['brevo_api_key'] = $current['_raw_brevo_key'];
        }

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'email_settings'],
            [
                'value' => json_encode($toSave),
                'updated_at' => now(),
            ]
        );

        return self::getSettings();
    }

    /**
     * Universal Dispatcher: Sends HTML email with auto-failover
     * 1. Native SMTP (Gmail with App Password / Custom SMTP)
     * 2. Resend HTTPS API (Port 443 - 100% compatible with Render Free Tier)
     * 3. Brevo HTTPS API (Port 443)
     */
    public static function dispatchHtmlEmail(string $to, string $subject, string $html, array $options = []): array
    {
        $cleanTo = trim($to);
        if (empty($cleanTo) || !filter_var($cleanTo, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'provider' => 'none',
                'error' => "អាសយដ្ឋាន Email '{$cleanTo}' មិនត្រឹមត្រូវតាមទម្រង់ផ្លូវការ",
            ];
        }

        if (str_ends_with($cleanTo, '@s-tech-store.tech') || 
            str_ends_with($cleanTo, '@telegram.s-tech-store.tech') ||
            str_ends_with($cleanTo, '@tiktok.s-tech-store.tech')) {
            return [
                'success' => false,
                'provider' => 'none',
                'error' => "មិនអាចផ្ញើទៅកាន់ Synthetic Email Placeholder បានទេ",
            ];
        }

        $settings = self::getSettings();
        $fromName = $options['from_name'] ?? $settings['from_name'] ?? self::STORE_NAME;
        $fromEmail = $options['from_email'] ?? $settings['from_email'] ?? 'orders@s-tech-store.tech';
        $preferredProvider = strtolower(trim((string)($settings['provider'] ?? 'auto')));

        $errors = [];

        // ── Channel 1: SMTP / Real Gmail (Standard SMTP Port 587 / 465) ────────
        $sendViaSmtp = function() use ($settings, $cleanTo, $subject, $html, $fromEmail, $fromName, $options, &$errors) {
            $smtpHost = $settings['_raw_smtp_host'] ?? null;
            $smtpUsername = $settings['_raw_smtp_username'] ?? null;
            $smtpPassword = $settings['_raw_smtp_password'] ?? null;
            $smtpPort = (int)($settings['_raw_smtp_port'] ?? 587);
            $smtpEncryption = $settings['_raw_smtp_encryption'] ?? 'tls';

            $cleanPassword = str_replace(' ', '', (string)$smtpPassword);

            $isDummySmtp = empty($smtpHost) || 
                           $smtpHost === '127.0.0.1' || 
                           str_contains($smtpHost, 'mailtrap.io') || 
                           $smtpUsername === 'your_mail_username' || 
                           empty($smtpUsername) || 
                           empty($cleanPassword);

            if ($isDummySmtp) {
                return null;
            }

            try {
                $displayFromEmail = !empty($fromEmail) ? $fromEmail : $smtpUsername;
                $replyToEmail = $options['reply_to'] ?? $displayFromEmail ?? 'support@s-tech-store.tech';

                config([
                    'mail.default' => 'smtp',
                    'mail.mailers.smtp.transport' => 'smtp',
                    'mail.mailers.smtp.host' => $smtpHost,
                    'mail.mailers.smtp.port' => (int)$smtpPort,
                    'mail.mailers.smtp.username' => $smtpUsername,
                    'mail.mailers.smtp.password' => $cleanPassword,
                    'mail.mailers.smtp.encryption' => $smtpEncryption,
                    'mail.mailers.smtp.timeout' => 12,
                    'mail.from.address' => $displayFromEmail,
                    'mail.from.name' => $fromName,
                ]);

                Mail::purge('smtp');

                Mail::html($html, function ($msg) use ($cleanTo, $subject, $displayFromEmail, $fromName, $replyToEmail, $options) {
                    $msg->to($cleanTo)->subject($subject);
                    $msg->from($displayFromEmail, $fromName);
                    $msg->replyTo($replyToEmail, $fromName);
                    if (!empty($options['attachments']) && is_array($options['attachments'])) {
                        foreach ($options['attachments'] as $att) {
                            if (!empty($att['data']) && !empty($att['name'])) {
                                $msg->attachData($att['data'], $att['name'], [
                                    'mime' => $att['mime'] ?? 'text/html',
                                ]);
                            } elseif (!empty($att['path']) && file_exists($att['path'])) {
                                $msg->attach($att['path'], [
                                    'as' => $att['name'] ?? null,
                                    'mime' => $att['mime'] ?? null,
                                ]);
                            }
                        }
                    }
                });

                $isGmail = str_contains((string)$smtpHost, 'gmail.com');
                Log::info("SMTP dispatched email successfully to {$cleanTo} via {$smtpHost}");
                return [
                    'success' => true,
                    'provider' => $isGmail ? 'gmail' : 'smtp',
                    'recipient' => $cleanTo,
                    'message' => 'បានបញ្ជូន Email ជោគជ័យតាមរយៈ ' . ($isGmail ? 'Gmail SMTP' : "SMTP ({$smtpHost})"),
                ];
            } catch (\Throwable $t) {
                $errors['smtp'] = "SMTP Error: " . $t->getMessage();
                Log::warning("Direct SMTP dispatch failed to {$cleanTo}: " . $t->getMessage() . " — Attempting HTTPS Vercel Gateway fallback...");

                // Fallback: If on Render Free Tier or cloud where ports 25, 465, 587 are blocked,
                // tunnel via HTTPS port 443 to the Vercel Serverless Gateway!
                try {
                    $gatewayUrl = env('FRONTEND_URL', 'https://www.s-tech-store.tech');
                    if (str_contains($gatewayUrl, 'localhost')) {
                        $gatewayUrl = 'https://www.s-tech-store.tech';
                    }
                    $dispatchEndpoint = rtrim($gatewayUrl, '/') . '/api/email/dispatch';
                    $secret = env('PAYMENT_WEBHOOK_SECRET', 'stech_pay_whsec_99a8b1c4d2e3f567890123456789abcdef');

                    $payload = [
                        'to' => $cleanTo,
                        'subject' => $subject,
                        'html' => $html,
                        'from_name' => $fromName,
                        'from_email' => $displayFromEmail,
                        'reply_to' => $options['reply_to'] ?? 'support@s-tech-store.tech',
                    ];
                    if (!empty($options['attachments']) && is_array($options['attachments'])) {
                        $payload['attachments'] = $options['attachments'];
                    }

                    $gateRes = Http::timeout(15)
                        ->withHeaders(['x-email-secret' => $secret])
                        ->post($dispatchEndpoint, $payload);

                    if ($gateRes->successful() && ($gateRes->json()['success'] ?? false) === true) {
                        Log::info("HTTPS Vercel Gateway dispatched email successfully to {$cleanTo}");
                        return [
                            'success' => true,
                            'provider' => 'gmail',
                            'recipient' => $cleanTo,
                            'message' => 'បានបញ្ជូន Email ជោគជ័យតាមរយៈ Gmail SMTP (Secure Gateway)',
                        ];
                    } else {
                        $errors['gateway'] = "Gateway Error: " . $gateRes->body();
                        Log::warning("HTTPS Vercel Gateway failed: " . $gateRes->body());
                    }
                } catch (\Throwable $gateErr) {
                    $errors['gateway'] = "Gateway Exception: " . $gateErr->getMessage();
                    Log::warning("HTTPS Vercel Gateway exception: " . $gateErr->getMessage());
                }

                return null;
            }
        };

        // ── Channel 2: Resend HTTPS API (Port 443 - 100% cloud & Render firewall unblocked) ──
        $sendViaResend = function() use ($settings, $cleanTo, $subject, $html, $fromEmail, $fromName, $options, &$errors) {
            $resendKey = $settings['_raw_resend_key'] ?? null;
            if (empty($resendKey)) {
                return null;
            }

            try {
                $sender = !empty($fromEmail) && str_contains($fromEmail, '@') ? $fromEmail : 'orders@s-tech-store.tech';

                $sendWithFrom = function(string $fromAddress) use ($fromName, $cleanTo, $subject, $html, $options, $resendKey) {
                    $payload = [
                        'from' => "{$fromName} <{$fromAddress}>",
                        'to' => [$cleanTo],
                        'subject' => $subject,
                        'html' => $html,
                    ];

                    if (!empty($options['reply_to'])) {
                        $payload['reply_to'] = $options['reply_to'];
                    }

                    if (!empty($options['attachments']) && is_array($options['attachments'])) {
                        $payload['attachments'] = [];
                        foreach ($options['attachments'] as $att) {
                            $attData = !empty($att['data']) ? $att['data'] : (!empty($att['path']) && file_exists($att['path']) ? file_get_contents($att['path']) : '');
                            if ($attData) {
                                $payload['attachments'][] = [
                                    'filename' => $att['name'] ?? 'invoice.html',
                                    'content' => base64_encode($attData),
                                ];
                            }
                        }
                    }

                    return Http::timeout(12)
                        ->withToken(trim($resendKey))
                        ->post('https://api.resend.com/emails', $payload);
                };

                // 1. Try sending from official store domain
                $res = $sendWithFrom($sender);

                // 2. If domain unverified (HTTP 403 / 422), fallback to sandbox onboarding@resend.dev
                if (!$res->successful() && $sender !== 'onboarding@resend.dev') {
                    $retryRes = $sendWithFrom('onboarding@resend.dev');
                    if ($retryRes->successful()) {
                        $res = $retryRes;
                    }
                }

                if ($res->successful()) {
                    $data = $res->json();
                    Log::info("Resend HTTPS API dispatched email successfully to {$cleanTo}. ID: " . ($data['id'] ?? 'N/A'));
                    return [
                        'success' => true,
                        'provider' => 'resend',
                        'message_id' => $data['id'] ?? null,
                        'recipient' => $cleanTo,
                        'message' => 'បានបញ្ជូន Email ជោគជ័យតាមរយៈ Resend HTTPS (Port 443)',
                    ];
                } else {
                    $errText = $res->body();
                    $errors['resend'] = "Resend API Error ({$res->status()}): {$errText}";
                    Log::warning("Resend dispatch failed to {$cleanTo}: {$errText}");
                    return null;
                }
            } catch (\Throwable $t) {
                $errors['resend'] = "Resend Exception: " . $t->getMessage();
                Log::warning("Resend exception: " . $t->getMessage());
                return null;
            }
        };

        // ── Channel 3: Brevo HTTPS API (Port 443) ──────────────────────────────
        $sendViaBrevo = function() use ($settings, $cleanTo, $subject, $html, $fromEmail, $fromName, &$errors) {
            $brevoKey = $settings['_raw_brevo_key'] ?? null;
            if (empty($brevoKey)) {
                return null;
            }

            try {
                $payload = [
                    'sender' => ['name' => $fromName, 'email' => $fromEmail],
                    'to' => [['email' => $cleanTo]],
                    'subject' => $subject,
                    'htmlContent' => $html,
                ];

                $res = Http::timeout(12)
                    ->withHeaders([
                        'api-key' => trim($brevoKey),
                        'Content-Type' => 'application/json',
                    ])
                    ->post('https://api.brevo.com/v3/smtp/email', $payload);

                if ($res->successful()) {
                    $data = $res->json();
                    Log::info("Brevo HTTPS API dispatched email to {$cleanTo}. MessageId: " . ($data['messageId'] ?? 'N/A'));
                    return [
                        'success' => true,
                        'provider' => 'brevo',
                        'message_id' => $data['messageId'] ?? null,
                        'recipient' => $cleanTo,
                        'message' => 'បានបញ្ជូន Email ជោគជ័យតាមរយៈ Brevo HTTPS (Port 443)',
                    ];
                } else {
                    $errText = $res->body();
                    $errors['brevo'] = "Brevo API Error ({$res->status()}): {$errText}";
                    Log::warning("Brevo dispatch failed: {$errText}");
                    return null;
                }
            } catch (\Throwable $t) {
                $errors['brevo'] = "Brevo Exception: " . $t->getMessage();
                Log::warning("Brevo exception: " . $t->getMessage());
                return null;
            }
        };

        // Execution according to selected Provider Preference:
        if (in_array($preferredProvider, ['gmail', 'smtp'])) {
            $res = $sendViaSmtp();
            if ($res) return $res;
            // Fallback to Resend or Brevo
            $res = $sendViaResend();
            if ($res) return $res;
            $res = $sendViaBrevo();
            if ($res) return $res;
        } elseif ($preferredProvider === 'resend') {
            $res = $sendViaResend();
            if ($res) return $res;
            // Fallback to SMTP or Brevo
            $res = $sendViaSmtp();
            if ($res) return $res;
            $res = $sendViaBrevo();
            if ($res) return $res;
        } elseif ($preferredProvider === 'brevo') {
            $res = $sendViaBrevo();
            if ($res) return $res;
            $res = $sendViaResend();
            if ($res) return $res;
            $res = $sendViaSmtp();
            if ($res) return $res;
        } else {
            // 'auto' mode: try SMTP/Gmail if configured, or Resend, or Brevo
            if ($settings['has_smtp']) {
                $res = $sendViaSmtp();
                if ($res) return $res;
            }
            if ($settings['has_resend_key']) {
                $res = $sendViaResend();
                if ($res) return $res;
            }
            if ($settings['has_brevo_key']) {
                $res = $sendViaBrevo();
                if ($res) return $res;
            }
        }

        // ─── If all failed or unconfigured ──────────────────────────────────────
        $hasAnyKey = !empty($settings['_raw_resend_key']) || !empty($settings['_raw_brevo_key']) || $settings['has_smtp'];
        $errMsg = "";
        if (!$hasAnyKey) {
            $errMsg = "Server មិនទាន់មានសេវា EMAIL SERVICE (Gmail App Password ឬ Resend API Key) នៅឡើយទេ! សូមចូលទៅកាន់ Admin Settings -> Email & Gmail Delivery ដើម្បីភ្ជាប់ Gmail ឬ Resend API Key រួចសាកល្បងផ្ញើម្តងទៀត។";
        } else {
            $errMsg = "ការផ្ញើ Email មិនបានសម្រេច៖ " . implode(" | ", $errors);
        }

        return [
            'success' => false,
            'provider' => 'none',
            'error' => $errMsg,
            'diagnostic_errors' => $errors,
        ];
    }

    /**
     * Helper to safely dispatch mail without crashing
     */
    private static function tryDispatchMail(string $to, string $subject, string $html): bool
    {
        $res = self::dispatchHtmlEmail($to, $subject, $html);
        return ($res['success'] ?? false) === true;
    }
}
