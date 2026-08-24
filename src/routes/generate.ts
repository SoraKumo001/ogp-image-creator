import { Hono } from 'hono';
import { isNonEmptyString } from '../validate';
import { requireAuth } from '../middleware';
import type { AppEnv } from '../types';

interface ModelOption {
	id: string; // model ID sent to ai.run (e.g. "@cf/google/gemma-4-26b-a4b-it")
	label: string; // display label (e.g. "Gemma 4 26B")
	hint: string; // short description (e.g. "Gemma 4 26B・高品質・マルチモーダル")
	isDefault: boolean;
}

const MODELS: ModelOption[] = [
	{
		id: '@cf/google/gemma-4-26b-a4b-it',
		label: 'Gemma 4 26B',
		hint: 'Gemma 4 26B・高品質・マルチモーダル',
		isDefault: true,
	},
	{
		id: '@cf/qwen/qwen3.8-27b',
		label: 'Qwen 3.8 27B',
		hint: 'Qwen 3.8 27B・マルチモーダル対応',
		isDefault: false,
	},
];

const DEFAULT_MODEL = MODELS.find((m) => m.isDefault)?.id ?? MODELS[0].id;
const ALLOWED_MODELS = MODELS.map((m) => m.id);
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

export const generateRoutes = new Hono<AppEnv>();

// GET /api/models — 利用可能な AI モデル一覧を返す
generateRoutes.get('/api/models', requireAuth, (c) => {
	return c.json({
		models: MODELS.map((m) => ({
			id: m.id,
			label: m.label,
			hint: m.hint,
			isDefault: m.isDefault,
		})),
	});
});

// POST /api/generate — Workers AI で OGP 用 HTML をストリーミング生成する
generateRoutes.post('/api/generate', requireAuth, async (c) => {
	try {
		const body = await c.req.json<{
			prompt?: string;
			model?: string;
			width?: number;
			height?: number;
			useTailwind?: boolean;
		}>();

		if (!isNonEmptyString(body.prompt)) {
			return c.json({ error: 'prompt is required' }, 400);
		}

		const model = body.model ?? DEFAULT_MODEL;
		if (!ALLOWED_MODELS.includes(model)) {
			return c.json({ error: 'unsupported model' }, 400);
		}

		const width = typeof body.width === 'number' && Number.isInteger(body.width) && body.width > 0 ? body.width : DEFAULT_WIDTH;
		const height = typeof body.height === 'number' && Number.isInteger(body.height) && body.height > 0 ? body.height : DEFAULT_HEIGHT;

		const useTailwind = body.useTailwind !== false; // default true

		const systemPrompt = `あなたはOGP（Open Graph Protocol）画像用のHTML/CSSを生成する専門家です。以下の厳格な制約に従って、単一の完全なHTMLドキュメントを出力してください。

## 制約
- キャンバスサイズは ${width}×${height}px。body は \`width:${width}px; height:${height}px; margin:0; overflow:hidden\` とすること。
- \`<!DOCTYPE html>\` で始まり \`</html>\` で終わる完全なHTMLドキュメントを出力する。
${
	useTailwind
		? `- レイアウトとスタイリングは **必ず** Tailwind CSS のユーティリティクラス（flex, grid, p-*, text-*, bg-*, rounded-*, shadow-*, gap-*, mt-*, mb-*, w-*, h-* など）で行うこと。Tailwindクラスを優先し、ユーティリティクラスで表現できない場合のみ <style> ブロックにカスタムCSSを追加すること。外部スタイルシートは禁止。body 要素には \`style="width:${width}px;height:${height}px;margin:0"\` を直接指定すること。`
		: '- すべてのCSSは <head> 内の単一の <style> ブロックにインライン記述すること。Tailwind CSS のユーティリティクラス（flex, grid, p-*, text-*, bg-* など）は使用せず、純粋なCSSプロパティで記述すること。外部スタイルシートは禁止。'
}
- 外部 <script>、<link rel="stylesheet"> は禁止。@import は Google Fonts (https://fonts.googleapis.com/) のみ許可。
- JavaScriptは一切使用しない。
- 可変テキストは以下のマクロプレースホルダー形式で記述すること（値は埋ずにプレースホルダーのまま残す）:
  - {{title}} — メインタイトル
  - {{category}} — カテゴリ・キッカー
  - {{description}} — 説明文
  - {{site}} — サイト名・ブランド名
  - {{cta}} — コールトゥアクション
- マークダウンのコードフェンス（\`\`\`）は一切使用しない。
- HTML以外の説明文・コメント・前後の散文は一切出力しない。HTMLドキュメントのみを出力する。
- satoru-render（litehtml + Skia ベースのレンダリングエンジン）でレンダリングされるため、一般的なCSSプロパティ（flexbox, grid, gradient, border-radius, box-shadow, transform, filter など）を使用すること。CSS変数（カスタムプロパティ）は避けること。

## デザインの多様性
- 単調で安全なレイアウトを避け、視覚的に印象的で記憶に残るデザインを作成すること。
- 以下のデザインアプローチから、プロンプトの意図に最も合うものを選び、組み合わせて独自性を出すこと:
  - グラデーション背景（リニア・ラジアル・メッシュ）と光彩エフェクト
  - グラスモーフィズム（backdrop-blur、半透明カード、ボーダーグロー）
  - 大胆なタイポグラフィ（極太フォント、巨大見出し、コントラスト強調）
  - ジオメトリック・抽象装飾（円形・角丸ブロブ、グリッド線、ノイズテクスチャ）
  - ダーク・ネオン系（黒背景に蛍光アクセント、モノスペースフォント）
  - ミニマル・余白重視（白背景、細字と極太の対比、少色数）
- 配色は2〜4色のパレットで構成し、補色や類似色でアクセントを効かせること。
- 背景に単色ではなく、必ずグラデーション・パターン・光彩のいずれかを適用すること。
- 見出しは64px以上、余白は広め（padding 60px以上）で高級感を出すこと。
- プロンプトに特定のデザイン指定がない場合は、上記アプローチから最も映えるものを自主的に選択すること。毎回同じようなデザインにならないよう、バリエーションを意識すること。

## 出力例の構造
${useTailwind ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap");
    body { font-family: "Inter", sans-serif; }
  </style>
</head>
<body style="width:${width}px;height:${height}px;margin:0">
  <!-- Tailwind ユーティリティクラスでレイアウト。可変部分は {{title}} {{category}} {{description}} {{site}} {{cta}} を使用 -->
  <div class="flex h-full w-full flex-col justify-between p-20">
    <div class="text-2xl font-bold">{{site}}</div>
    <div class="text-[80px] font-black">{{title}}</div>
  </div>
</body>
</html>
` : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap");
    /* すべてのスタイルをここに */
  </style>
</head>
<body style="width:${width}px;height:${height}px;margin:0">
  <!-- レイアウト。可変部分は {{title}} {{category}} {{description}} {{site}} {{cta}} を使用 -->
</body>
</html>
`}

${useTailwind ? `
## 多様なデザイン例
以下は Tailwind CSS ユーティリティクラスを使用したデザイン例である。このスタイルで記述すること:

### 例1: グラスモーフィズム・ダーク（Tailwind）
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap");
    body { font-family: "Noto Sans JP", sans-serif; }
  </style>
</head>
<body style="width:${width}px;height:${height}px;margin:0">
  <div class="relative flex h-full w-full overflow-hidden bg-[#0f172a]">
    <div class="absolute -left-25 -top-25 flex size-150 rounded-full bg-indigo-600/20 blur-[100px]"></div>
    <div class="absolute right-25 -bottom-37.5 flex size-175 rounded-full bg-purple-600/15 blur-[120px]"></div>
    <div class="z-10 flex size-full flex-row items-center justify-between p-15">
      <div class="flex w-[62%] flex-col rounded-[48px] border border-white/10 bg-white/5 p-12 shadow-2xl backdrop-blur-2xl">
        <div class="mb-8 flex items-center">
          <div class="mr-5 h-1.5 w-16 rounded-full bg-linear-to-r from-indigo-500 to-purple-500"></div>
          <div class="flex text-xl font-bold uppercase tracking-[0.25em] text-indigo-300">{{category}}</div>
        </div>
        <div class="mb-8 flex text-[76px] font-black leading-[1.1] text-white">{{title}}</div>
        <div class="flex text-[30px] font-medium leading-relaxed text-slate-300 opacity-90">{{description}}</div>
        <div class="mt-12 flex items-center gap-4">
          <div class="flex rounded-2xl border border-indigo-500/30 bg-indigo-500/20 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-indigo-100">{{site}}</div>
          <div class="flex rounded-2xl border border-purple-500/30 bg-purple-500/20 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-purple-100">{{cta}}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>

### 例2: ミニマル・ハイコントラスト（Tailwind）
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap");
    body { font-family: "Inter", sans-serif; }
  </style>
</head>
<body style="width:${width}px;height:${height}px;margin:0">
  <div class="flex h-full w-full flex-col justify-between bg-white p-20 text-black">
    <div class="flex items-center gap-3">
      <div class="h-3 w-3 rounded-full bg-black"></div>
      <div class="text-2xl font-bold tracking-tight">{{site}}</div>
    </div>
    <div class="flex flex-col gap-6">
      <div class="text-[84px] font-black leading-[1.05] tracking-[-0.03em]">{{title}}</div>
      <div class="text-[30px] leading-relaxed text-neutral-500 max-w-[800px]">{{description}}</div>
    </div>
    <div class="flex items-center justify-between">
      <div class="text-[22px] font-semibold text-neutral-400">{{category}}</div>
      <div class="rounded-full bg-black px-8 py-3 text-[22px] font-bold text-white">{{cta}}</div>
    </div>
  </div>
</body>
</html>
` : `
## 多様なデザイン例
以下は純粋なCSSの例である。Tailwindクラスは使用せず、このスタイルで記述すること:

### 例1: グラスモーフィズム・ダーク
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap");
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${width}px; height: ${height}px; font-family: "Noto Sans JP", sans-serif; overflow: hidden; background: #0f172a; }
    .bg-glow-a { position: absolute; width: 400px; height: 400px; border-radius: 50%; background: rgba(99,102,241,0.25); filter: blur(100px); top: -100px; left: -80px; }
    .bg-glow-b { position: absolute; width: 350px; height: 350px; border-radius: 50%; background: rgba(168,85,247,0.2); filter: blur(120px); bottom: -100px; right: 50px; }
    .card { position: relative; margin: 60px; padding: 56px; border-radius: 40px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); box-shadow: 0 25px 50px rgba(0,0,0,0.3); height: calc(100% - 120px); display: flex; flex-direction: column; justify-content: space-between; }
    .kicker { display: flex; align-items: center; gap: 16px; font-size: 22px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: #818cf8; }
    .kicker::before { content: ""; width: 48px; height: 3px; border-radius: 2px; background: linear-gradient(90deg, #6366f1, #a855f7); }
    h1 { font-size: 72px; font-weight: 900; line-height: 1.1; color: #ffffff; }
    .desc { font-size: 28px; line-height: 1.6; color: #cbd5e1; }
    .tags { display: flex; gap: 16px; }
    .tag { padding: 10px 22px; border-radius: 14px; font-size: 16px; font-weight: 700; letter-spacing: 0.1em; }
    .tag-a { border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.15); color: #c7d2fe; }
    .tag-b { border: 1px solid rgba(168,85,247,0.3); background: rgba(168,85,247,0.15); color: #e9d5ff; }
  </style>
</head>
<body>
  <div class="bg-glow-a"></div>
  <div class="bg-glow-b"></div>
  <div class="card">
    <div>
      <div class="kicker">{{category}}</div>
      <h1>{{title}}</h1>
    </div>
    <p class="desc">{{description}}</p>
    <div class="tags">
      <div class="tag tag-a">{{site}}</div>
      <div class="tag tag-b">{{cta}}</div>
    </div>
  </div>
</body>
</html>

### 例2: ミニマル・ハイコントラスト
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap");
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${width}px; height: ${height}px; font-family: "Inter", sans-serif; overflow: hidden; background: #fafaf9; color: #0a0a0a; display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px; }
    .top { display: flex; align-items: center; gap: 12px; }
    .dot { width: 14px; height: 14px; border-radius: 50%; background: #0a0a0a; }
    .brand { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .main { display: flex; flex-direction: column; gap: 24px; }
    h1 { font-size: 84px; font-weight: 900; line-height: 1.05; letter-spacing: -0.03em; }
    .desc { font-size: 30px; line-height: 1.5; color: #737373; max-width: 800px; }
    .bottom { display: flex; align-items: center; justify-content: space-between; }
    .cat { font-size: 22px; font-weight: 600; color: #a3a3a3; }
    .cta { font-size: 22px; font-weight: 700; color: #fafaf9; background: #0a0a0a; padding: 14px 32px; border-radius: 999px; }
  </style>
</head>
<body>
  <div class="top">
    <div class="dot"></div>
    <div class="brand">{{site}}</div>
  </div>
  <div class="main">
    <h1>{{title}}</h1>
    <p class="desc">{{description}}</p>
  </div>
  <div class="bottom">
    <div class="cat">{{category}}</div>
    <div class="cta">{{cta}}</div>
  </div>
</body>
</html>
`}`;

		const messages = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: body.prompt },
		];

		try {
			// model は文字列変数のため、unknown-model オーバーロードに解決される。
			// stream: true の場合は ReadableStream が返るのでキャストする。
			const rawStream = (await c.env.AI.run(model, {
				messages,
				max_tokens: 4096,
				temperature: 0.8,
				stream: true as const,
			})) as unknown as ReadableStream;

			// qwen3.8-27b は OpenAI 互換形式（choices[0].delta.content / delta.reasoning）で返す。
			// フロントエンドは Llama 形式（{response: "token"}）を期待するため、SSE を正規化する。
			// reasoning トークンは推論過程なので破棄し、content のみを抽出する。
			const encoder = new TextEncoder();
			const decoder = new TextDecoder();
			let sseBuffer = '';

			const normalizedStream = new TransformStream({
				transform(chunk, controller) {
					sseBuffer += decoder.decode(chunk, { stream: true });
					const frames = sseBuffer.split('\n\n');
					sseBuffer = frames.pop() ?? '';
					for (const frame of frames) {
						for (const line of frame.split('\n')) {
							const trimmed = line.replace(/^\r/, '').trimStart();
							if (!trimmed.startsWith('data:')) continue;
							const payload = trimmed.slice(5).trim();
							if (payload === '[DONE]') {
								controller.enqueue(encoder.encode('data: [DONE]\n\n'));
								continue;
							}
							try {
								const data = JSON.parse(payload);
								// [DONE] 終端
								// OpenAI 互換形式（qwen3.8-27b）: choices[0].delta.content を抽出
								const content = data?.choices?.[0]?.delta?.content;
								if (typeof content === 'string' && content !== '') {
									controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: content })}\n\n`));
								}
								// reasoning トークンは破棄
								// Llama 形式（念のためフォールバック）: data.response
								if (typeof data.response === 'string' && data.response !== '') {
									controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: data.response })}\n\n`));
								}
							} catch {
								// JSON パース失敗は無視
							}
						}
					}
				},
				flush(controller) {
					// 残りのバッファを処理
					if (sseBuffer) {
						for (const line of sseBuffer.split('\n')) {
							const trimmed = line.replace(/^\r/, '').trimStart();
							if (!trimmed.startsWith('data:')) continue;
							const payload = trimmed.slice(5).trim();
							if (payload === '[DONE]') {
								controller.enqueue(encoder.encode('data: [DONE]\n\n'));
								continue;
							}
							try {
								const data = JSON.parse(payload);
								const content = data?.choices?.[0]?.delta?.content;
								if (typeof content === 'string' && content !== '') {
									controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: content })}\n\n`));
								}
								if (typeof data.response === 'string' && data.response !== '') {
									controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: data.response })}\n\n`));
								}
							} catch {
								// ignore
							}
						}
					}
				},
			});

			const normalized = rawStream.pipeThrough(normalizedStream);
			return new Response(normalized, {
				headers: {
					'content-type': 'text/event-stream',
					'cache-control': 'no-cache',
					connection: 'keep-alive',
				},
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			if (message.includes('3036') || message.includes('daily free allocation')) {
				return c.json({ error: 'AIの無料枠を使い切りました（10,000 neurons/日）' }, 429);
			}
			if (message.includes('3040') || message.includes('capacity') || message.includes('Out of capacity')) {
				return c.json({ error: 'AIのGPU容量が不足しています。時間をおいて再試行してください' }, 503);
			}
			if (message.includes('3007') || message.includes('timeout')) {
				return c.json({ error: 'AI生成がタイムアウトしました' }, 504);
			}
			return c.json({ error: `generate failed: ${message}` }, 500);
		}
	} catch (e) {
		return c.json({ error: `generate failed: ${e instanceof Error ? e.message : String(e)}` }, 500);
	}
});
