import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { render } from 'satoru-render';
import {
	hashPassword,
	verifyPassword,
	createSession,
	getSession,
	deleteSession,
	listAdminEntries,
	getAdmin,
	isConfigured,
	parseCookies,
	adminKey,
	SESSION_COOKIE,
} from './auth';

type RenderFormat = 'png' | 'webp' | 'svg';

type AppEnv = {
	Bindings: Env;
	Variables: {
		adminId: string;
	};
};

const CONTENT_TYPES: Record<RenderFormat, string> = {
	png: 'image/png',
	webp: 'image/webp',
	svg: 'image/svg+xml',
};

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

interface TemplateData {
	html: string;
	width?: number;
	height?: number;
}

interface TemplateMetadata {
	name: string;
	updatedAt: number;
}

export function applyMacros(html: string, params: Record<string, string>): string {
	return html.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key: string) => {
		return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : match;
	});
}

function parseFormat(value: string | null | undefined): RenderFormat {
	if (value === 'webp' || value === 'svg') return value;
	return 'png';
}

function parsePositiveInt(value: string | null | undefined, fallback: number): number {
	if (value == null) return fallback;
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n <= 0) return fallback;
	return n;
}

async function renderImage(c: Context, html: string, width: number, height: number, format: RenderFormat): Promise<Response> {
	const result = await render({
		value: html,
		width,
		height,
		format,
	});
	const body = typeof result === 'string' ? result : new Uint8Array(result);
	return c.body(body, 200, {
		'Content-Type': CONTENT_TYPES[format],
		'Cache-Control': 'public, max-age=3600',
	});
}

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashString(value: string): Promise<string> {
	const data = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return toHex(new Uint8Array(digest));
}

// レンダリング結果のキャッシュキーを生成する。
// Cache API は GET リクエストのみキーにできるため、内部用の URL を組み立てる。
function renderCacheKey(segments: string[], query: Record<string, string>): Request {
	const url = new URL('https://ogp-cache.local/');
	url.pathname = '/' + segments.map(encodeURIComponent).join('/');
	for (const [key, value] of Object.entries(query)) {
		url.searchParams.set(key, value);
	}
	return new Request(url.toString());
}

const app = new Hono<AppEnv>();

// セッション Cookie を生成する。`Secure` 属性は HTTPS 接続時のみ付与する。
// ローカル開発（http://localhost）では Secure を付けるとブラウザが Cookie を
// 保存せず、認証が成立しなくなるため、接続プロトコルに応じて切り替える。
function sessionCookieHeader(c: Context, token: string, maxAge: number): string {
	const secure = c.req.url.startsWith('https://');
	const secureAttr = secure ? '; Secure' : '';
	return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax${secureAttr}; Path=/; Max-Age=${maxAge}`;
}

// 認証ミドルウェア: /api/templates* と /api/proxy を保護
const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
	const cookies = parseCookies(c.req.header('Cookie'));
	const token = cookies[SESSION_COOKIE];
	if (!token) {
		return c.json({ error: 'unauthorized' }, 401);
	}
	const adminId = await getSession(c.env, token);
	if (adminId == null) {
		return c.json({ error: 'unauthorized' }, 401);
	}
	c.set('adminId', adminId);
	await next();
};

// POST /api/render
app.post('/api/render', async (c) => {
	try {
		const body = await c.req.json<{
			html?: string;
			width?: number;
			height?: number;
			format?: RenderFormat;
			params?: Record<string, string>;
		}>();
		if (typeof body.html !== 'string' || body.html.length === 0) {
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
		return c.json({ error: `render failed: ${e instanceof Error ? e.message : String(e)}` }, 500);
	}
});

// GET /ogp/:id
app.get('/ogp/:id', async (c) => {
	const id = c.req.param('id');
	const entry = await c.env['OGP-IMAGE-CREATOR'].getWithMetadata(id);
	if (entry.value == null) {
		return c.json({ error: 'template not found' }, 404);
	}
	try {
		const template = JSON.parse(entry.value) as TemplateData;
		const meta = (entry.metadata ?? {}) as Partial<TemplateMetadata>;
		const updatedAt = meta.updatedAt ?? 0;
		const width = parsePositiveInt(c.req.query('w'), template.width ?? DEFAULT_WIDTH);
		const height = parsePositiveInt(c.req.query('h'), template.height ?? DEFAULT_HEIGHT);
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
		return c.json({ error: `render failed: ${e instanceof Error ? e.message : String(e)}` }, 500);
	}
});

// GET /api/auth/status
app.get('/api/auth/status', async (c) => {
	const configured = await isConfigured(c.env);
	const cookies = parseCookies(c.req.header('Cookie'));
	const token = cookies[SESSION_COOKIE];
	const authenticated = token ? (await getSession(c.env, token)) != null : false;
	return c.json({ configured, authenticated });
});

// POST /api/setup (configured=false の時のみ許可)
app.post('/api/setup', async (c) => {
	const configured = await isConfigured(c.env);
	if (configured) {
		return c.json({ error: 'already configured' }, 400);
	}
	const body = await c.req.json<{ id?: string; password?: string }>();
	if (typeof body.id !== 'string' || body.id.length === 0) {
		return c.json({ error: 'id is required' }, 400);
	}
	if (typeof body.password !== 'string' || body.password.length === 0) {
		return c.json({ error: 'password is required' }, 400);
	}
	const passwordHash = await hashPassword(body.password);
	await c.env['OGP-IMAGE-CREATOR'].put(adminKey(body.id), JSON.stringify({ passwordHash, createdAt: Date.now() }));
	const token = await createSession(c.env, body.id);
	c.header('Set-Cookie', sessionCookieHeader(c, token, 604800));
	return c.json({ ok: true });
});

// POST /api/login
app.post('/api/login', async (c) => {
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
app.post('/api/logout', async (c) => {
	const cookies = parseCookies(c.req.header('Cookie'));
	const token = cookies[SESSION_COOKIE];
	if (token) {
		await deleteSession(c.env, token);
	}
	c.header('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0`);
	return c.json({ ok: true });
});

// GET /api/admins (認証必須)
app.get('/api/admins', requireAuth, async (c) => {
	const admins = await listAdminEntries(c.env);
	return c.json({ admins });
});

// POST /api/admins (認証必須)
app.post('/api/admins', requireAuth, async (c) => {
	const body = await c.req.json<{ id?: string; password?: string }>();
	if (typeof body.id !== 'string' || body.id.length === 0) {
		return c.json({ error: 'id is required' }, 400);
	}
	if (typeof body.password !== 'string' || body.password.length === 0) {
		return c.json({ error: 'password is required' }, 400);
	}
	const existing = await getAdmin(c.env, body.id);
	if (existing != null) {
		return c.json({ error: 'admin already exists' }, 409);
	}
	const passwordHash = await hashPassword(body.password);
	await c.env['OGP-IMAGE-CREATOR'].put(adminKey(body.id), JSON.stringify({ passwordHash, createdAt: Date.now() }));
	return c.json({ ok: true });
});

// DELETE /api/admins/:id (認証必須)
app.delete('/api/admins/:id', requireAuth, async (c) => {
	const id = c.req.param('id');
	const admins = await listAdminEntries(c.env);
	if (admins.length <= 1) {
		return c.json({ error: 'cannot delete the last admin' }, 400);
	}
	const target = await getAdmin(c.env, id);
	if (target == null) {
		return c.json({ error: 'admin not found' }, 404);
	}
	await c.env['OGP-IMAGE-CREATOR'].delete(adminKey(id));
	return c.json({ ok: true });
});

// GET /api/proxy?url=<encoded>
app.get('/api/proxy', requireAuth, async (c) => {
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
		return c.json({ error: `proxy fetch failed: ${e instanceof Error ? e.message : String(e)}` }, 502);
	}
});

// GET /api/templates
app.get('/api/templates', requireAuth, async (c) => {
	const list = await c.env['OGP-IMAGE-CREATOR'].list();
	const templates = list.keys
		.filter((key) => !key.name.startsWith('__'))
		.map((key) => {
			const meta = (key.metadata ?? {}) as Partial<TemplateMetadata>;
			return {
				id: key.name,
				name: meta.name ?? key.name,
				updatedAt: meta.updatedAt ?? 0,
			};
		});
	return c.json({ templates });
});

// POST /api/templates
app.post('/api/templates', requireAuth, async (c) => {
	try {
		const body = await c.req.json<{
			id?: string;
			name?: string;
			html?: string;
			width?: number;
			height?: number;
		}>();
		if (typeof body.html !== 'string' || body.html.length === 0) {
			return c.json({ error: 'html is required' }, 400);
		}
		if (typeof body.name !== 'string' || body.name.length === 0) {
			return c.json({ error: 'name is required' }, 400);
		}
		const id = body.id ?? crypto.randomUUID();
		const data: TemplateData = {
			html: body.html,
			width: body.width,
			height: body.height,
		};
		const metadata: TemplateMetadata = {
			name: body.name,
			updatedAt: Date.now(),
		};
		await c.env['OGP-IMAGE-CREATOR'].put(id, JSON.stringify(data), { metadata });
		return c.json({ id });
	} catch (e) {
		return c.json({ error: `save failed: ${e instanceof Error ? e.message : String(e)}` }, 500);
	}
});

// GET /api/templates/:id
app.get('/api/templates/:id', requireAuth, async (c) => {
	const id = c.req.param('id');
	const raw = await c.env['OGP-IMAGE-CREATOR'].get(id);
	if (raw == null) {
		return c.json({ error: 'template not found' }, 404);
	}
	const template = JSON.parse(raw) as TemplateData;
	const meta = (await c.env['OGP-IMAGE-CREATOR'].getWithMetadata(id)) as { metadata?: Partial<TemplateMetadata> | null };
	const metadata = (meta.metadata ?? {}) as Partial<TemplateMetadata>;
	return c.json({
		id,
		name: metadata.name ?? id,
		html: template.html,
		width: template.width ?? DEFAULT_WIDTH,
		height: template.height ?? DEFAULT_HEIGHT,
		updatedAt: metadata.updatedAt ?? 0,
	});
});

// DELETE /api/templates/:id
app.delete('/api/templates/:id', requireAuth, async (c) => {
	const id = c.req.param('id');
	await c.env['OGP-IMAGE-CREATOR'].delete(id);
	return c.body(null, 204);
});

// GET / (static assets)
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
