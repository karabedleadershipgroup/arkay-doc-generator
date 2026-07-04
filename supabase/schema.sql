-- Arkay Document Generator — Supabase schema
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  doc_number text unique not null,
  doc_seq int not null,
  doc_type text not null check (doc_type in ('Proposal','Invoice')),
  client text,
  property_address text,
  city text,
  job_type text,
  amount numeric,
  doc_date date,
  scope_text text,
  status text default 'sent',          -- sent | accepted | paid | historical
  converted_from text,                 -- proposal doc_number when invoice was converted
  language text default 'en',
  created_at timestamptz default now()
);
create index if not exists jobs_seq_idx on jobs (doc_seq desc);
create index if not exists jobs_type_idx on jobs (job_type);

create table if not exists settings (
  key text primary key,
  value text not null
);
-- Numbering floor: history file ends at 1002647 but Raffie is already at 1002690 (June 23, 2026).
insert into settings (key, value) values ('min_next_seq', '1002691')
  on conflict (key) do nothing;

-- Lock everything down; the app talks to Supabase only through Netlify functions
-- using the service_role key, so no anon policies are needed.
alter table jobs enable row level security;
alter table settings enable row level security;
