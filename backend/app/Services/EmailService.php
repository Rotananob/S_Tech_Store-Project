<?php

namespace App\Services;

use App\Models\UserProfile;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
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
                    TelegramService::sendOrderNotification([
                        'type' => 'welcome',
                        'chat_id' => $user->telegram_chat_id,
                        'message' => "🎉 *សូមស្វាគមន៍មកកាន់ S Tech Store!*\n\nសួស្តី @{$cleanUsername}! គណនីរបស់អ្នកបានភ្ជាប់រួចរាល់។ កាដូស្វាគមន៍ $5 (Voucher: `WELCOME5`) អាចប្រើប្រាស់បានភ្លាមៗលើវេបសាយ https://www.s-tech-store.tech",
                    ]);
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
                    TelegramService::sendOrderNotification([
                        'type' => 'security',
                        'chat_id' => $user->telegram_chat_id,
                        'message' => "🔒 *ការជូនដំណឹងសុវត្ថិភាព!*\n\nសំណើសុំផ្លាស់ប្តូរពាក្យសម្ងាត់សម្រាប់គណនី @{$cleanUsername} ត្រូវបានផ្ញើទៅកាន់ {$email}។ ប្រសិនបើលោកអ្នកមិនបានស្នើសុំទេ សូមទាក់ទងមកកាន់ក្រុមការងារបន្ទាន់។",
                    ]);
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
     * Helper to safely dispatch mail without crashing if SMTP is unconfigured in development
     */
    private static function tryDispatchMail(string $to, string $subject, string $html): bool
    {
        try {
            Mail::html($html, function ($message) use ($to, $subject) {
                $message->to($to)
                        ->subject($subject)
                        ->from(config('mail.from.address', 'no-reply@s-tech-store.tech'), self::STORE_NAME);
            });
            Log::info("Email dispatched successfully to {$to} with subject: '{$subject}'");
            return true;
        } catch (\Exception $e) {
            Log::info("Mail transport notice (saved to logs & in-app alerts): " . $e->getMessage());
            return false;
        }
    }
}
