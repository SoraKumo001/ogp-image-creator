import { Hono } from 'hono';
import { hashPassword, listAdminEntries, getAdmin, adminKey } from '../auth';
import { kv } from '../kv';
import { isNonEmptyString } from '../validate';
import { requireAuth } from '../middleware';
import type { AppEnv } from '../types';

export const adminRoutes = new Hono<AppEnv>();

// GET /api/admins (認証必須)
adminRoutes.get('/api/admins', requireAuth, async (c) => {
	const admins = await listAdminEntries(c.env);
	return c.json({ admins });
});

// POST /api/admins (認証必須)
adminRoutes.post('/api/admins', requireAuth, async (c) => {
	const body = await c.req.json<{ id?: string; password?: string }>();
	if (!isNonEmptyString(body.id)) {
		return c.json({ error: 'id is required' }, 400);
	}
	if (!isNonEmptyString(body.password)) {
		return c.json({ error: 'password is required' }, 400);
	}
	const existing = await getAdmin(c.env, body.id);
	if (existing != null) {
		return c.json({ error: 'admin already exists' }, 409);
	}
	const passwordHash = await hashPassword(body.password);
	await kv(c.env).put(adminKey(body.id), JSON.stringify({ passwordHash, createdAt: Date.now() }));
	return c.json({ ok: true });
});

// DELETE /api/admins/:id (認証必須)
adminRoutes.delete('/api/admins/:id', requireAuth, async (c) => {
	const id = c.req.param('id');
	const admins = await listAdminEntries(c.env);
	if (admins.length <= 1) {
		return c.json({ error: 'cannot delete the last admin' }, 400);
	}
	const target = await getAdmin(c.env, id);
	if (target == null) {
		return c.json({ error: 'admin not found' }, 404);
	}
	await kv(c.env).delete(adminKey(id));
	return c.json({ ok: true });
});
