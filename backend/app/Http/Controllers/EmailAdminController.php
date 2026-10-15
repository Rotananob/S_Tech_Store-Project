<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\EmailService;

class EmailAdminController extends Controller
{
    /**
     * Get email engine configuration, status & diagnostic report
     */
    public function getSettings(Request $request)
    {
        $settings = EmailService::getSettings();

        return response()->json([
            'success' => true,
            'settings' => $settings,
            'recommendation' => [
                'title' => 'ដំណោះស្រាយបញ្ជូន Email ទៅកាន់ Gmail លើ Render Cloud',
                'description' => 'ដោយសារ Render Free Tier បានទប់ស្កាត់ Port SMTP (25, 465, 587) ការផ្ញើតាម Resend HTTPS API (Port 443) គឺជាដំណោះស្រាយលឿន ងាយស្រួល និងធានាដេីរ ១០០% ទៅដល់ Gmail Inbox ដោយឥតគិតថ្លៃ (Free 3,000 emails/ខែ)។',
                'resend_url' => 'https://resend.com',
            ],
        ]);
    }

    /**
     * Update email credentials & delivery preferences in system_settings
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'nullable|string|in:auto,resend,brevo,smtp,gmail',
            'gmail_address' => 'nullable|email|max:150',
            'gmail_app_password' => 'nullable|string|max:255',
            'resend_api_key' => 'nullable|string|max:255',
            'brevo_api_key' => 'nullable|string|max:255',
            'smtp_host' => 'nullable|string|max:150',
            'smtp_port' => 'nullable|integer|min:1|max:65535',
            'smtp_username' => 'nullable|string|max:150',
            'smtp_password' => 'nullable|string|max:255',
            'smtp_encryption' => 'nullable|string|in:tls,ssl',
            'from_email' => 'nullable|string|max:150',
            'from_name' => 'nullable|string|max:150',
        ]);

        $updated = EmailService::saveSettings($validated);

        return response()->json([
            'success' => true,
            'message' => 'ការកំណត់ Email ត្រូវបានរក្សាទុកជោគជ័យ! (Email settings saved)',
            'settings' => $updated,
        ]);
    }

    /**
     * Send live test email to any recipient (e.g. rothvloger@gmail.com)
     */
    public function testSend(Request $request)
    {
        $request->validate([
            'recipient' => 'required|email',
        ]);

        $recipient = trim($request->input('recipient'));
        $subject = "🧪 [S Tech Store] Live Test Email — " . now()->setTimezone('Asia/Phnom_Penh')->format('d-M-Y h:i:s A');

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset='utf-8'>
          <title>{$subject}</title>
        </head>
        <body style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;'>
          <div style='max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);'>
            <div style='background: linear-gradient(135deg, #8B1A1A, #b91c1c); padding: 28px 24px; color: #ffffff; text-align: center;'>
              <h1 style='margin: 0; font-size: 22px; font-weight: 800;'>S TECH STORE CAMBODIA</h1>
              <p style='margin: 6px 0 0; font-size: 13px; opacity: 0.9;'>Email Delivery Verification Probe</p>
            </div>
            <div style='padding: 28px 24px;'>
              <div style='background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; color: #065f46; font-size: 14px; margin-bottom: 20px;'>
                <strong>✓ សារសាកល្បងបានទៅដល់ប្រអប់សំបុត្រ Gmail ជោគជ័យ!</strong><br>
                ប្រព័ន្ធ Email Dispatcher នៃ S Tech Store ដំណើរការ ១០០% ពេញលេញ។
              </div>
              <p style='font-size: 14px; line-height: 1.6; color: #334155;'>
                ជម្រាបសួរលោកអ្នក <b>{$recipient}</b>,<br>
                នេះជាសារសាកល្បងពីផ្ទាំងគ្រប់គ្រង Admin Console នៃគេហទំព័រ <b>S Tech Store</b>។ ប្រសិនបើលោកអ្នកមើលឃើញសារនេះ មានន័យថាការតភ្ជាប់រវាងប្រព័ន្ធ Server និងសេវា Email ដំណើរការល្អឥតខ្ចោះ។
              </p>
              <div style='background: #f1f5f9; border-radius: 10px; padding: 14px; font-size: 12px; color: #475569; font-family: monospace; margin: 20px 0;'>
                • Recipient: {$recipient}<br>
                • Server Timestamp: " . now()->toIso8601String() . "<br>
                • Status: Dispatched & Verified
              </div>
            </div>
            <div style='background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;'>
              © 2026 S Tech Store Cambodia • Official Verification Test
            </div>
          </div>
        </body>
        </html>";

        $startTime = microtime(true);
        $res = EmailService::dispatchHtmlEmail($recipient, $subject, $html);
        $latencyMs = round((microtime(true) - $startTime) * 1000);

        if ($res['success']) {
            return response()->json([
                'success' => true,
                'message' => "សារសាកល្បងត្រូវបានបញ្ជូនជោគជ័យទៅកាន់ {$recipient} តាមរយៈ " . strtoupper($res['provider'] ?? 'EMAIL') . " ({$latencyMs}ms)!",
                'provider' => $res['provider'] ?? 'unknown',
                'latency_ms' => $latencyMs,
                'recipient' => $recipient,
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => $res['error'] ?? 'បរាជ័យក្នុងការបញ្ជូន Email សាកល្បង',
                'diagnostic_errors' => $res['diagnostic_errors'] ?? null,
                'technical_error' => $res['technical_error'] ?? null,
            ], 422);
        }
    }
}
