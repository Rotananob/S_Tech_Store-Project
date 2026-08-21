<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$tables = ['users', 'categories', 'products', 'orders', 'order_items', 'user_cart_items', 'user_profiles', 'notifications', 'wishlists'];

$sql = "";

foreach ($tables as $table) {
    try {
        $rows = DB::table($table)->get();
        if ($rows->isEmpty()) continue;
        
        foreach ($rows as $row) {
            $rowArray = (array) $row;
            
            $columns = array_map(function($col) {
                return '"' . $col . '"';
            }, array_keys($rowArray));
            
            $values = array_map(function($val) {
                if ($val === null) return 'NULL';
                if (is_bool($val)) return $val ? 'true' : 'false';
                // Escape single quotes for PostgreSQL
                return "'" . str_replace("'", "''", $val) . "'";
            }, array_values($rowArray));
            
            $sql .= "INSERT INTO \"$table\" (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ");\n";
        }
    } catch (\Exception $e) {
        // Table might not exist or be empty
        continue;
    }
}

file_put_contents(__DIR__ . '/neon_import.sql', $sql);
echo "Data successfully exported to neon_import.sql!\n";
