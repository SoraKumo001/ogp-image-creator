import { Hono } from 'hono';
import { applyMacros } from '../../shared/macros';
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from '../../shared/constants';
import { errorMessage } from '../../shared/errors';
import { isNonEmptyString } from '../validate';
import { renderImage, parseFormat, renderCacheKey, hashString } from '../render';
import type { AppEnv, RenderFormat } from '../types';

export const renderRoutes = new Hono<AppEnv>();

// POST /api/render
renderRoutes.post('/api/render', async (c) => {
	try {
		const body = await c.req.json<{
			html?: string;
			width?: number;
			height?: number;
			format?: RenderFormat;
			params?: Record<string, string>;
		}>();
		if (!isNonEmptyString(body.html)) {
			return c.json({ error: 'html is required' }, 400);
		}
		const format = parseFormat(body.format);
		const width = body.width ?? DEFAULT_WIDTH;
		const height = body.height ?? DEFAULT_HEIGHT;
		const html = applyMacros(body.html, body.params ?? {});

		// 同一入力（HTML + パラメータ + サイズ + 形式）のレンダリング結果をキャッシュする。
		const cacheKey = renderCacheKey(['render', await hashString(html)], {
			w: String(width),
			h: String(height),
			format,
		});
		const cached = await caches.default.match(cacheKey);
		if (cached) return cached;

		const response = await renderImage(c, html, width, height, format);
		await caches.default.put(cacheKey, response.clone());
		return response;
	} catch (e) {
		return c.json({ error: `render failed: ${errorMessage(e)}` }, 500);
	}
});
