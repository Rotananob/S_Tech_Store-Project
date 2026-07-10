# 🖥️ S Tech Store

> Premium Computer & Tech E-Commerce Platform

**Stack:** Next.js 14 · Laravel 11 · PostgreSQL · Firebase Auth · Cloudflare

---

## 📁 Project Structure

```
s-tech-store/
├── frontend/     → Next.js 14 App (UI)
└── backend/      → Laravel 11 REST API
```

## 🚀 Quick Start

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Fill in your Firebase keys in .env.local
npm install
npm run dev
# → http://localhost:3000
```

### Backend
```bash
cd backend
cp .env.example .env
# Fill in your DB and Firebase credentials
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
# → http://localhost:8000
```

## 🔑 Environment Setup
- **Frontend**: Copy `frontend/.env.example` → `frontend/.env.local` and fill in Firebase credentials
- **Backend**: Copy `backend/.env.example` → `backend/.env` and fill in DB + Firebase Service Account

> ⚠️ **NEVER commit `.env`, `.env.local`, or `serviceAccountKey.json`**

## 📚 Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Laravel 11, PHP 8.2+ |
| Database | PostgreSQL 15 |
| Auth | Firebase Authentication |
| Security | Cloudflare WAF + CDN |
