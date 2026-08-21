#!/usr/bin/env bash

# Exit on error
set -e

echo "Installing composer dependencies..."
composer install --no-dev --optimize-autoloader

echo "Caching config and routes..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Running database migrations..."
php artisan migrate --force
