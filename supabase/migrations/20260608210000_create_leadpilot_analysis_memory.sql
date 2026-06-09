create table if not exists public.leadpilot_analysis_memory (
  id text primary key,
  saved_at timestamptz not null,
  source_url text not null,
  final_url text not null,
  company_name text not null,
  score integer not null,
  proposal_title text not null,
  proposal_summary text not null,
  recommended_angle text not null,
  next_steps jsonb not null default '[]'::jsonb,
  result_json jsonb not null
);

create index if not exists leadpilot_analysis_memory_saved_at_idx
  on public.leadpilot_analysis_memory (saved_at desc);

create index if not exists leadpilot_analysis_memory_company_idx
  on public.leadpilot_analysis_memory (lower(company_name));

alter table public.leadpilot_analysis_memory enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.leadpilot_analysis_memory from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table public.leadpilot_analysis_memory from authenticated;
  end if;
end $$;

comment on table public.leadpilot_analysis_memory is
  'Private LeadPilot analysis history used by the server-side Memory Agent.';
