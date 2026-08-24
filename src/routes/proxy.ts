import { Hono } from 'hono';
import { errorMessage } from '../../shared/errors';
import { requireAuth } from '../middleware';
import type { AppEnv } from '../types';

export const proxyRoutes = new Hono<AppEnv>();

// GET /api/proxy?url=<encoded>
proxyRoutes.get('/api/proxy', requireAuth, async (c) => {
	const target = c.req.query('url');
	if (!target) {
		return c.json({ error: 'url query parameter is required' }, 400);
	}
	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		return c.json({ error: 'invalid url' }, 400);
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return c.json({ error: 'only http/https urls are allowed' }, 400);
	}
	try {
		const upstream = await fetch(parsed.toString());
		const headers = new Headers(upstream.headers);
		headers.set('Access-Control-Allow-Origin', '*');
		return new Response(upstream.body, {
			status: upstream.status,
			headers,
		});
	} catch (e) {
		return c.json({ error: `proxy fetch failed: ${errorMessage(e)}` }, 502);
	}
});
