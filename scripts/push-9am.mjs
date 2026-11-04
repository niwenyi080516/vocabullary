#!/usr/bin/env node
// 背单词 · 9 点推送发送器（GitHub Actions 版，和 supabase/functions/push-9am 等价）
// 仓库 secrets 需要：SUPABASE_SERVICE_ROLE_KEY、VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY、VAPID_SUBJECT
import webpush from 'web-push';

const SB_URL = process.env.SB_URL || 'https://rimokrvfcvhxhtsovlcm.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@example.com';

if (!SB_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('缺少 secrets：SUPABASE_SERVICE_ROLE_KEY / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

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

const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
const body = TEXTS[day % TEXTS.length];
const headers = { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json' };

const dueRes = await fetch(`${SB_URL}/rest/v1/rpc/due_push_subs`, { method: 'POST', headers, body: '{}' });
if (!dueRes.ok) { console.error('due_push_subs', dueRes.status, await dueRes.text()); process.exit(1); }
const subs = await dueRes.json();

let sent = 0, gone = 0, failed = 0;
for (const s of subs) {
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify({ title: '背单词 · 9 点打卡 ☀️', body, url: './' }),
      { TTL: 3600 },
    );
    sent++;
    await fetch(`${SB_URL}/rest/v1/rpc/mark_push_sent`, {
      method: 'POST', headers, body: JSON.stringify({ p_endpoint: s.endpoint }),
    });
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      gone++;
      await fetch(`${SB_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers });
    } else { failed++; console.error('send failed', e.statusCode, e.body || e.message); }
  }
}
console.log(JSON.stringify({ due: subs.length, sent, gone, failed }));
