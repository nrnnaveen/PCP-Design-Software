# FloZ ECA — Supabase Database & Auth Setup Guide

FloZ ECA uses **Supabase** for real-time authentication, user profile management, and cloud storage of schematic and multi-layer PCB design files.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and log in or create an account.
2. Click **New Project**.
3. Choose an organization, project name (e.g. `floz-eca`), strong database password, and region closest to your users.
4. Wait 1-2 minutes for Supabase to provision your database.

---

## 2. Apply the Database Schema

1. In your Supabase project dashboard, click on the **SQL Editor** icon in the left sidebar.
2. Click **New Query**.
3. Open [`supabase/schema.sql`](./schema.sql), copy its entire contents, and paste them into the SQL Editor.
4. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`).
5. Verify that:
   - Tables `profiles` and `projects` are created in the **Table Editor**.
   - Row Level Security (RLS) is enabled on both tables.
   - The trigger `on_auth_user_created` is registered.

---

## 3. Configure Environment Variables

1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) &rarr; **API**.
2. Copy:
   - **Project URL**
   - **Project API Keys** &rarr; `anon` `public`
3. In your FloZ ECA root directory, open or create `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Restart the development server (`npm run dev`).

---

## 4. Authentication Configuration

In Supabase Dashboard &rarr; **Authentication** &rarr; **Providers**:
- **Email**: Enabled by default.
  - To test instantly without confirming emails, you can optionally disable **Confirm email** under *Authentication &rarr; Email Templates / Providers &rarr; Email*.

---

## 5. Security Architecture (RLS)

All user projects and profiles are protected by PostgreSQL Row Level Security:
- A user can **only view, create, edit, and delete their own PCB projects**.
- No other authenticated user or public visitor can access another engineer's circuit files.
- Offline and guest modes continue to function with local storage fallback when Supabase is unconfigured or unreachable.
