/* 背单词 · Service Worker
   只做两件事：接住服务端推来的 9 点提醒、点通知时回到页面。
   页面自己算出来的「当天补发」仍然由 index.html 负责，这里不重复。 */
const FALLBACK_BODY = '该背单词啦 (๑•̀ㅂ•́)و✧ 今天的词在等你～';
const ICON = './icons/icon-192.png';

self.addEventListener('install', function(){ self.skipWaiting(); });

self.addEventListener('activate', function(e){
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(e){
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){ d = { body: (e.data && e.data.text && e.data.text()) || '' }; }
  const title = d.title || '背单词 · 9 点打卡 ☀️';
  const body = d.body || FALLBACK_BODY;
  e.waitUntil(self.registration.showNotification(title, {
    body: body,
    tag: 'dsword-daily-9',
    renotify: true,
    icon: ICON,
    badge: ICON,
    lang: 'zh-CN',
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    for(const c of list){
      if('focus' in c){
        if(c.navigate){ c.navigate(url).catch(function(){}); }
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});

/* 页面里点「试一下」时借 SW 弹通知：桌面端 new Notification() 能弹，
   但 Android 只有走 SW 才有系统通知，所以统一从这里出。 */
self.addEventListener('message', function(e){
  const d = e.data || {};
  if(d.type === 'notify'){
    self.registration.showNotification(d.title || '背单词 · 9 点打卡 ☀️', d.options || { body: FALLBACK_BODY, icon: ICON, tag: 'dsword-test' });
  }
});
