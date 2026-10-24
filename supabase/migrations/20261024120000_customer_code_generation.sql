-- Generate immutable, globally unique customer codes in the database.
-- Existing customer codes are preserved; the sequence starts after the largest
-- existing KH-<number> code so this remains safe on populated installations.

lock table public.khach_hang in access exclusive mode;

create schema if not exists app_private;
create sequence if not exists app_private.khach_hang_code_seq as bigint;

do $$
declare
  v_max_code numeric;
begin
  select max(
    case
      when ma_khach_hang ~ '^KH-[0-9]+$'
        then pg_catalog.regexp_replace(ma_khach_hang, '^KH-', '')::numeric
    end
  )
    into v_max_code
  from public.khach_hang;

  if v_max_code is null or v_max_code < 1 then
    perform pg_catalog.setval('app_private.khach_hang_code_seq'::regclass, 1, false);
  elsif v_max_code >= 9223372036854775806::numeric then
    raise exception 'Cannot initialize customer-code sequence: existing KH numeric suffix is too large';
  else
    perform pg_catalog.setval(
      'app_private.khach_hang_code_seq'::regclass,
      v_max_code::bigint,
      true
    );
  end if;
end;
$$;

create or replace function app_private.assign_khach_hang_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_value bigint;
  v_candidate text;
begin
  if tg_op = 'UPDATE' then
    -- The customer code is assigned once and cannot be edited through the UI
    -- or by a direct authenticated Data API update.
    new.ma_khach_hang := old.ma_khach_hang;
    return new;
  end if;

  loop
    v_next_value := pg_catalog.nextval('app_private.khach_hang_code_seq'::regclass);
    v_candidate := 'KH-' || case
      when v_next_value < 1000000
        then pg_catalog.lpad(v_next_value::text, 6, '0')
      else v_next_value::text
    end;

    -- Sequence values are concurrency-safe. This additional check skips any
    -- legacy/manual code that happens to match a future sequence value.
    if not exists (
      select 1
      from public.khach_hang as existing_customer
      where existing_customer.ma_khach_hang = v_candidate
    ) then
      new.ma_khach_hang := v_candidate;
      return new;
    end if;
  end loop;
end;
$$;

revoke all on function app_private.assign_khach_hang_code() from public, anon, authenticated;
revoke all on sequence app_private.khach_hang_code_seq from public, anon, authenticated;

drop trigger if exists trg_khach_hang_code_generation on public.khach_hang;
create trigger trg_khach_hang_code_generation
before insert or update on public.khach_hang
for each row
execute function app_private.assign_khach_hang_code();
