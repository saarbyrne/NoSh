# NoSh Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install web dependencies
cd web
npm install

# Install Supabase CLI locally (no global install needed)
npm install supabase --save-dev
```

### 2. Set up Supabase Cloud Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Login with your GitHub account
3. Click "New Project"
4. Fill in:
   - **Name**: `NoSh`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait for project to be ready (2-3 minutes)

### 3. Get Your Project Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### 4. Create Environment File

Create `web/.env.local` with the following content:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace:
- `your-project-id` with your actual project ID from the URL
- `your-anon-key-here` with your actual anon key

### 5. Run Database Migrations

```bash
# Link to your cloud project (replace with your actual project ID)
npx supabase link --project-ref your-project-id

# Apply all migrations to your cloud database
npx supabase db push
```

### 6. Start Development Server

```bash
cd web
npm run dev
```

## Alternative: Manual Database Setup

If you prefer to set up the database tables manually:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration files from `supabase/migrations/` one by one:
   - `20250101000001_create_profiles_table.sql`
   - `20250101000010_add_photo_analysis_consent.sql`
   - (and any other migration files you need)

## Troubleshooting

### Settings Page Error: "Error saving consent"

This error occurs when:
1. Supabase local environment is not running
2. Environment variables are not set
3. Database migrations haven't been applied

**Solutions:**
1. **Quick Fix:** No action needed - the app automatically uses mock client
2. **Full Setup:** Run `supabase start` to start the local environment
3. **Environment:** Create `web/.env.local` with the correct Supabase URL and anon key
4. **Migrations:** Run `supabase db reset` to apply migrations

### Docker Issues

If you get Docker-related errors:
1. Make sure Docker Desktop is running
2. Install Docker Desktop from https://docs.docker.com/desktop
3. Restart your terminal after installing Docker

## Production Setup

For production deployment:
1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from the project settings
3. Update your environment variables with production values
4. Deploy your migrations to the production database
