create table if not exists ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  name text not null,
  "startDate" date not null,
  "endDate" date,
  spend numeric(12,2) not null default 0,
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table ad_campaigns enable row level security;

create policy "org members can manage their ad campaigns"
  on ad_campaigns for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");

create table if not exists external_revenues (
  id uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references auth.users(id) on delete cascade,
  "periodStart" date not null,
  "periodEnd" date not null,
  source text not null,
  amount numeric(12,2) not null default 0,
  notes text,
  "createdAt" timestamptz not null default now()
);

alter table external_revenues enable row level security;

create policy "org members can manage their external revenues"
  on external_revenues for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
