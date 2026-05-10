# Vercel デプロイ手順

このアプリは Notion Webhook の受け口になるため、Notion から到達できる公開 HTTPS URL が必要です。Vercel では Next.js API Routes、Cron、環境変数、HTTPS をまとめて扱えます。

## 1. 事前確認

ローカルで以下が通ることを確認します。

```powershell
npm.cmd run predeploy
```

`check:env` は `.env.local` または現在の環境変数を読み、デプロイに最低限必要な値があるかだけを確認します。値そのものは表示しません。

## 2. Commit と Push

Vercel を GitHub 連携で使う場合、Vercel はリモートリポジトリの内容をデプロイします。ローカル変更を commit して push してください。

まず、秘密情報が含まれていないことを確認します。

```powershell
git status --short
git diff -- . ":!package-lock.json"
```

`.env.local` は `.gitignore` と `.vercelignore` に入っているため、commit しません。

初回 commit の例:

```powershell
git add .env.example .gitignore .vercelignore README.md app docs next-env.d.ts next.config.mjs package-lock.json package.json scripts src tsconfig.json vercel.json vitest.config.ts
git commit -m "feat: add notion restaurant assistant"
```

GitHub のリモートが未設定なら、GitHub で空のリポジトリを作ってから追加します。

```powershell
git remote add origin https://github.com/あなたのユーザー名/notion-restaurant-assistant.git
git branch -M main
git push -u origin main
```

既に `origin` がある場合:

```powershell
git push
```

## 3. Vercel Project 作成

1. Vercel にログイン
2. `Add New...` → `Project`
3. このリポジトリを選択
4. Framework Preset は `Next.js`
5. Build Command は既定の `next build`
6. Install Command は既定の `npm install`

## 4. Environment Variables

Vercel の Project Settings → Environment Variables に以下を設定します。対象はまず `Production` と `Preview` の両方で構いません。

必須:

```env
NOTION_TOKEN=
NOTION_DATA_SOURCE_ID=
GOOGLE_MAPS_API_KEY=
CRON_SECRET=
APP_PASSWORD=
```

推奨:

```env
DEFAULT_REGION_CODE=JP
DEFAULT_LANGUAGE=ja
AUTO_WRITE_THRESHOLD=0.8
ENABLE_AI_CLASSIFIER=false
```

初回 Webhook 検証前は空でよい値:

```env
NOTION_WEBHOOK_VERIFICATION_TOKEN=
```

`CRON_SECRET` は Vercel Cron から `/api/cron/sync` へ送られる `Authorization: Bearer ...` の検証にも使います。ローカルで使った値と同じで構いません。

## Cron の制限

Vercel Hobby では Cron は 1 日 1 回までです。`*/30 * * * *` のような高頻度実行はデプロイ時に拒否されます。

このリポジトリでは Webhook を主処理にし、Cron は取りこぼし救済として 1 日 1 回だけ動かします。

```json
{
  "path": "/api/cron/sync",
  "schedule": "0 18 * * *"
}
```

Vercel Cron のタイムゾーンは UTC です。`0 18 * * *` は日本時間では毎日 03:00 ごろです。Hobby では指定時刻ぴったりではなく、その時間帯のどこかで実行されることがあります。

より頻繁に未補完行を拾いたい場合は、Vercel Pro に上げるか、GitHub Actions / 外部 cron / VPS などから `/api/cron/sync?secret=...` を叩く構成にします。

## 5. Deploy

Vercel の画面から `Deploy` します。成功後、発行された URL で以下を開きます。

```text
https://あなたのVercelドメイン/api/notion/webhook
```

JSON が返れば Webhook endpoint は公開されています。

## 6. 運用列の追加

Production URL で一度だけ setup API を実行します。

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "https://あなたのVercelドメイン/api/notion/setup?secret=あなたのCRON_SECRET"
```

レスポンスの `missingRequired` が空なら、既存列名は実装の想定と一致しています。

## 7. Notion Webhook

Notion の `私のインテグレーション` で `行きたいお店リスト補完` を開き、Webhook subscription を作成します。

Webhook URL:

```text
https://あなたのVercelドメイン/api/notion/webhook
```

購読イベント:

```text
page.created
page.properties_updated
data_source.content_updated
```

Notion が検証リクエストを送ると、Vercel の Functions Logs に次の形式で出ます。

```text
[notion-webhook] verification_token=...
```

この値を Notion の検証画面に貼り、同じ値を Vercel の `NOTION_WEBHOOK_VERIFICATION_TOKEN` に設定します。設定後、Production を再デプロイしてください。

## 8. 動作確認

Notion の `行きたいお店リスト` で新規行を作り、`URL` 列だけ入力します。Webhook が成功すると、少し待ってから以下が補完されます。

- `店名`
- `ステータス`
- `カテゴリ`
- `場所`
- `補完状態`
- `補完候補`

再補完したい場合は、対象行の `補完状態` を空にするか `未補完` に戻してから URL を更新します。
