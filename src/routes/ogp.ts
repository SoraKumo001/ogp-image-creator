import { Hono } from 'hono';
import { applyMacros } from '../../shared/macros';
import { errorMessage } from '../../shared/errors';
import { getTemplate, getTemplateMetadata, resolveTemplateSize } from '../kv';
import { renderImage, parseFormat, parsePositiveInt, renderCacheKey } from '../render';
import type { AppEnv } from '../types';

export const ogpRoutes = new Hono<AppEnv>();

// GET /ogp/:id
ogpRoutes.get('/ogp/:id', async (c) => {
	const id = c.req.param('id');
	const template = await getTemplate(c.env, id);
	if (template == null) {
		return c.json({ error: 'template not found' }, 404);
	}
	try {
		const meta = await getTemplateMetadata(c.env, id);
		const updatedAt = meta.updatedAt ?? 0;
		const { width: defaultWidth, height: defaultHeight } = resolveTemplateSize(template);
		const width = parsePositiveInt(c.req.query('w'), defaultWidth);
		const height = parsePositiveInt(c.req.query('h'), defaultHeight);
		const format = parseFormat(c.req.query('format'));
		const allQuery = c.req.query();
		const params: Record<string, string> = {};
		for (const [key, value] of Object.entries(allQuery)) {
			if (key === 'w' || key === 'h' || key === 'format') continue;
			params[key] = value;
		}
		const html = applyMacros(template.html, params);

		// テンプレート ID + updatedAt + クエリパラメータ + サイズ + 形式ごとにレンダリング結果をキャッシュする。
		// updatedAt をキーに含めることで、テンプレート更新時に古いキャッシュが自然に無効化される。
		const cacheKey = renderCacheKey(['ogp', id, String(updatedAt)], {
			w: String(width),
			h: String(height),
			format,
			...params,
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
