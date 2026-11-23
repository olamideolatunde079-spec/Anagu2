# Anagu — Supabase Setup Guide

## Project Details

| Field               | Value                                                      |
|---------------------|------------------------------------------------------------|
| Project URL         | `https://wcykxpsbtbsoxxmitslk.supabase.co`                 |
| Publishable Key     | `sb_publishable_MwJtKiIDQB-46QhW1xvkXA_Lh_apL1j`          |
| JWKS URL            | `https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json` |

---

## 1. Apply the Migration

### Option A — Supabase Dashboard (easiest)

1. Open [https://app.supabase.com](https://app.supabase.com) and select your project.
2. Go to **SQL Editor** → **New query**.
3. Paste the entire contents of `migrations/001_initial_schema.sql`.
4. Click **Run**.
5. Confirm all tables appear under **Table Editor**.

### Option B — Supabase CLI

```bash
# Install the CLI if you don't have it
npm install -g supabase

# Link to your project (run from the repo root)
supabase link --project-ref wcykxpsbtbsoxxmitslk

# Push the migration
supabase db push
```

---

## 2. Enable Realtime

Realtime is required for the live pipeline progress bar (web) and application status updates (mobile).

### Step-by-step in the Dashboard

1. Go to **Database → Replication → Source** tab.
2. Under **supabase_realtime**, click **Edit**.
3. Toggle ON the following tables:
   - `applications`
   - `land_titles`
4. Save changes.

### SQL alternative

Run these two statements in the SQL Editor **after** the migration:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE applications;
ALTER PUBLICATION supabase_realtime ADD TABLE land_titles;
```

> These cannot be included in the migration file itself because `ALTER PUBLICATION`
> must be run as a superuser or as the Supabase service role.

---

## 3. Row Level Security (RLS) Policies

RLS is enabled by default on all tables via the migration. The key rules are:

| Table            | Policy                              | Who can read                            |
|------------------|-------------------------------------|-----------------------------------------|
| `applications`   | `applications_select_own`           | The applicant (`applicant_id = uid()`)  |
| `applications`   | `applications_select_staff`         | REGISTRAR, LAND_ADMINISTRATOR, GOVERNOR |
| `land_titles`    | `land_titles_select_own`            | The titleholder (`owner_user_id = uid()`) |
| `land_titles`    | `land_titles_select_staff`          | REGISTRAR, LAND_ADMINISTRATOR, GOVERNOR |
| `audit_events`   | `audit_events_select_staff`         | REGISTRAR, LAND_ADMINISTRATOR, GOVERNOR |
| `parcels`        | `parcels_select_authenticated`      | Any authenticated user                  |

**The NestJS backend uses the service role key** (`SUPABASE_SECRET_KEY`) which bypasses RLS entirely. RLS only applies to direct client requests from the web/mobile apps using the publishable key.

To verify RLS is active, run in SQL Editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

---

## 4. JWT Verification

Supabase issues RS256 JWTs. The NestJS backend verifies them using the JWKS endpoint.

### Verify JWKS endpoint is reachable

```bash
curl https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json
```

Expected response: a JSON object with `keys` array containing an RS256 public key.

### Test token verification in NestJS

```bash
# 1. Get a token via the Supabase REST API
curl -X POST \
  https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: sb_publishable_MwJtKiIDQB-46QhW1xvkXA_Lh_apL1j" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'

# 2. Use the returned access_token to call a protected backend endpoint
curl -X GET http://localhost:3001/api/v1/applications \
  -H "Authorization: Bearer <access_token>"
```

The backend's `SupabaseAuthGuard` calls `supabase.auth.getUser(token)` which validates
against the JWKS endpoint and attaches the user to the request context.

---

## 5. Enable Realtime — Exact SQL

Run this in the SQL Editor immediately after applying the migration:

```sql
-- Enable Realtime on applications (for citizen status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE applications;

-- Enable Realtime on land_titles (for registrar dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE land_titles;
```

Verify it worked:

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Both `applications` and `land_titles` should appear in the output.

---

## 6. Environment Variables

Copy the relevant values into your `.env` file:

### Backend (`/.env`)

```
SUPABASE_URL=https://wcykxpsbtbsoxxmitslk.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SIDE_SUPABASE_SECRET_KEY
SUPABASE_JWKS_URL=https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json
```

### Web (`apps/web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://wcykxpsbtbsoxxmitslk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_MwJtKiIDQB-46QhW1xvkXA_Lh_apL1j
```

### Mobile (`apps/mobile/app.json` → `extra`)

Already configured. The publishable key is embedded in `app.json`.

---

## 7. Realtime Subscription Example (Web)

```typescript
import { supabase } from '@/lib/supabase';

// Subscribe to status changes for a specific application
const channel = supabase
  .channel('my-application-updates')
  .on('postgres_changes', {
    event:  'UPDATE',
    schema: 'public',
    table:  'applications',
    filter: `id=eq.${applicationId}`,
  }, (payload) => {
    console.log('Status changed to:', payload.new.status);
  })
  .subscribe();

// Cleanup
channel.unsubscribe();
```
