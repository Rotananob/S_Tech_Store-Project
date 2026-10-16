<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AdminTokenService
{
    const PREFIX = 'sat_';
    const DEFAULT_VALIDITY_DAYS = 90;

    /**
     * Create an unbreakable, cryptographically signed Admin/Staff session token.
     * Format: sat_{base64url_payload}.{hmac_signature}
     *
     * This token is completely immune to Render server restarts, cold starts,
     * container sleep, and multi-device token displacement.
     */
    public static function createToken(User $user, int $validityDays = self::DEFAULT_VALIDITY_DAYS): string
    {
        $appKey = self::getAppSecret();
        $now = time();

        // System Owner session is perpetual and unbreakable (10 years)
        $isOwner = (strtolower(trim((string)$user->email)) === 'nobrothana180703@gmail.com');
        if ($isOwner) {
            $validityDays = 3650;
        }

        $expiresAt = $now + (86400 * $validityDays);

        // Security fingerprint based on password hash and user id (revokes automatically if password changes)
        $fingerprint = substr(hash('sha256', (string)$user->password . (string)$user->id), 0, 16);

        $payload = [
            'uid'   => (int)$user->id,
            'email' => strtolower(trim((string)$user->email)),
            'role'  => (string)$user->role,
            'iat'   => $now,
            'exp'   => $expiresAt,
            'fp'    => $fingerprint,
            'rnd'   => bin2hex(random_bytes(8)),
        ];

        $encodedPayload = self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES));
        $signature = hash_hmac('sha256', $encodedPayload, $appKey);

        $signedToken = self::PREFIX . $encodedPayload . '.' . $signature;

        // 1. Maintain backward compatibility with users.api_token column
        try {
            $user->api_token = $signedToken;
            $user->last_login_at = now();
            $user->save();
        } catch (\Throwable $e) {
            // In case column length limit exists, store fallback hash in api_token
            try {
                $user->api_token = substr($signedToken, 0, 120);
                $user->save();
            } catch (\Throwable $t) {}
        }

        // 2. Persist in PostgreSQL persistent cache table for multi-session tracking
        self::persistTokenInDatabase($signedToken, (int)$user->id, $expiresAt);

        return $signedToken;
    }

    /**
     * Validate an Admin/Staff token from Bearer, X-Admin-Token, or cookie.
     * Returns the authenticated active User model, or null if invalid.
     */
    public static function validateToken(?string $token): ?User
    {
        if (empty($token)) {
            return null;
        }

        $token = trim($token);

        // ── 1. Cryptographically Signed Token Verification (sat_...) ──
        if (str_starts_with($token, self::PREFIX)) {
            $stripped = substr($token, strlen(self::PREFIX));
            $parts = explode('.', $stripped);

            if (count($parts) === 2) {
                [$encodedPayload, $givenSignature] = $parts;
                $appKey = self::getAppSecret();
                $expectedSignature = hash_hmac('sha256', $encodedPayload, $appKey);

                if (hash_equals($expectedSignature, $givenSignature)) {
                    $jsonStr = self::base64UrlDecode($encodedPayload);
                    $payload = json_decode($jsonStr, true);

                    if (is_array($payload) && !empty($payload['uid'])) {
                        $isOwner = (!empty($payload['email']) && strtolower(trim((string)$payload['email'])) === 'nobrothana180703@gmail.com');

                        // Check expiration: System Owner token NEVER expires under any circumstances
                        $exp = (int)($payload['exp'] ?? 0);
                        if ($isOwner || $exp > time()) {
                            $user = User::where('id', $payload['uid'])
                                ->first();

                            // Fallback lookup by email if id changed
                            if (!$user && !empty($payload['email'])) {
                                $user = User::where('email', strtolower($payload['email']))
                                    ->first();
                            }

                            if ($user) {
                                // Verify password fingerprint
                                $currentFp = substr(hash('sha256', (string)$user->password . (string)$user->id), 0, 16);
                                $tokenFp = (string)($payload['fp'] ?? '');

                                // Owner bypasses fingerprint mismatch in case password hash format refreshed
                                if ($isOwner || empty($tokenFp) || hash_equals($currentFp, $tokenFp)) {
                                    // Guarantee System Owner is super_admin and active
                                    if ($user->email === 'nobrothana180703@gmail.com') {
                                        if ($user->role !== 'super_admin' || $user->status !== 'active') {
                                            $user->role = 'super_admin';
                                            $user->status = 'active';
                                            $user->save();
                                        }
                                    }

                                    // Refresh DB session timestamp
                                    self::persistTokenInDatabase($token, (int)$user->id, time() + (86400 * 3650));

                                    return $user;
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── 2. Direct Database Lookup (Standard/Legacy Tokens) ──
        $user = User::where('api_token', $token)
            ->where('status', 'active')
            ->first();

        if ($user) {
            if ($user->email === 'nobrothana180703@gmail.com' && $user->role !== 'super_admin') {
                $user->role = 'super_admin';
                $user->save();
            }
            return $user;
        }

        // ── 3. PostgreSQL Database Cache Table Lookup (Multi-Device Sessions) ──
        $userId = self::lookupTokenInDatabase($token);
        if ($userId) {
            $user = User::where('id', $userId)
                ->where('status', 'active')
                ->first();

            if ($user) {
                if ($user->email === 'nobrothana180703@gmail.com' && $user->role !== 'super_admin') {
                    $user->role = 'super_admin';
                    $user->save();
                }
                return $user;
            }
        }

        // ── 4. Standard Laravel Cache Fallback ──
        $cachedId = Cache::get("admin_token_{$token}");
        if ($cachedId) {
            $user = User::where('id', $cachedId)
                ->where('status', 'active')
                ->first();

            if ($user) {
                return $user;
            }
        }

        return null;
    }

    /**
     * Check if a token is nearing expiration (e.g. less than 15 days remaining)
     * or is a legacy token that should be transparently upgraded to sat_.
     */
    public static function shouldRefreshToken(string $token): bool
    {
        if (!str_starts_with($token, self::PREFIX)) {
            return true; // Upgrade legacy token
        }

        $stripped = substr($token, strlen(self::PREFIX));
        $parts = explode('.', $stripped);
        if (count($parts) === 2) {
            $jsonStr = self::base64UrlDecode($parts[0]);
            $payload = json_decode($jsonStr, true);
            if (is_array($payload) && !empty($payload['exp'])) {
                // If fewer than 15 days left, refresh
                return ($payload['exp'] - time()) < (86400 * 15);
            }
        }

        return false;
    }

    /**
     * Store token in PostgreSQL database table `cache`
     */
    protected static function persistTokenInDatabase(string $token, int $userId, int $expirationTimestamp): void
    {
        $cacheKey = 'admin_session_' . hash('sha256', $token);

        // 1. Write to database table cache if available
        try {
            DB::table('cache')->updateOrInsert(
                ['key' => $cacheKey],
                [
                    'value' => serialize($userId),
                    'expiration' => $expirationTimestamp,
                ]
            );
        } catch (\Throwable $e) {}

        // 2. Write to default Laravel Cache
        try {
            $ttlSeconds = max(3600, $expirationTimestamp - time());
            Cache::put("admin_token_{$token}", $userId, $ttlSeconds);
        } catch (\Throwable $e) {}
    }

    /**
     * Retrieve user ID from database cache table
     */
    protected static function lookupTokenInDatabase(string $token): ?int
    {
        $cacheKey = 'admin_session_' . hash('sha256', $token);

        try {
            $row = DB::table('cache')
                ->where('key', $cacheKey)
                ->where('expiration', '>', time())
                ->first();

            if ($row && !empty($row->value)) {
                $val = @unserialize($row->value);
                if (is_numeric($val) && (int)$val > 0) {
                    return (int)$val;
                }
            }
        } catch (\Throwable $e) {}

        return null;
    }

    /**
     * Retrieve application encryption key
     */
    protected static function getAppSecret(): string
    {
        $key = (string)config('app.key');
        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7));
            if (!empty($decoded)) {
                return $decoded;
            }
        }
        return $key ?: 'stech_store_master_secret_key_2026';
    }

    protected static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    protected static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        return (string)base64_decode(strtr($data, '-_', '+/'));
    }
}
