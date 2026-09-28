<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
Config::set('database.default', 'remote');
Config::set('database.connections.remote', [
    'driver' => 'pgsql',
    'host' => 'ep-nameless-hall-az3hbmxa.c-3.ap-southeast-1.aws.neon.tech',
    'port' => '5432',
    'database' => 'neondb;options=endpoint=ep-nameless-hall-az3hbmxa',
    'username' => 'neondb_owner',
    'password' => 'npg_XzZxSgif6Ec3',
    'sslmode' => 'require'
]);

echo "Migrating Neon...\n";
Artisan::call('migrate', ['--force' => true]);
echo Artisan::output();
