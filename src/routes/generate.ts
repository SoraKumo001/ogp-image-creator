import { Hono } from 'hono';
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from '../../shared/constants';
import { errorMessage } from '../../shared/errors';
import { isNonEmptyString } from '../validate';
import { requireAuth } from '../middleware';
import { buildSystemPrompt } from '../generate/prompt';
import { normalizeSseStream } from '../generate/sse';
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

		const systemPrompt = buildSystemPrompt({ width, height, useTailwind });

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
			const normalized = normalizeSseStream(rawStream);
			return new Response(normalized, {
				headers: {
					'content-type': 'text/event-stream',
					'cache-control': 'no-cache',
					connection: 'keep-alive',
				},
			});
		} catch (e) {
			const message = errorMessage(e);
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
		return c.json({ error: `generate failed: ${errorMessage(e)}` }, 500);
	}
});
