#!/usr/bin/env bash

# Exit on error
set -e

# Clear bootstrap cache files before install
rm -f bootstrap/cache/*.php

echo "Installing composer dependencies..."
composer install --no-dev --optimize-autoloader

echo "Creating storage symlink..."
php artisan storage:link || true

echo "Caching config, routes and views..."
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Running database migrations..."
php artisan migrate --force || true
