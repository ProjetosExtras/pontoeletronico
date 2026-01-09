-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ⚠️ WARNING: This will delete existing data. Use only for initial setup or reset.
drop table if exists public.time_entries cascade;
drop table if exists public.employees cascade;
drop table if exists public.profiles cascade;
drop table if exists public.companies cascade;

-- Create Companies Table
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  cnpj text not null unique,
  owner_id uuid references auth.users(id) not null, -- Added owner_id for permission handling
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Profiles Table (Linked to Auth Users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  company_id uuid references public.companies(id),
  name text,
  email text,
  role text default 'employee' check (role in ('admin', 'manager', 'employee')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Employees Table (For Clock In specific data)
create table public.employees (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) not null,
  name text not null,
  code text not null, -- Matrícula/ID
  pin text, -- Optional PIN for clock in
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(company_id, code)
);

-- Create Time Entries Table (Registros de Ponto)
create table public.time_entries (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references public.employees(id),
  company_id uuid references public.companies(id) not null,
  type text not null check (type in ('entrada', 'intervalo', 'retorno', 'saida')),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  location_lat double precision,
  location_long double precision,
  device_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.time_entries enable row level security;

-- Helper Function to avoid Infinite Recursion in RLS policies
create or replace function public.get_auth_user_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.profiles where id = auth.uid() limit 1;
$$;

-- Policies

-- Companies:
-- Allow insert if user is authenticated (and becomes owner)
create policy "Enable insert for authenticated users" on public.companies
  for insert with check (auth.role() = 'authenticated');

-- Allow select if user is the owner OR belongs to the company via profile
create policy "Users can view their own company" on public.companies
  for select using (
    auth.uid() = owner_id 
    or 
    id = get_auth_user_company_id()
  );


-- Profiles:
create policy "Users can view profiles in their company" on public.profiles
  for select using (
    auth.uid() = id -- User can see themselves
    or
    company_id = get_auth_user_company_id() -- User can see others in same company
  );

create policy "Enable insert for authenticated users only" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);


-- Employees:
create policy "Users can view employees in their company" on public.employees
  for select using (company_id = get_auth_user_company_id());

create policy "Users can manage employees in their company" on public.employees
  for all using (company_id = get_auth_user_company_id());


-- Time Entries:
create policy "Users can view time entries in their company" on public.time_entries
  for select using (company_id = get_auth_user_company_id());

create policy "Users can insert time entries in their company" on public.time_entries
  for insert with check (company_id = get_auth_user_company_id());
