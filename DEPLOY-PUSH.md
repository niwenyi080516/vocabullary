# 后台 9 点提醒：部署清单

目标：**页面关掉也能收到** 9 点提醒。做法是 Web Push（VAPID）+ Service Worker，
订阅存到项目已有的 Supabase（`rimokrvfcvhxhtsovlcm.supabase.co`），由定时任务在
每位用户本地时间 9:00 发送。

页面内的 `setInterval` 兜底仍然保留：即使推送没配好，只要页面开着就会提醒。

---

## 已经写好的文件

| 文件 | 作用 |
|---|---|
| `sw.js` | Service Worker：接收推送、点通知回页面 |
| `manifest.webmanifest` | PWA 清单（可安装、图标、主题色） |
| `icons/icon-192.png` / `icon-512.png` | 应用图标 |
| `supabase/migrations/20261105000000_push_subs.sql` | 订阅表 + RLS + 到点查询 + 每 5 分钟触发 |
| `supabase/functions/push-9am/index.ts` | Edge Function：取到期订阅并发送 |
| `scripts/push-9am.mjs` + `.github/workflows/push-9am.yml` | 备选：用 GitHub Actions 发（不依赖 Edge Function） |
| `index.html` | 注册 SW、申请权限、订阅、把订阅写进 Supabase |

VAPID 密钥（已经生成，公钥已写进 `index.html`）：

```
public : BP0q-hX04IqPnUyEMtgNnQIWni7tH44bJg7r4s-NCuPufUtzaD9pACjSfd5n8VnEsxXUW6ezMCuvf-fkYI1V2Ts
private: （见下方「需要你做的事」第 2 步，只放服务端，不要进仓库）
```

> 注意：私钥不要提交到 GitHub。仓库是公开的（GitHub Pages），私钥泄露等于任何人都能给你的用户推消息。

---

## 需要你做的事（只差这一步）

我没有这个 Supabase 项目的管理凭据（只有页面里的 publishable key，它能读 `progress` 表，
但没有建表 / 部署函数的权限），所以最后三下点击得你来。全程约 10 分钟，不需要装 CLI。

### 1. 建表 + 定时任务

Supabase Dashboard → SQL Editor → 新建查询 → 粘贴
`supabase/migrations/20261105000000_push_subs.sql` 全文 → Run。

它做四件事：建 `push_subs` 表（匿名只能 insert/delete 自己的行，读不到别人的）、
建 `due_push_subs()`（按本地时区判断谁该收）、建 `mark_push_sent()`、注册每 5 分钟一次的
`pg_cron` 任务去调 Edge Function。

### 2. 造一对 VAPID 密钥（如果不用我生成的这对）

```bash
npx web-push generate-vapid-keys
```

或者直接用我已经生成好的那对（公钥已经写进 index.html，别改；只把私钥填到第 3 步）。

### 3. 部署 Edge Function

Dashboard → Edge Functions → Create a new function，名字必须叫 **`push-9am`**，
把 `supabase/functions/push-9am/index.ts` 的内容整段粘进去，然后：

- Settings 里关掉 **Verify JWT**（函数只做发送，不需要用户身份；cron 用 publishable key 调不动带 JWT 校验的函数）
- Secrets 里加三个：
  - `VAPID_PUBLIC_KEY` = 上面那串 public
  - `VAPID_PRIVATE_KEY` = 私钥
  - `VAPID_SUBJECT` = `mailto:你的邮箱`

部署完可以先手动调一次验证：

```bash
curl -i -X POST https://rimokrvfcvhxhtsovlcm.supabase.co/functions/v1/push-9am
# 期望 {"due":0,"sent":0,"gone":0,"failed":0}
```

### 4. 把新文件推上去

`sw.js`、`manifest.webmanifest`、`icons/` 必须和 `index.html` 一起放在站点根目录
（GitHub Pages 的仓库根）。少一个 `sw.js`，订阅会失败，功能自动退回页面内提醒。

---

## 怎么验证真的进后台了

1. 打开线上页 → 「好呀，喊我」→ 允许通知
2. 设置页「每日提醒」应显示 `已开启 · 每天 9:00 · 关掉页面也会推送`
3. 在 Supabase 表编辑器里能看到一行 `push_subs`
4. **把浏览器完全关掉**，等到 9:00（或临时把 SQL 里 cron 的 `*/5` 改成 `* * * * *`、
   把 `push_subs.hour` 改成当前小时来测）→ 应该收到系统通知

排查：
- 收不到 → 看 Edge Function 日志（Dashboard → Edge Functions → Logs）
- `due:0` → 时区/小时没对上，查 `select endpoint, tz, hour, last_sent from push_subs;`
- `gone` 增长 → 浏览器订阅失效，属正常，会自动删除

---

## 备选：用 GitHub Actions 发（不用 Edge Function）

1. 把 `scripts/push-9am.mjs` 和 `.github/workflows/push-9am.yml` 一起推到仓库
2. 仓库 Settings → Secrets and variables → Actions，加四个 secret：
   `SUPABASE_SERVICE_ROLE_KEY`、`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_SUBJECT`
3. 第 1 步的 SQL 里**不要执行最后那段 `cron.schedule`**（否则会和 Actions 重复发）

GitHub 的 cron 是尽力而为，延迟几分钟是常态；要准点用 Edge Function 那套。

---

## 已知边界

- iOS 需要先把站点「添加到主屏幕」，Safari 才给 Notification 权限。
- 桌面 Chrome / Edge 关掉浏览器进程后收不到（推送服务会把消息排队，下次启动才送达，
  这是浏览器的设计）；「关浏览器也能响」只能靠系统级应用，网页做不到。
- 用户在系统设置里关掉通知后，推送会静默失败，`failed` 会增长。
