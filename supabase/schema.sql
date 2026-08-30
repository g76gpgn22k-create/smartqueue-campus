-- SmartQueue Campus database
create extension if not exists pgcrypto;

create type public.app_role as enum ('client','staff','admin');
create type public.queue_status as enum ('waiting','called','serving','served','no_show','cancelled');
create type public.office_status as enum ('open','closed','break','high_volume');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'New User',
  role public.app_role not null default 'client',
  created_at timestamptz not null default now()
);

create table public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  status public.office_status not null default 'open',
  active_counters int not null default 1,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  name text not null,
  avg_minutes numeric(8,2) not null default 10,
  created_at timestamptz not null default now()
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  label text not null,
  description text,
  requires_upload boolean not null default false,
  sort_order int not null default 0
);

create table public.queue_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  user_id uuid not null references auth.users(id),
  office_id uuid not null references public.offices(id),
  transaction_id uuid not null references public.transactions(id),
  position int not null,
  status public.queue_status not null default 'waiting',
  priority_type text,
  priority_verified boolean not null default false,
  checklist_acknowledged boolean not null default false,
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  served_at timestamptz,
  cancelled_at timestamptz
);

create table public.queue_transfers (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.queue_tickets(id) on delete cascade,
  from_user_id uuid not null references auth.users(id),
  to_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.queue_tickets(id) on delete cascade,
  office_id uuid not null references public.offices(id),
  transaction_id uuid not null references public.transactions(id),
  staff_id uuid references auth.users(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table public.queue_messages (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null,
  message text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now(),
  removed boolean not null default false
);

create index queue_tickets_office_status_idx on public.queue_tickets(office_id,status,joined_at);
create index queue_tickets_user_idx on public.queue_tickets(user_id);
create index queue_messages_office_day_idx on public.queue_messages(office_id,created_at);

-- Seed offices
insert into public.offices(name,icon,status,active_counters) values
('Registrar','📚','open',3),
('Clinic','🩺','open',2),
('Cashier','💳','high_volume',4),
('ICT','💻','open',2)
on conflict (name) do nothing;

insert into public.transactions(office_id,name,avg_minutes)
select id,'Request Transcript',8 from public.offices where name='Registrar'
union all select id,'Enrollment Verification',6 from public.offices where name='Registrar'
union all select id,'Medical Consultation',10 from public.offices where name='Clinic'
union all select id,'Health Certificate',7 from public.offices where name='Clinic'
union all select id,'Payment / Assessment',5 from public.offices where name='Cashier'
union all select id,'IT Support',9 from public.offices where name='ICT'
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.offices enable row level security;
alter table public.transactions enable row level security;
alter table public.requirements enable row level security;
alter table public.queue_tickets enable row level security;
alter table public.queue_transfers enable row level security;
alter table public.feedback enable row level security;
alter table public.queue_messages enable row level security;

create policy "public offices read" on public.offices for select using (true);
create policy "public transactions read" on public.transactions for select using (true);
create policy "users read own profile" on public.profiles for select using (auth.uid()=id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid()=id);
create policy "users update own profile" on public.profiles for update using (auth.uid()=id);

create policy "users read own tickets" on public.queue_tickets for select using (auth.uid()=user_id);
create policy "users create own tickets" on public.queue_tickets for insert with check (auth.uid()=user_id);
create policy "users update own tickets" on public.queue_tickets for update using (auth.uid()=user_id);

create policy "read requirements" on public.requirements for select using (true);
create policy "read own transfers" on public.queue_transfers for select using (auth.uid()=from_user_id or auth.uid()=to_user_id);
create policy "create transfers" on public.queue_transfers for insert with check (auth.uid()=from_user_id);

create policy "create feedback" on public.feedback for insert with check (exists(select 1 from public.queue_tickets q where q.id=ticket_id and q.user_id=auth.uid()));
create policy "read messages" on public.queue_messages for select using (true);
create policy "create messages" on public.queue_messages for insert with check (auth.uid()=user_id);

-- Realtime
alter publication supabase_realtime add table public.queue_tickets;
alter publication supabase_realtime add table public.queue_messages;
