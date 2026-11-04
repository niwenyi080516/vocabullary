// 背单词 · 9 点推送发送器（Supabase Edge Function，Deno）
// 部署：supabase functions deploy push-9am --no-verify-jwt
// 需要的 secrets：
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT（mailto:你的邮箱）
// SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY 由平台自动注入。

import webpush from 'https://esm.sh/web-push@3.6.7';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

// 和 index.html 里 REMIND_TEXTS 保持一致（服务端按天轮换）
const TEXTS = [
  '早上好呀 ☀️ 单词们已经列队完毕，就等队长来点名了 (๑•̀ㅂ•́)و✧',
  '9 点整！今天的词表蹲在门口等你，说再不来它们就要自己背自己了 (￣▽￣)',
  '起床打卡啦 ☕ 你昨天背的词说，一天不见，它已经忘了你长啥样 (・∀・)',
  '叮咚 🔔 你的新词已到货，超时不取会自动变成「我认识」的错觉哦',
  '今日份英语已就位～ 它们刚才在偷偷互相翻译，场面有点混乱 (＾ω＾)',
  '友好提示：拖延一天，明天就得多背一天 (｡•́︿•̀｡) 现在来还来得及！',
  '早上九点，吉时 ⏰ 五分钟背十个词，剩下的时间拿去开心 ✧(≖ ◡ ≖✿)',
  '你的连续打卡正在发烧 🤒 再不来它就要断气了，快来抢救一下！',
  '温馨提示：你的单词已经饥肠辘辘 🍞 它们想吃掉你的注意力 (๑´ㅂ`๑)',
  '今天的你 + 今天的词 = 明天更酷的你 🚀 走，去背两个 (ง •̀_•́)ง',
  '九个字：再不来，词就跑了 (｀・ω・´)',
  '听说认真背单词的人运气都不会太差 🍀 要不要试一试？',
];

function pickText() {
  const d = new Date();
  const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  return TEXTS[day % TEXTS.length];
}

const sbHeaders = {
  apikey: SB_KEY,
  authorization: `Bearer ${SB_KEY}`,
  'content-type': 'application/json',
};

Deno.serve(async () => {
  const dueRes = await fetch(`${SB_URL}/rest/v1/rpc/due_push_subs`, {
    method: 'POST',
    headers: sbHeaders,
    body: '{}',
  });
  if (!dueRes.ok) {
    return new Response(JSON.stringify({ error: `due_push_subs ${dueRes.status}` }), { status: 500 });
  }
  const subs = await dueRes.json() as Array<{ endpoint: string; p256dh: string; auth: string; tz: string }>;
  const body = pickText();

  let sent = 0, gone = 0, failed = 0;
  for (const s of subs) {
    const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title: '背单词 · 9 点打卡 ☀️', body, url: './' }), { TTL: 3600 });
      sent++;
      await fetch(`${SB_URL}/rest/v1/rpc/mark_push_sent`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({ p_endpoint: s.endpoint }),
      });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        gone++;
        await fetch(`${SB_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
          method: 'DELETE',
          headers: sbHeaders,
        });
      } else {
        failed++;
      }
    }
  }

  return new Response(JSON.stringify({ due: subs.length, sent, gone, failed }), {
    headers: { 'content-type': 'application/json' },
  });
});
