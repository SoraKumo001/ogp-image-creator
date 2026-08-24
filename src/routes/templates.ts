import { Hono } from 'hono';
import { errorMessage } from '../../shared/errors';
import { isNonEmptyString, isValidSlug } from '../validate';
import {
	getTemplate,
	getTemplateMetadata,
	putTemplate,
	deleteTemplate,
	listTemplates,
	resolveTemplateSize,
	type TemplateData,
	type TemplateMetadata,
} from '../kv';
import { requireAuth } from '../middleware';
import type { AppEnv } from '../types';

export const templateRoutes = new Hono<AppEnv>();

// GET /api/templates
templateRoutes.get('/api/templates', requireAuth, async (c) => {
	const templates = await listTemplates(c.env);
	return c.json({ templates });
});

// POST /api/templates
templateRoutes.post('/api/templates', requireAuth, async (c) => {
	try {
		const body = await c.req.json<{
			id?: string;
			name?: string;
			html?: string;
			width?: number;
			height?: number;
		}>();
		if (!isNonEmptyString(body.html)) {
			return c.json({ error: 'html is required' }, 400);
		}
		if (!isNonEmptyString(body.name)) {
			return c.json({ error: 'name is required' }, 400);
		}
		// id（スラッグ）が指定された場合は形式を検証する。空文字は UUID 自動生成にフォールバック。
		if (body.id != null && body.id !== '' && !isValidSlug(body.id)) {
			return c.json({ error: 'id must be alphanumeric (with - or _), starting with a letter or number' }, 400);
		}
		const id = body.id && body.id !== '' ? body.id : crypto.randomUUID();
		const data: TemplateData = {
			html: body.html,
			width: body.width,
			height: body.height,
		};
		const metadata: TemplateMetadata = {
			name: body.name,
			updatedAt: Date.now(),
		};
		await putTemplate(c.env, id, data, metadata);
		return c.json({ id });
	} catch (e) {
		return c.json({ error: `save failed: ${errorMessage(e)}` }, 500);
	}
});

// GET /api/templates/:id
templateRoutes.get('/api/templates/:id', requireAuth, async (c) => {
	const id = c.req.param('id');
	const template = await getTemplate(c.env, id);
	if (template == null) {
		return c.json({ error: 'template not found' }, 404);
	}
	const metadata = await getTemplateMetadata(c.env, id);
	const { width, height } = resolveTemplateSize(template);
	return c.json({
		id,
		name: metadata.name ?? id,
		html: template.html,
		width,
		height,
		updatedAt: metadata.updatedAt ?? 0,
	});
});

// DELETE /api/templates/:id
templateRoutes.delete('/api/templates/:id', requireAuth, async (c) => {
	const id = c.req.param('id');
	await deleteTemplate(c.env, id);
	return c.body(null, 204);
});
