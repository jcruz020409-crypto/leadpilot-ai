# Supabase Setup

LeadPilot uses Supabase as a hosted Postgres database through `DATABASE_URL`.
It does not need the Supabase browser SDK for the current Memory Agent and
Analysis History features.

## Create the Project

1. In the Supabase new project screen, keep the GitHub repository connected to
   `jcruz020409-crypto/leadpilot-ai`.
2. Use project name `leadpilot-ai`.
3. Generate and save a strong database password. You will need it again for the
   connection string.
4. Choose the closest `America` region.
5. Keep Data API enabled if you want Supabase dashboard APIs available, but
   disable automatic exposure of new tables. The migration also enables RLS and
   revokes `anon`/`authenticated` access for the private memory table.
6. Create the project and wait until it finishes provisioning.

## Apply the Schema

The schema lives in:

```text
supabase/migrations/20260608210000_create_leadpilot_analysis_memory.sql
```

If you use the Supabase CLI:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref your-project-ref
npx supabase@latest db push
```

You can also paste the migration SQL into the Supabase SQL Editor and run it
once.

## Configure Environment Variables

In the Supabase dashboard, open the project and click `Connect`. Copy the
`Session Pooler` connection string and replace `[YOUR-PASSWORD]` with the
database password you saved.

Use these values locally and in Vercel:

```env
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
```

Optional project API values are available under `Project Settings > API`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Keep it only in
server-side environment variables if a future feature needs it.

## Verify

Run the app and open `/api/provider-status`. A connected Supabase database shows:

```json
{
  "memoryStorage": "postgres",
  "cloudMemoryReady": true
}
```

After an analysis completes, `/history` should show saved records from Supabase.
