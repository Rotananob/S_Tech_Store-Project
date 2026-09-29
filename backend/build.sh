#!/usr/bin/env bash

# Exit on error
set -e

echo "Installing composer dependencies..."
composer install --no-dev --optimize-autoloader

echo "Creating storage symlink..."
php artisan storage:link || true

echo "Caching routes and views..."
php artisan route:cache
php artisan view:cache

echo "Running database migrations..."
php artisan migrate --force || true
