# ogp-image-creater

HTML を編集するだけで OGP（Open Graph Protocol）画像を生成できるアプリケーションです。ブラウザ上で HTML を編集し、その内容を [satoru-render](https://github.com/SoraKumo001/satoru)（WASM ベースの HTML/CSS → 画像変換エンジン）でレンダリングして画像を返します。

Cloudflare Workers 上で動作し、ヘッドレスブラウザ（Chromium/Puppeteer）を一切必要としません。

## 特徴

- **HTML エディタ** — Monaco エディタによるシンタックスハイライト・行番号付き編集
- **ライブプレビュー** — ブラウザ内で satoru-render を直接実行し、編集内容を即時プレビュー
- **外部リソース解決** — フォント・画像は `/api/proxy` 経由で取得（CORS 回避）
- **テンプレート保存/再利用** — Cloudflare KV に保存し、一覧・読込・削除が可能
- **OGP 画像配信** — 保存したテンプレートを `/ogp/:id` で PNG 配信（クローラ向け）
- **PNG ダウンロード** — プレビュー画像をそのままダウンロード

## 技術スタック

| レイヤ         | 技術                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| バックエンド   | Cloudflare Workers + [Hono](https://hono.dev/)                                         |
| レンダリング   | [satoru-render](https://www.npmjs.com/package/satoru-render)（WASM / Skia + litehtml） |
| フロントエンド | React + Vite + Monaco Editor                                                           |
| ストレージ     | Cloudflare KV（テンプレート保存）                                                      |

## セットアップ

```bash
# 依存のインストール
pnpm install

# フロントエンドのビルド（public/ に出力）
pnpm build

# ローカル開発サーバー起動（http://localhost:8787）
pnpm dev
```

## デプロイ

KV ネームスペースは Wrangler の「自動プロビジョニング」を利用しています。`wrangler.jsonc` の `kv_namespaces` に `id` を指定していないため、`wrangler deploy` 時に KV ネームスペースが自動作成され、その ID が設定ファイルに書き戻されます。

```bash
pnpm deploy
```

> 補足: ダッシュボード（GitHub 連携など）からデプロイした場合もリソースは自動作成されますが、ID はリポジトリに書き戻されずダッシュボード上でのみ確認できます。

## API

| メソッド | パス                 | 説明                           |
| -------- | -------------------- | ------------------------------ |
| `POST`   | `/api/render`        | HTML を画像にレンダリング      |
| `GET`    | `/ogp/:id`           | 保存済みテンプレートを画像配信 |
| `GET`    | `/api/proxy?url=`    | 外部リソース取得（CORS 回避）  |
| `GET`    | `/api/templates`     | テンプレート一覧               |
| `POST`   | `/api/templates`     | テンプレート保存               |
| `GET`    | `/api/templates/:id` | テンプレート取得               |
| `DELETE` | `/api/templates/:id` | テンプレート削除               |

### `POST /api/render`

```json
{
	"html": "<h1>Hello OGP</h1>",
	"width": 1200,
	"height": 630,
	"format": "png"
}
```

- `width` / `height` は省略可（デフォルト 1200 × 630）
- `format` は `png` / `webp` / `svg`（デフォルト `png`）

### `GET /ogp/:id`

保存済みテンプレートを画像として配信します。クエリで上書き可能です。

```
/ogp/:id?w=1200&h=630&format=png
```

## プロジェクト構成

```
.
├── src/                 # Worker バックエンド（Hono）
│   └── index.ts
├── frontend/            # フロントエンド（React + Vite）
│   ├── index.html
│   └── src/
├── public/              # ビルド成果物（assets binding で配信）
├── test/                # テスト（Vitest）
├── wrangler.jsonc       # Wrangler 設定
└── vite.config.mts      # Vite 設定
```

## スクリプト

| コマンド          | 説明                      |
| ----------------- | ------------------------- |
| `pnpm dev`        | ローカル開発サーバー起動  |
| `pnpm build`      | フロントエンドをビルド    |
| `pnpm test`       | テスト実行                |
| `pnpm cf-typegen` | Wrangler の型定義を再生成 |
| `pnpm deploy`     | Cloudflare にデプロイ     |
