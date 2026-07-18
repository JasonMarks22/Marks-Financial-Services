-- 0001_saved_scenarios.sql — unified saved scenarios with per-user RLS.
--
-- Run this in the Supabase SQL editor. It creates one table for every tool's
-- saved inputs, enables Row Level Security scoped to each user, migrates the
-- old per-tool calculator tables into it, then drops those old tables.
-- user_portfolios is intentionally left in place.

-- 1. Table -------------------------------------------------------------------
create table if not exists public.saved_scenarios (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,
  tool       text        not null check (tool in (
                           'savings_goal','mortgage','budget','allocator',
                           'debt_payoff','retirement','monte_carlo',
                           'compare','backtest'
                         )),
  name       text        not null check (char_length(name) between 1 and 200),
  data       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_scenarios_user_idx      on public.saved_scenarios (user_id);
create index if not exists saved_scenarios_user_tool_idx on public.saved_scenarios (user_id, tool);

-- 2. Keep updated_at fresh on every update -----------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_scenarios_set_updated_at on public.saved_scenarios;
create trigger saved_scenarios_set_updated_at
  before update on public.saved_scenarios
  for each row execute function public.set_updated_at();

-- 3. Row Level Security ------------------------------------------------------
alter table public.saved_scenarios enable row level security;

drop policy if exists "select own scenarios" on public.saved_scenarios;
create policy "select own scenarios" on public.saved_scenarios
  for select using (auth.uid() = user_id);

drop policy if exists "insert own scenarios" on public.saved_scenarios;
create policy "insert own scenarios" on public.saved_scenarios
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own scenarios" on public.saved_scenarios;
create policy "update own scenarios" on public.saved_scenarios
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own scenarios" on public.saved_scenarios;
create policy "delete own scenarios" on public.saved_scenarios
  for delete using (auth.uid() = user_id);

-- 4. Migrate existing calculator data ----------------------------------------
-- Each block runs only if the old table still exists, so this is safe to run
-- once whether or not a given table has data.

do $$ begin
  if to_regclass('public.savings_goal_scenarios') is not null then
    insert into public.saved_scenarios (user_id, tool, name, data, created_at, updated_at)
    select user_id, 'savings_goal', name,
      jsonb_build_object(
        'goal_amount', goal_amount,
        'current_savings', current_savings,
        'years', years,
        'annual_rate_percent', annual_rate_percent
      ), created_at, created_at
    from public.savings_goal_scenarios;
  end if;
end $$;

do $$ begin
  if to_regclass('public.mortgage_scenarios') is not null then
    insert into public.saved_scenarios (user_id, tool, name, data, created_at, updated_at)
    select user_id, 'mortgage', name,
      jsonb_build_object(
        'home_price', home_price,
        'down_payment', down_payment,
        'term_years', term_years,
        'interest_rate', interest_rate,
        'annual_property_tax', annual_property_tax,
        'annual_insurance', annual_insurance,
        'monthly_hoa', monthly_hoa,
        'extra_monthly', extra_monthly
      ), created_at, created_at
    from public.mortgage_scenarios;
  end if;
end $$;

do $$ begin
  if to_regclass('public.allocator_scenarios') is not null then
    insert into public.saved_scenarios (user_id, tool, name, data, created_at, updated_at)
    select user_id, 'allocator', name,
      jsonb_build_object(
        'monthly_leftover', monthly_leftover,
        'current_emergency_fund', current_emergency_fund,
        'monthly_essential_expenses', monthly_essential_expenses,
        'current_checking_buffer', current_checking_buffer,
        'has_high_interest_debt', has_high_interest_debt
      ), created_at, created_at
    from public.allocator_scenarios;
  end if;
end $$;

do $$ begin
  if to_regclass('public.budget_scenarios') is not null then
    insert into public.saved_scenarios (user_id, tool, name, data, created_at, updated_at)
    select user_id, 'budget', name,
      jsonb_build_object(
        'monthly_income', monthly_income,
        'categories', categories
      ), created_at, created_at
    from public.budget_scenarios;
  end if;
end $$;

-- 5. Remove the old per-tool tables (data now lives in saved_scenarios) ------
drop table if exists public.savings_goal_scenarios;
drop table if exists public.mortgage_scenarios;
drop table if exists public.allocator_scenarios;
drop table if exists public.budget_scenarios;
-- NOTE: user_portfolios is intentionally left in place.
