<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

// Configure remote connection
Config::set('database.connections.remote', [
    'driver' => 'pgsql',
    'host' => 'ep-nameless-hall-az3hbmxa.c-3.ap-southeast-1.aws.neon.tech',
    'port' => '5432',
    'database' => 'neondb',
    'username' => 'neondb_owner',
    'password' => 'npg_XzZxSgif6Ec3',
    'sslmode' => 'require',
    'options' => 'endpoint=ep-nameless-hall-az3hbmxa'
]);

$tables = [
    'users',
    'categories',
    'products',
    'orders',
    'order_items',
    'user_profiles',
    'notifications',
    'wishlists',
    'user_cart_items'
];

try {
    echo "Starting database sync...\n";
    
    // Reverse for deletion to avoid foreign key constraint errors
    $reverseTables = array_reverse($tables);
    foreach ($reverseTables as $table) {
        echo "Clearing remote table: $table\n";
        DB::connection('remote')->table($table)->delete();
    }

    // Insert data
    foreach ($tables as $table) {
        echo "Copying data for table: $table...\n";
        
        $localData = DB::connection('pgsql')->table($table)->get()->map(function($item) {
            return (array) $item;
        })->toArray();
        
        if (!empty($localData)) {
            // Chunk inserts to avoid memory/query size limits
            $chunks = array_chunk($localData, 100);
            foreach ($chunks as $chunk) {
                DB::connection('remote')->table($table)->insert($chunk);
            }
            echo "Copied " . count($localData) . " rows to $table.\n";
        } else {
            echo "No data in $table.\n";
        }
    }
    
    echo "Sync complete successfully!\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
