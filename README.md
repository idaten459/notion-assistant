# Notion Restaurant Assistant

Notion の「行きたいお店リスト」で URL を貼るだけで、店名・ステータス・カテゴリ・場所を自動補完する Next.js アプリです。

## 使い方の方針

普段の入口は Notion です。

1. Notion の `行きたいお店リスト` に新しい行を作る
2. `URL` 列に Google Maps / 食べログ / 公式サイトなどの URL を貼る
3. Notion Webhook がこのアプリの `/api/notion/webhook` に通知する
4. アプリが Notion API と Google Places API を使って同じ行を補完する

`http://localhost:3000` のフォームは、補完精度を手元で試すための開発・検証用です。

## Vercel は必要か

Notion Webhook は Notion 内だけで完結する処理ではありません。Notion は「公開 HTTPS URL に POST する」だけなので、このアプリを受け口として公開する必要があります。

推奨は Vercel です。代替として Cloudflare Workers、Render、Fly.io、Pipedream、Make なども使えます。`localhost:3000` は Notion から到達できないため、本番 Webhook には使えません。

## 必要な環境変数

`.env.example` は見本です。秘密情報は `.env.local` と Vercel の Environment Variables にだけ設定します。

```env
NOTION_TOKEN=
NOTION_DATA_SOURCE_ID=
GOOGLE_MAPS_API_KEY=
NOTION_WEBHOOK_VERIFICATION_TOKEN=
CRON_SECRET=

DEFAULT_REGION_CODE=JP
DEFAULT_LANGUAGE=ja
AUTO_WRITE_THRESHOLD=0.8
APP_PASSWORD=
ENABLE_AI_CLASSIFIER=false
```

`NOTION_WEBHOOK_VERIFICATION_TOKEN` は、Webhook subscription 作成時に Notion がこのアプリへ送る一回限りのトークンです。Vercel の Functions Logs に `[notion-webhook] verification_token=...` と出ます。その値を Notion の検証画面へ貼り、同じ値を Vercel の `NOTION_WEBHOOK_VERIFICATION_TOKEN` に設定します。

## 初期セットアップ

1. Notion のコネクト `行きたいお店リスト補完` を作成する
2. 対象ページ右上の `...` → `接続` → `接続を追加` でコネクトを追加する
3. `.env.local` に `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`, `GOOGLE_MAPS_API_KEY`, `CRON_SECRET`, `APP_PASSWORD` を設定する
4. ローカルで運用列を追加する

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/notion/setup?secret=あなたのCRON_SECRET"
```

追加される運用列:

- `補完状態`
- `補完候補`
- `Google Place ID`
- `正規Google Maps URL`
- `最終補完日時`
- `取得元`

## Webhook 設定

詳しい Vercel 手順は [docs/vercel-deploy.md](docs/vercel-deploy.md) を見てください。

1. Vercel にデプロイする
2. Vercel に `.env.local` と同じ環境変数を設定する
3. Notion の `私のインテグレーション` で対象インテグレーションを開く
4. `Webhooks` タブで subscription を作成する
5. Webhook URL に以下を設定する

```text
https://あなたのVercelドメイン/api/notion/webhook
```

購読するイベント:

- `page.created`
- `page.properties_updated`
- `data_source.content_updated`

Notion のイベントは少し遅延することがあります。Webhook が漏れた場合に備えて、Vercel Cron が `/api/cron/sync` で未補完行を拾います。

## 再補完したい場合

Webhook のループを防ぐため、`補完状態` が `補完済` または `補完候補あり` の行は再処理しません。

URLを変えて再補完したい場合は、その行の `補完状態` を空にするか `未補完` に戻してから URL を更新してください。

## 開発

```powershell
npm.cmd install
npm.cmd run dev
```

検証:

```powershell
npm.cmd run predeploy
```

個別に実行する場合:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```
