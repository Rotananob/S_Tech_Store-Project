# Antigravity Workspace Execution & Safety Rules

## 1. Scope & Execution Directory
- **Allowed Working Scope:** All project subdirectories inside `D:/WEB Development/`.
- **Language Support:** Full automated execution enabled for:
  - **Node.js / TypeScript / JavaScript:** `node`, `npm`, `npx`, `yarn`, `pnpm`
  - **PHP / Laravel:** `php`, `composer`, `artisan`
  - **Python:** `python`, `py`, `pip`, `venv`, `pytest`
  - **Java / Kotlin:** `java`, `javac`, `mvn`, `gradle`
  - **.NET / C#:** `dotnet`, `csc`, `msbuild`
  - **Go & Rust:** `go`, `cargo`, `rustc`
  - **Database & Version Control:** `git`, `psql`, `sqlite3`

---

## 2. Strict Permanent Restrictions (DENY)
- **CRITICAL PROTECTION:** NEVER execute commands or file mutations that attempt to:
  - Delete, format, or wipe the entire `D:/` drive or `D:/WEB Development/` root.
  - Delete or mutate Windows system directories (`C:/Windows`, `C:/Program Files`, `C:/Program Files (x86)`).
  - Execute destructive disk management commands (`format`, `diskpart`, `bcdedit`, `rmdir /s /q D:\`).

---

## 3. Source Code Deletion Policy (ASK)
- **Mandatory Approval:** ALWAYS ask for user explicit confirmation before deleting or removing ANY source code file:
  - Extensions: `.py`, `.js`, `.jsx`, `.ts`, `.tsx`, `.php`, `.java`, `.cs`, `.html`, `.css`, `.scss`, `.vue`, `.svelte`, `.sql`, `.json`, `.env`
  - Git destructive operations: `git reset --hard`, `git clean -fd`, `git restore`

---

## 4. Automated Build & Cache Cleanup (ALLOW)
- Automated deletion and cleanups are ONLY allowed for temporary build artifacts and bulky external dependency folders located strictly within the active working project directory:
  - Dependencies & Caches: `node_modules`, `package-lock.json`, `vendor`, `composer.lock`, `__pycache__`, `.pytest_cache`, `.venv`, `venv`
  - Build Artifacts: `dist`, `build`, `.next`, `.nuxt`, `target`, `bin`, `obj`, `.turbo`, `.cache`
