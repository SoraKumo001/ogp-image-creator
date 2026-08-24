import { Hono } from 'hono';
import { putAsset, getAsset, deleteAsset, listAssets, encodeBase64, decodeBase64 } from '../assets';
import { requireAuth } from '../middleware';
import type { AppEnv } from '../types';

export const assetRoutes = new Hono<AppEnv>();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// POST /api/assets
assetRoutes.post('/api/assets', requireAuth, async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body.file;
		if (!(file instanceof File)) {
			return c.json({ error: 'file is required' }, 400);
		}
		if (file.size > MAX_FILE_SIZE) {
			return c.json({ error: 'file size exceeds 5MB limit' }, 413);
		}
		const contentType = file.type !== '' ? file.type : 'application/octet-stream';
		const id = crypto.randomUUID();
		const bytes = new Uint8Array(await file.arrayBuffer());
		const data = encodeBase64(bytes);
		await putAsset(c.env, id, {
			data,
			contentType,
			name: file.name,
			size: file.size,
		});
		return c.json({ id, name: file.name, contentType, size: file.size, url: '/assets/' + id });
	} catch (e) {
		return c.json({ error: `upload failed: ${e instanceof Error ? e.message : String(e)}` }, 500);
	}
});

// GET /api/assets
assetRoutes.get('/api/assets', requireAuth, async (c) => {
	const assets = await listAssets(c.env);
	return c.json({ assets });
});

// DELETE /api/assets/:id
assetRoutes.delete('/api/assets/:id', requireAuth, async (c) => {
	const id = c.req.param('id');
	await deleteAsset(c.env, id);
	return c.body(null, 204);
});

// GET /assets/:id（公開・認証不要）
assetRoutes.get('/assets/:id', async (c) => {
	const id = c.req.param('id');
	const asset = await getAsset(c.env, id);
	if (asset == null) {
		return c.json({ error: 'asset not found' }, 404);
	}
	const bytes = decodeBase64(asset.data);
	return c.body(bytes, 200, {
		'Content-Type': asset.contentType,
		'Cache-Control': 'public, max-age=31536000, immutable',
	});
});
