-- 背单词 · 后台 9 点推送：订阅表 + 到点查询 + 每 5 分钟触发
-- 在 Supabase Dashboard → SQL Editor 整段执行即可（项目 rimokrvfcvhxhtsovlcm）
-- 依赖：pg_cron、pg_net（Supabase 自带，需启用）

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1) 订阅表：一行 = 一个浏览器的推送地址
create table if not exists public.push_subs (
  endpoint    text primary key,
  p256dh      text not null,
  auth        text not null,
  tz          text not null default 'Asia/Shanghai',
  hour        smallint not null default 9 check (hour between 0 and 23),
  ua          text,
  created_at  timestamptz not null default now(),
  last_sent   date
);

alter table public.push_subs enable row level security;

-- 匿名「只能新增自己的订阅」，读不到任何别人的行（发送走 service_role，绕过 RLS）
drop policy if exists push_subs_insert on public.push_subs;
create policy push_subs_insert on public.push_subs
  for insert to anon, authenticated with check (true);

drop policy if exists push_subs_delete on public.push_subs;
create policy push_subs_delete on public.push_subs
  for delete to anon, authenticated using (true);

grant insert, delete on public.push_subs to anon, authenticated;

-- 2) 谁该收到：本地时区正好是设定小时，且今天还没发过
create or replace function public.due_push_subs()
returns setof public.push_subs
language sql
security definer
set search_path = public
as $$
  select *
    from public.push_subs
   where extract(hour from (now() at time zone tz))::int = hour
     and (last_sent is null or last_sent < (now() at time zone tz)::date);
$$;

revoke all on function public.due_push_subs() from anon, authenticated;

-- 3) 发完标记（按订阅者本地日期）
create or replace function public.mark_push_sent(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subs
     set last_sent = (now() at time zone tz)::date
   where endpoint = p_endpoint;
$$;

revoke all on function public.mark_push_sent() from anon, authenticated;

-- 4) 每 5 分钟喊一次 Edge Function（函数要 --no-verify-jwt 部署，鉴权靠这句也够）
select cron.unschedule('push-9am') where exists (select 1 from cron.job where jobname = 'push-9am');

select cron.schedule(
  'push-9am',
  '*/5 * * * *',
  $$
    select net.http_post(
      url     := 'https://rimokrvfcvhxhtsovlcm.supabase.co/functions/v1/push-9am',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $$
);
