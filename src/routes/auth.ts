import { Hono } from 'hono';
import {
	hashPassword,
	verifyPassword,
	createSession,
	getSession,
	deleteSession,
	getAdmin,
	isConfigured,
	parseCookies,
	adminKey,
	SESSION_COOKIE,
} from '../auth';
import { isNonEmptyString } from '../validate';
import { kv } from '../kv';
import { sessionCookieHeader } from '../middleware';
import type { AppEnv } from '../types';

export const authRoutes = new Hono<AppEnv>();

// GET /api/auth/status
authRoutes.get('/api/auth/status', async (c) => {
	const configured = await isConfigured(c.env);
	const cookies = parseCookies(c.req.header('Cookie'));
	const token = cookies[SESSION_COOKIE];
	const authenticated = token ? (await getSession(c.env, token)) != null : false;
	return c.json({ configured, authenticated });
});

// POST /api/setup (configured=false の時のみ許可)
authRoutes.post('/api/setup', async (c) => {
	const configured = await isConfigured(c.env);
	if (configured) {
		return c.json({ error: 'already configured' }, 400);
	}
	const body = await c.req.json<{ id?: string; password?: string }>();
	if (!isNonEmptyString(body.id)) {
		return c.json({ error: 'id is required' }, 400);
	}
	if (!isNonEmptyString(body.password)) {
		return c.json({ error: 'password is required' }, 400);
	}
	const passwordHash = await hashPassword(body.password);
	await kv(c.env).put(adminKey(body.id), JSON.stringify({ passwordHash, createdAt: Date.now() }));
	const token = await createSession(c.env, body.id);
	c.header('Set-Cookie', sessionCookieHeader(c, token, 604800));
	return c.json({ ok: true });
});

// POST /api/login
authRoutes.post('/api/login', async (c) => {
	const body = await c.req.json<{ id?: string; password?: string }>();
	if (typeof body.id !== 'string' || typeof body.password !== 'string') {
		return c.json({ error: 'id and password are required' }, 400);
	}
	const admin = await getAdmin(c.env, body.id);
	if (admin == null) {
		return c.json({ error: 'invalid credentials' }, 401);
	}
	const valid = await verifyPassword(body.password, admin.passwordHash);
	if (!valid) {
		return c.json({ error: 'invalid credentials' }, 401);
	}
	const token = await createSession(c.env, body.id);
	c.header('Set-Cookie', sessionCookieHeader(c, token, 604800));
	return c.json({ ok: true });
});

// POST /api/logout
authRoutes.post('/api/logout', async (c) => {
	const cookies = parseCookies(c.req.header('Cookie'));
	const token = cookies[SESSION_COOKIE];
	if (token) {
		await deleteSession(c.env, token);
	}
	c.header('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0`);
	return c.json({ ok: true });
});
