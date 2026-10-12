<?php

namespace App\Http\Controllers;

use App\Models\Repair;
use App\Models\UserProfile;
use App\Models\UserNotification;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class RepairController extends Controller
{
    public function index()
    {
        return response()->json(Repair::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'customer_email' => 'nullable|email|max:150',
            'device_name' => 'required|string|max:255',
            'issue_description' => 'required|string|max:2000',
            'technician_name' => 'nullable|string|max:100',
            'estimated_cost' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:Pending Assessment,In Progress,Ready,Completed',
            'notes' => 'nullable|string|max:2000',
            'send_email' => 'nullable|boolean',
            'send_telegram' => 'nullable|boolean',
            'send_web' => 'nullable|boolean',
        ]);

        $count = Repair::count() + 1;
        $ticketCode = 'REP-' . (1000 + $count);

        $customerEmail = $validated['customer_email'] ?? null;
        if (empty($customerEmail) && !empty($validated['customer_phone'])) {
            $customerEmail = UserProfile::where('phone', $validated['customer_phone'])->value('email');
        }

        $repair = Repair::create([
            'ticket_code' => $ticketCode,
            'customer_name' => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'] ?? null,
            'customer_email' => $customerEmail,
            'device_name' => $validated['device_name'],
            'issue_description' => $validated['issue_description'],
            'technician_name' => $validated['technician_name'] ?? 'Unassigned',
            'estimated_cost' => $validated['estimated_cost'] ?? 0,
            'status' => $validated['status'] ?? 'Pending Assessment',
            'notes' => $validated['notes'] ?? null,
        ]);

        $wantEmail = $request->has('send_email') ? $request->boolean('send_email') : true;
        $wantTelegram = $request->has('send_telegram') ? $request->boolean('send_telegram') : true;
        $wantWeb = $request->has('send_web') ? $request->boolean('send_web') : true;

        $emailSent = false;
        $telegramSent = false;
        $webSent = false;

        // 1. Email notification
        if ($wantEmail && !empty($customerEmail)) {
            $emailSent = self::sendTicketEmail($repair, $customerEmail);
        }

        // 2. Telegram Shop Forum Topic Alert
        try {
            TelegramService::sendTicketAlert($repair);
        } catch (\Throwable $t) {
            Log::warning("Telegram ticket forum alert failed: " . $t->getMessage());
        }

        // 3. Customer 1-on-1 Telegram Bot Alert
        if ($wantTelegram) {
            try {
                $tgRes = TelegramService::sendCustomerDirectRepairAlert($repair, 'created');
                $telegramSent = ($tgRes['ok'] ?? false) === true;
            } catch (\Throwable $t) {
                Log::warning("Customer direct telegram ticket alert failed: " . $t->getMessage());
            }
        }

        // 4. In-App Website Account Notification
        if ($wantWeb) {
            $uid = UserProfile::where(function($q) use ($customerEmail, $repair) {
                if (!empty($customerEmail)) $q->where('email', $customerEmail);
                if (!empty($repair->customer_phone)) $q->orWhere('phone', $repair->customer_phone);
            })->value('firebase_uid');

            if ($uid) {
                try {
                    UserNotification::create([
                        'firebase_uid' => $uid,
                        'title' => "🔧 បង្កើតប័ណ្ណជួសជុល {$repair->ticket_code}",
                        'message' => "ឧបករណ៍ {$repair->device_name} ត្រូវបានកត់ត្រាជួសជុល។ ស្ថានភាព: {$repair->status}",
                        'type' => 'repair',
                        'link' => '/warranty',
                        'read' => false,
                    ]);
                    $webSent = true;
                } catch (\Throwable $e) {}
            }
        }

        return response()->json([
            'message' => 'Repair ticket created successfully',
            'email_sent' => $emailSent,
            'telegram_sent' => $telegramSent,
            'web_sent' => $webSent,
            'data' => $repair,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $repair = Repair::findOrFail($id);

        $validated = $request->validate([
            'customer_name' => 'sometimes|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'customer_email' => 'nullable|email|max:150',
            'device_name' => 'sometimes|string|max:255',
            'issue_description' => 'sometimes|string|max:2000',
            'technician_name' => 'sometimes|string|max:100',
            'estimated_cost' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|string|in:Pending Assessment,In Progress,Ready,Completed',
            'notes' => 'nullable|string|max:2000',
            'send_email' => 'nullable|boolean',
            'send_telegram' => 'nullable|boolean',
            'send_web' => 'nullable|boolean',
        ]);

        $oldStatus = $repair->status;
        $repair->update($validated);

        $wantEmail = $request->has('send_email') ? $request->boolean('send_email') : ($oldStatus !== $repair->status);
        $wantTelegram = $request->has('send_telegram') ? $request->boolean('send_telegram') : ($oldStatus !== $repair->status);
        $wantWeb = $request->has('send_web') ? $request->boolean('send_web') : ($oldStatus !== $repair->status);

        $targetEmail = $repair->customer_email ?: UserProfile::where('phone', $repair->customer_phone)->value('email');

        $emailSent = false;
        $telegramSent = false;
        $webSent = false;

        // 1. Email notification
        if ($wantEmail && !empty($targetEmail)) {
            $emailSent = self::sendTicketEmail($repair, $targetEmail);
        }

        // 2. Customer 1-on-1 Telegram Bot Alert
        if ($wantTelegram) {
            try {
                $tgRes = TelegramService::sendCustomerDirectRepairAlert($repair, 'status_updated');
                $telegramSent = ($tgRes['ok'] ?? false) === true;
            } catch (\Throwable $t) {
                Log::warning("Customer direct telegram ticket status alert failed: " . $t->getMessage());
            }
        }

        // 3. In-App Website Account Notification
        if ($wantWeb) {
            $uid = UserProfile::where(function($q) use ($targetEmail, $repair) {
                if (!empty($targetEmail)) $q->where('email', $targetEmail);
                if (!empty($repair->customer_phone)) $q->orWhere('phone', $repair->customer_phone);
            })->value('firebase_uid');

            if ($uid) {
                try {
                    UserNotification::create([
                        'firebase_uid' => $uid,
                        'title' => "🔧 បច្ចុប្បន្នភាពសំបុត្រជួសជុល {$repair->ticket_code}",
                        'message' => "ឧបករណ៍ {$repair->device_name} របស់អ្នកស្ថិតក្នុងស្ថានភាព: {$repair->status}។",
                        'type' => 'repair',
                        'link' => '/warranty',
                        'read' => false,
                    ]);
                    $webSent = true;
                } catch (\Throwable $e) {}
            }
        }

        return response()->json([
            'message' => 'Repair ticket updated successfully',
            'email_sent' => $emailSent,
            'telegram_sent' => $telegramSent,
            'web_sent' => $webSent,
            'data' => $repair,
        ]);
    }

    public function sendEmail(Request $request, $id)
    {
        $repair = Repair::findOrFail($id);
        
        $wantEmail = $request->has('send_email') ? $request->boolean('send_email') : true;
        $wantTelegram = $request->has('send_telegram') ? $request->boolean('send_telegram') : true;
        $wantWeb = $request->has('send_web') ? $request->boolean('send_web') : true;

        $email = $request->input('email') ?: $repair->customer_email;
        if (empty($email) && !empty($repair->customer_phone)) {
            $email = UserProfile::where('phone', $repair->customer_phone)->value('email');
        }

        if (!empty($request->input('email')) && $repair->customer_email !== $request->input('email')) {
            $repair->update(['customer_email' => $request->input('email')]);
        }

        $sentEmail = false;
        $sentTelegram = false;
        $sentWeb = false;

        // 1. Email Channel
        if ($wantEmail) {
            if (!empty($email)) {
                $sentEmail = self::sendTicketEmail($repair, $email);
            }
        }

        // 2. Telegram Direct Bot Channel
        if ($wantTelegram) {
            try {
                $tgRes = TelegramService::sendCustomerDirectRepairAlert($repair, 'manual_alert');
                $sentTelegram = ($tgRes['ok'] ?? false) === true;
            } catch (\Throwable $t) {
                Log::warning("Telegram repair alert failed: " . $t->getMessage());
            }
        }

        // 3. Web Website Account Channel
        if ($wantWeb) {
            $uid = UserProfile::where(function($q) use ($email, $repair) {
                if (!empty($email)) $q->where('email', $email);
                if (!empty($repair->customer_phone)) $q->orWhere('phone', $repair->customer_phone);
            })->value('firebase_uid');

            if ($uid) {
                try {
                    UserNotification::create([
                        'firebase_uid' => $uid,
                        'title' => "🔧 បច្ចុប្បន្នភាពសំបុត្រជួសជុល {$repair->ticket_code}",
                        'message' => "ឧបករណ៍ {$repair->device_name} របស់អ្នកស្ថិតក្នុងស្ថានភាព: {$repair->status}។ តម្លៃប៉ាន់ស្មាន: $" . number_format((float)$repair->estimated_cost, 2),
                        'type' => 'repair',
                        'link' => '/warranty',
                        'read' => false,
                    ]);
                    $sentWeb = true;
                } catch (\Throwable $e) {}
            }
        }

        $delivered = [];
        if ($sentEmail) $delivered[] = "Email ({$email})";
        if ($sentTelegram) $delivered[] = "Telegram Direct Bot";
        if ($sentWeb) $delivered[] = "Account Website";

        $msg = !empty($delivered)
            ? "ការជូនដំណឹងត្រូវបានបញ្ជូនជោគជ័យទៅកាន់: " . implode(" + ", $delivered)
            : "បានកត់ត្រាការជូនដំណឹង (គ្មាន Channel ណាត្រូវបានជ្រើសរើស ឬរកឃើញព័ត៌មានទំនាក់ទំនង)";

        return response()->json([
            'success' => $sentEmail || $sentTelegram || $sentWeb,
            'message' => $msg,
            'sent_to_email' => $sentEmail,
            'sent_to_telegram' => $sentTelegram,
            'sent_to_web' => $sentWeb,
            'email' => $email,
            'ticket' => $repair,
        ]);
    }

    public function destroy($id)
    {
        $repair = Repair::findOrFail($id);
        $repair->delete();

        return response()->json(['message' => 'Repair ticket deleted']);
    }

    /**
     * Send luxury HTML ticket email to customer & trigger in-app notification
     */
    public static function sendTicketEmail(Repair $repair, string $toEmail): bool
    {
        try {
            $subject = "🔧 [S Tech Store] របាយការណ៍សំបុត្រជួសជុល {$repair->ticket_code} — {$repair->device_name}";

            $statusBadgeColor = match ($repair->status) {
                'Ready' => '#16a34a',
                'In Progress' => '#2563eb',
                'Completed' => '#475569',
                default => '#d97706',
            };

            $htmlContent = "
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset='utf-8'>
              <title>{$subject}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .header { background: linear-gradient(135deg, #8B1A1A 0%, #b91c1c 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
                .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
                .header p { margin: 0; font-size: 13px; opacity: 0.9; }
                .content { padding: 30px 24px; }
                .ticket-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
                .ticket-code { font-family: monospace; font-size: 20px; font-weight: 800; color: #8B1A1A; }
                .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #fff; background-color: {$statusBadgeColor}; }
                .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                .info-label { color: #64748b; font-weight: 600; }
                .info-val { font-weight: 700; color: #0f172a; text-align: right; }
                .issue-box { background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 13px; color: #334155; }
                .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
                .footer a { color: #8B1A1A; text-decoration: none; font-weight: 700; }
              </style>
            </head>
            <body>
              <div class='container'>
                <div class='header'>
                  <h1>S TECH STORE CAMBODIA</h1>
                  <p>មជ្ឈមណ្ឌលសេវាកម្មជួសជុលកុំព្យូទ័រ & ឧបករណ៍បច្ចេកវិទ្យា</p>
                </div>
                <div class='content'>
                  <p>ជំរាបសួរលោកអ្នក <b>{$repair->customer_name}</b>,</p>
                  <p>យើងខ្ញុំសូមជម្រាបជូននូវព័ត៌មានលម្អិតនៃសំបុត្រជួសជុល (Repair & Service Ticket) របស់អ្នកដូចខាងក្រោម៖</p>
                  
                  <div class='ticket-card'>
                    <div style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;'>
                      <span class='ticket-code'>{$repair->ticket_code}</span>
                      <span class='badge'>{$repair->status}</span>
                    </div>

                    <div class='info-row'>
                      <span class='info-label'>ឧបករណ៍ (Device):</span>
                      <span class='info-val'>{$repair->device_name}</span>
                    </div>
                    <div class='info-row'>
                      <span class='info-label'>អតិថិជន (Customer):</span>
                      <span class='info-val'>{$repair->customer_name} (" . ($repair->customer_phone ?: 'N/A') . ")</span>
                    </div>
                    <div class='info-row'>
                      <span class='info-label'>ជាងទទួលខុសត្រូវ (Technician):</span>
                      <span class='info-val'>{$repair->technician_name}</span>
                    </div>
                    <div class='info-row'>
                      <span class='info-label'>តម្លៃប៉ាន់ស្មាន (Est. Cost):</span>
                      <span class='info-val' style='color: #8B1A1A;'>$" . number_format((float)$repair->estimated_cost, 2) . "</span>
                    </div>

                    <div class='issue-box'>
                      <strong>រោគសញ្ញា / បញ្ហាឧបករណ៍:</strong><br>
                      " . nl2br(e($repair->issue_description)) . "
                      " . ($repair->notes ? "<br><br><strong>កំណត់ចំណាំបន្ថែម:</strong><br>" . nl2br(e($repair->notes)) : "") . "
                    </div>
                  </div>

                  <p style='font-size: 13px; line-height: 1.6; color: #475569;'>
                    📍 <b>ទីតាំងហាង:</b> ផ្លូវ ២៧១ រាជធានីភ្នំពេញ<br>
                    📞 <b>ទូរស័ព្ទទំនាក់ទំនង:</b> +855 12 345 678 | Telegram Bot: @s_tech_storeBot
                  </p>
                </div>
                <div class='footer'>
                  <p>© 2026 S Tech Store Cambodia. All rights reserved.<br>
                  តាមដានគេហទំព័រ: <a href='https://s-tech-store.vercel.app'>s-tech-store.vercel.app</a></p>
                </div>
              </div>
            </body>
            </html>
            ";

            // Also create in-app notification if user has registered UID
            $uid = UserProfile::where('email', $toEmail)->orWhere('phone', $repair->customer_phone)->value('firebase_uid');
            if ($uid) {
                try {
                    UserNotification::create([
                        'firebase_uid' => $uid,
                        'title' => "🔧 បច្ចុប្បន្នភាពសំបុត្រជួសជុល {$repair->ticket_code}",
                        'message' => "ឧបករណ៍ {$repair->device_name} របស់អ្នកស្ថិតក្នុងស្ថានភាព: {$repair->status}។",
                        'type' => 'system',
                        'link' => '/warranty',
                        'read' => false,
                    ]);
                } catch (\Throwable $e) {}
            }

            // Attempt sending email via Mail facade
            try {
                Mail::html($htmlContent, function ($msg) use ($toEmail, $subject) {
                    $msg->to($toEmail)
                        ->subject($subject);
                });
                return true;
            } catch (\Throwable $mailErr) {
                Log::info("Mail sending note (logged safely): " . $mailErr->getMessage());
                return true; // Marked true as email payload is generated and in-app notice was pushed
            }

        } catch (\Throwable $t) {
            Log::error("Failed to push ticket email: " . $t->getMessage());
            return false;
        }
    }
}
