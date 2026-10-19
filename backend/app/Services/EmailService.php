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
     * Send Warm Khmer Welcome Email to Newly Registered User
     */
    public static function sendWelcomeEmail(string $email, ?string $username = null): array
    {
        $cleanUsername = !empty($username) ? ltrim($username, '@') : 'អតិថិជនកិត្តិយស';
        $domain = self::DOMAIN;
        $subject = '🎉 សូមស្វាគមន៍មកកាន់ ' . self::STORE_NAME;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', 'Siemreap', Arial, sans-serif; background-color: #0c0f17; color: #e2e8f0; margin: 0; padding: 24px 12px; }
    .card { max-width: 620px; margin: 0 auto; background: #151922; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #8B1A1A 0%, #B91C1C 60%, #E11D48 100%); padding: 36px 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; }
    .lead { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 22px; }
    .voucher-box { background: linear-gradient(135deg, rgba(139,26,26,0.15) 0%, rgba(220,38,38,0.08) 100%); border: 1px dashed #ef4444; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 26px; }
    .voucher-title { font-size: 12px; font-weight: bold; color: #f87171; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .voucher-code { font-family: monospace; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: 4px; background: #1c212c; padding: 8px 18px; border-radius: 10px; display: inline-block; margin-bottom: 6px; }
    .voucher-sub { font-size: 12px; color: #94a3b8; }
    .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 26px; }
    .feature-item { background: #1a202c; border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 14px; }
    .feature-item strong { display: block; font-size: 13px; color: #f1f5f9; margin-bottom: 4px; }
    .feature-item span { font-size: 11px; color: #94a3b8; line-height: 1.4; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #8B1A1A 0%, #DC2626 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-align: center; box-shadow: 0 8px 20px rgba(220,38,38,0.3); }
    .cta-btn-alt { display: inline-block; background: #262c3b; color: #e2e8f0 !important; text-decoration: none; font-weight: 600; font-size: 13px; padding: 12px 20px; border-radius: 12px; margin-left: 8px; }
    .footer { background: #10141d; padding: 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #f87171; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 32px; margin-bottom: 8px;">🚀</div>
      <h1>S TECH STORE CAMBODIA</h1>
      <p>មជ្ឈមណ្ឌលកុំព្យូទ័រ និងបច្ចេកវិទ្យាឈានមុខគេ • www.s-tech-store.tech</p>
    </div>
    <div class="content">
      <div class="greeting">សួស្តីលោកអ្នក @{$cleanUsername}! 👋</div>
      <p class="lead">
        សូមស្វាគមន៍យ៉ាងកក់ក្តៅមកកាន់ <strong>S Tech Store</strong>! យើងខ្ញុំពិតជារីករាយក្រៃលែងដែលលោកអ្នកបានចូលរួមជាសមាជិកគ្រួសារបច្ចេកវិទ្យាជាមួយយើង។ គណនីរបស់អ្នកត្រូវបានបង្កើតឡើងដោយជោគជ័យ និងអាចប្រើប្រាស់បានភ្លាមៗ!
      </p>

      <div class="voucher-box">
        <div class="voucher-title">🎁 កាដូស្វាគមន៍ពិសេសសម្រាប់សមាជិកថ្មី ($5 OFF)</div>
        <div class="voucher-code">WELCOME5</div>
        <div class="voucher-sub">បញ្ចុះតម្លៃ $5.00 ភ្លាមៗលើរាល់ការបញ្ជាទិញដំបូងរបស់អ្នក!</div>
      </div>

      <div class="feature-grid">
        <div class="feature-item">
          <strong>🪙 កាក់រង្វាន់ប្រចាំថ្ងៃ (Daily Coin)</strong>
          <span>ចូល Login រាល់ថ្ងៃ ទទួលបាន 1 Coin ភ្លាមៗ អាចប្តូរជាលុយសុទ្ធក្នុងកាបូប Wallet បាន!</span>
        </div>
        <div class="feature-item">
          <strong>🖥️ ឧបករណ៍ផ្គុំកុំព្យូទ័រ PC Builder</strong>
          <span>ផ្គុំកុំព្យូទ័រតាមចំណង់ចំណូលចិត្ត ត្រួតពិនិត្យភាពស៊ីគ្នា 100% មុននឹងបញ្ជាទិញ។</span>
        </div>
        <div class="feature-item">
          <strong>🤖 ជំនួយការឆ្លាតវៃ Telegram Bot</strong>
          <span>ទទួលបានការជូនដំណឹងពីស្ថានភាពទំនិញ និងទិញទំនិញរហ័សតាម @S_TECH_ASSISTANTBOT។</span>
        </div>
        <div class="feature-item">
          <strong>🚚 ដឹកជញ្ជូនរហ័សទូទាំង ២៥ ខេត្ត-ក្រុង</strong>
          <span>ទំនិញសុទ្ធ 100% មានការធានាផ្លូវការ និងការវេចខ្ចប់យ៉ាងមានសុវត្ថិភាពខ្ពស់។</span>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0 10px;">
        <a href="{$domain}/products" class="cta-btn" target="_blank">🛒 រុករកទំនិញឥឡូវនេះ</a>
        <a href="{$domain}/build-pc" class="cta-btn-alt" target="_blank">🖥️ ផ្គុំ PC</a>
      </div>
    </div>

    <div class="footer">
      <p>ទូរស័ព្ទទំនាក់ទំនង: +855 88 993 0032 | ទីតាំង: រាជធានីភ្នំពេញ កម្ពុជា</p>
      <p>គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
      <p style="margin-top: 10px; color: #475569;">© 2026 S Tech Store Cambodia. រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
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
                    'user_id' => $user->firebase_uid ?? (string)$user->id,
                    'title' => '🎉 សូមស្វាគមន៍មកកាន់ S Tech Store!',
                    'message' => "សួស្តី @{$cleanUsername}! កាដូស្វាគមន៍ $5 (Voucher: WELCOME5) និងកាក់ប្រចាំថ្ងៃត្រូវបានត្រៀមរួចជាស្រេចសម្រាប់អ្នក។",
                    'type' => 'welcome',
                    'is_read' => false,
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
        $subject = '🔒 សំណើសុំប្តូរពាក្យសម្ងាត់ - ' . self::STORE_NAME;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', 'Siemreap', Arial, sans-serif; background-color: #0c0f17; color: #e2e8f0; margin: 0; padding: 24px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #151922; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 2px solid #ef4444; padding: 32px 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #f8fafc; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 17px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; }
    .lead { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px; }
    .security-notice { background: rgba(239,68,68,0.08); border-left: 4px solid #ef4444; border-radius: 0 12px 12px 0; padding: 14px 18px; margin: 20px 0; font-size: 12px; color: #fca5a5; line-height: 1.6; }
    .cta-box { text-align: center; margin: 30px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #8B1A1A 0%, #DC2626 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 15px 32px; border-radius: 12px; box-shadow: 0 8px 24px rgba(220,38,38,0.35); letter-spacing: 0.5px; }
    .alt-link { word-break: break-all; font-family: monospace; font-size: 11px; background: #10141d; padding: 10px 14px; border-radius: 8px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.05); }
    .footer { background: #10141d; padding: 22px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #f87171; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 34px; margin-bottom: 8px;">🔐</div>
      <h1>ការកំណត់សុវត្ថិភាពគណនី</h1>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">S Tech Store Security Alert • {$domain}</p>
    </div>
    <div class="content">
      <div class="greeting">សួស្តីលោកអ្នក @{$cleanUsername}!</div>
      <p class="lead">
        យើងបានទទួលសំណើសុំផ្លាស់ប្តូរពាក្យសម្ងាត់សម្រាប់គណនី S Tech Store ដែលភ្ជាប់ជាមួយអាសយដ្ឋានអ៊ីមែល <strong>{$email}</strong>។
      </p>

      <div class="cta-box">
        <a href="{$resetLink}" class="cta-btn" target="_blank">🔑 ផ្លាស់ប្តូរពាក្យសម្ងាត់ឥឡូវនេះ</a>
      </div>

      <div class="security-notice">
        <strong>⚠️ ការណែនាំអំពីសុវត្ថិភាព:</strong><br>
        • តំណភ្ជាប់នេះមានសុពលភាពត្រឹមតែ <strong>60 នាទី</strong> ប៉ុណ្ណោះ។<br>
        • ប្រសិនបើអ្នកមិនបានធ្វើការស្នើសុំនេះទេ សូមកុំចែករំលែកតំណភ្ជាប់នេះឱ្យអ្នកដទៃជាដាច់ខាត គណនីរបស់អ្នកនៅតែមានសុវត្ថិភាពដដែល។
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
        ប្រសិនបើប៊ូតុងខាងលើមិនដំណើរការ សូមចម្លងតំណភ្ជាប់ (URL) នេះទៅបើកក្នុង Browser របស់អ្នក:
      </p>
      <div class="alt-link">{$resetLink}</div>
    </div>

    <div class="footer">
      <p>គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
      <p style="margin-top: 6px; color: #475569;">សារជូនដំណឹងសុវត្ថិភាពដោយស្វ័យប្រវត្តពី S Tech Store Cambodia</p>
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
                    'user_id' => $user->firebase_uid ?? (string)$user->id,
                    'title' => '🔒 សំណើសុំប្តូរពាក្យសម្ងាត់',
                    'message' => "តំណភ្ជាប់ផ្លាស់ប្តូរពាក្យសម្ងាត់ត្រូវបានផ្ញើទៅកាន់អ៊ីមែល {$email}។ សុពលភាព 60 នាទី។",
                    'type' => 'security',
                    'is_read' => false,
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

        $subject = "🛡️ លេខកូដសុវត្ថិភាព 2FA ({$otp}) - " . self::STORE_NAME;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', 'Siemreap', Arial, sans-serif; background-color: #0c0f17; color: #e2e8f0; margin: 0; padding: 24px 12px; }
    .card { max-width: 560px; margin: 0 auto; background: #151922; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 2px solid #38bdf8; padding: 32px 28px; text-align: center; color: #ffffff; }
    .content { padding: 32px 28px; text-align: center; }
    .greeting { font-size: 17px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; }
    .lead { font-size: 13px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .otp-box { background: #0b1120; border: 2px dashed #38bdf8; border-radius: 18px; padding: 22px; margin: 24px auto; max-width: 320px; }
    .otp-code { font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; margin: 0; }
    .otp-expiry { font-size: 11px; color: #94a3b8; margin-top: 8px; }
    .security-tips { text-align: left; background: #1a202c; border-radius: 14px; padding: 16px; margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .footer { background: #10141d; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 36px; margin-bottom: 6px;">🛡️</div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">ការផ្ទៀងផ្ទាត់ពីរកត្តា (Two-Factor Auth)</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">{$domain}</p>
    </div>
    <div class="content">
      <div class="greeting">សួស្តី @{$cleanUsername}!</div>
      <p class="lead">
        នេះជាលេខកូដសុវត្ថិភាព 2FA របស់អ្នកសម្រាប់ផ្ទៀងផ្ទាត់លើគេហទំព័រ <strong>S Tech Store</strong>:
      </p>

      <div class="otp-box">
        <div class="otp-code">{$otp}</div>
        <div class="otp-expiry">⏱️ មានសុពលភាពត្រឹម 10 នាទី</div>
      </div>

      <div class="security-tips">
        <strong style="color: #f8fafc;">💡 គន្លឹះសុវត្ថិភាព:</strong><br>
        • កុំចែករំលែកលេខកូដនេះទៅកាន់បុគ្គលណាផ្សេងជាដាច់ខាត។<br>
        • បុគ្គលិក S Tech Store នឹងមិនទាមទារសួររកលេខកូដ OTP ពីអ្នកឡើយ។
      </div>
    </div>

    <div class="footer">
      <p>គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
      <p style="margin-top: 4px; color: #475569;">© 2026 S Tech Store Cambodia. ប្រព័ន្ធការពារសុវត្ថិភាពគណនី</p>
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
                    'user_id' => $user->firebase_uid ?? (string)$user->id,
                    'title' => '🛡️ លេខកូដសុវត្ថិភាព 2FA',
                    'message' => "លេខកូដ OTP របស់អ្នកគឺ: {$otp} (សុពលភាព 10 នាទី)",
                    'type' => 'security',
                    'is_read' => false,
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
        $statusText = $enabled ? "បានបើកដំណើរការ (Enabled)" : "ត្រូវបានបិទ (Disabled)";
        $statusColor = $enabled ? "#10b981" : "#ef4444";
        $subject = ($enabled ? '🔒 2FA Security Activated: ' : '⚠️ 2FA Security Notice: ') . self::STORE_NAME;

        $codeHtml = '';
        if (!empty($code)) {
            $codeHtml = <<<HTML
            <div style="background:#1e293b; border: 1px dashed #38bdf8; border-radius: 14px; padding: 18px; text-align: center; margin: 20px 0;">
                <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">លេខកូដផ្ទៀងផ្ទាត់ 2FA (Verification Code)</div>
                <div style="font-family: monospace; font-size: 32px; font-weight: 900; color: #38bdf8; letter-spacing: 6px;">{$code}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">មានសុពលភាពរយៈពេល ១០ នាទី (Expires in 10 mins)</div>
            </div>
HTML;
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', Arial, sans-serif; background-color: #0c0f17; color: #e2e8f0; margin: 0; padding: 24px 12px; }
    .card { max-width: 600px; margin: 0 auto; background: #151922; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #8B1A1A 0%, #1e293b 100%); padding: 30px; text-align: center; color: #ffffff; }
    .content { padding: 28px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .status-badge { display: inline-block; background: {$statusColor}22; color: {$statusColor}; border: 1px solid {$statusColor}55; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 13px; margin: 12px 0; }
    .footer { background: #10141d; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin:0;">🔒 Two-Factor Authentication Alert</h2>
      <p style="margin:6px 0 0; font-size: 13px; opacity:0.8;">S Tech Store Security Notification</p>
    </div>
    <div class="content">
      <p>សួស្តីបង <b>{$username}</b>,</p>
      <p>នេះជាការជូនដំណឹងសុវត្ថិភាពពីប្រព័ន្ធ <b>S Tech Store</b>៖ មុខងារផ្ទៀងផ្ទាត់ពីរកត្តា (Two-Factor Authentication - 2FA) លើគណនីរបស់អ្នក <b>{$email}</b> ត្រូវបាន៖</p>
      <div style="text-align:center;">
        <span class="status-badge">{$statusText}</span>
      </div>
      {$codeHtml}
      <p style="font-size: 12px; color: #94a3b8; margin-top: 18px;">
        ប្រសិនបើនេះមិនមែនជាសកម្មភាពរបស់អ្នក សូមទាក់ទងមកកាន់ក្រុមការងារ Support បន្ទាន់តាមរយៈ Telegram ឬអ៊ីមែល <b>support@s-tech-store.tech</b>។
      </p>
    </div>
    <div class="footer">
      © S Tech Store Cambodia • All rights reserved
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
        $subject = "✉️ ផ្ទៀងផ្ទាត់អាសយដ្ឋាន Gmail របស់អ្នក ({$otp}) - " . self::STORE_NAME;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', 'Siemreap', Arial, sans-serif; background-color: #0c0f17; color: #e2e8f0; margin: 0; padding: 24px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #151922; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 60%, #0f172a 100%); padding: 34px 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 17px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; }
    .lead { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px; }
    .otp-box { background: #064e3b15; border: 2px dashed #10b981; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .otp-code { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #10b981; margin: 0; }
    .otp-sub { font-size: 11px; color: #94a3b8; margin-top: 6px; }
    .cta-box { text-align: center; margin: 26px 0 10px; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 8px 20px rgba(16,185,129,0.3); }
    .alt-link { word-break: break-all; font-family: monospace; font-size: 11px; background: #10141d; padding: 10px 14px; border-radius: 8px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.05); margin-top: 8px; }
    .footer { background: #10141d; padding: 22px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #10b981; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 34px; margin-bottom: 8px;">📧</div>
      <h1>ផ្ទៀងផ្ទាត់អាសយដ្ឋាន Gmail</h1>
      <p style="margin: 0; font-size: 12px; opacity: 0.9;">S Tech Store Cambodia • {$domain}</p>
    </div>
    <div class="content">
      <div class="greeting">សួស្តីលោកអ្នក @{$cleanUsername}! 👋</div>
      <p class="lead">
        សូមអរគុណសម្រាប់ការប្រើប្រាស់ <strong>S Tech Store</strong>! សូមប្រើប្រាស់លេខកូដសម្ងាត់ 6 ខ្ទង់ខាងក្រោម ឬចុចប៊ូតុងដើម្បីបញ្ជាក់ថាអាសយដ្ឋាន <strong>{$email}</strong> ពិតជាកម្មសិទ្ធិស្របច្បាប់របស់អ្នក៖
      </p>

      <div class="otp-box">
        <div class="otp-label">លេខកូដផ្ទៀងផ្ទាត់អ៊ីមែល (Verification OTP)</div>
        <div class="otp-code">{$otp}</div>
        <div class="otp-sub">⏱️ មានសុពលភាពរយៈពេល ១៥ នាទី</div>
      </div>

      <div class="cta-box">
        <a href="{$confirmLink}" class="cta-btn" target="_blank">✅ បញ្ជាក់ Gmail ឥឡូវនេះ (1-Click Confirm)</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        ឬលោកអ្នកអាចចម្លងតំណភ្ជាប់នេះដើម្បីបើកក្នុង Browser របស់អ្នក៖
      </p>
      <div class="alt-link">{$confirmLink}</div>
    </div>

    <div class="footer">
      <p>គេហទំព័រផ្លូវការ: <a href="{$domain}">https://www.s-tech-store.tech</a></p>
      <p style="margin-top: 6px; color: #475569;">© 2026 S Tech Store Cambodia. រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
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
                    'user_id' => $user->firebase_uid ?? (string)$user->id,
                    'title' => '✉️ ផ្ទៀងផ្ទាត់ Gmail របស់អ្នក',
                    'message' => "លេខកូដបញ្ជាក់អ៊ីមែលគឺ {$otp}។ សូមបញ្ចូលក្នុងទំព័រដើម្បីបញ្ចប់ការផ្ទៀងផ្ទាត់។",
                    'type' => 'security',
                    'is_read' => false,
                ]);
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

        $subject = "🔧 [{$ticketCode}] បច្ចុប្បន្នភាពសំបុត្រជួសជុល & សេវាកម្ម - " . self::STORE_NAME;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <title>{$subject}</title>
  <style>
    body { font-family: 'Kantumruy Pro', Arial, sans-serif; background-color: #0c0f17; color: #e2e8f0; margin: 0; padding: 24px 12px; }
    .container { max-width: 600px; margin: 0 auto; background: #151922; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #8B1A1A 0%, #b91c1c 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; }
    .content { padding: 28px 24px; }
    .ticket-card { background: #1a202c; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 18px; margin: 18px 0; }
    .ticket-code { font-family: monospace; font-size: 22px; font-weight: 900; color: #f87171; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #fff; background-color: {$statusColor}; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
    .info-label { color: #94a3b8; font-weight: 600; }
    .info-val { font-weight: 700; color: #f8fafc; text-align: right; }
    .issue-box { background: #0f141f; border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; padding: 14px; margin-top: 14px; font-size: 13px; color: #cbd5e1; }
    .cta-box { text-align: center; margin: 26px 0 10px; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #8B1A1A 0%, #dc2626 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 30px; border-radius: 12px; box-shadow: 0 8px 20px rgba(220,38,38,0.3); }
    .footer { background: #10141d; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer a { color: #f87171; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 32px; margin-bottom: 8px;">🔧</div>
      <h1>S TECH STORE CAMBODIA</h1>
      <p style="margin: 0; font-size: 12px; opacity: 0.9;">មជ្ឈមណ្ឌលសេវាកម្មជួសជុល & សំបុត្រជំនួយ (Service Ticket)</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; font-weight: 700; color: #f8fafc; margin-top: 0;">ជំរាបសួរលោកអ្នក <b>{$customerName}</b>,</p>
      <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">
        យើងខ្ញុំសូមជម្រាបជូននូវព័ត៌មានលម្អិតនៃសំបុត្រជួសជុល / សេវាកម្មបច្ចេកទេសរបស់អ្នកដូចខាងក្រោម៖
      </p>

      <div class="ticket-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <span class="ticket-code">{$ticketCode}</span>
          <span class="badge">{$status}</span>
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
          <strong style="color: #f8fafc;">រោគសញ្ញា / ការពិពណ៌នាបញ្ហា:</strong><br>
          {$issue}
        </div>
      </div>

      <div class="cta-box">
        <a href="{$trackingUrl}" class="cta-btn" target="_blank">🔍 តាមដានស្ថានភាពសំបុត្រ (Track Ticket)</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin-top: 20px;">
        📍 <b>ទីតាំងហាង:</b> រាជធានីភ្នំពេញ កម្ពុជា<br>
        📞 <b>ទូរស័ព្ទទំនាក់ទំនង:</b> +855 88 993 0032 | Telegram Bot: @S_TECH_ASSISTANTBOT
      </p>
    </div>
    <div class="footer">
      <p>© 2026 S Tech Store Cambodia. All rights reserved.<br>
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
        $sendViaSmtp = function() use ($settings, $cleanTo, $subject, $html, $fromEmail, $fromName, &$errors) {
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
                $senderEmail = !empty($fromEmail) ? $fromEmail : $smtpUsername;
                if (str_contains((string)$smtpHost, 'gmail.com') && !empty($smtpUsername)) {
                    $senderEmail = $smtpUsername;
                }

                config([
                    'mail.default' => 'smtp',
                    'mail.mailers.smtp.transport' => 'smtp',
                    'mail.mailers.smtp.host' => $smtpHost,
                    'mail.mailers.smtp.port' => (int)$smtpPort,
                    'mail.mailers.smtp.username' => $smtpUsername,
                    'mail.mailers.smtp.password' => $cleanPassword,
                    'mail.mailers.smtp.encryption' => $smtpEncryption,
                    'mail.mailers.smtp.timeout' => 12,
                    'mail.from.address' => $senderEmail,
                    'mail.from.name' => $fromName,
                ]);

                Mail::purge('smtp');

                Mail::html($html, function ($msg) use ($cleanTo, $subject, $senderEmail, $fromName) {
                    $msg->to($cleanTo)->subject($subject);
                    $msg->from($senderEmail, $fromName);
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
                Log::warning("SMTP dispatch failed to {$cleanTo}: " . $t->getMessage());
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
