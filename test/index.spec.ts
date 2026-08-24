import { SELF } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyMacros } from '../src/index';
import { hashPassword, verifyPassword } from '../src/auth';
import { parsePositiveInt, clampDimension } from '../src/render';
import { MAX_DIMENSION } from '../shared/constants';
import { IncomingRequest, clearKv, fetchWorker, setupAdmin } from './helpers';

// satoru-render の render をモックし、渡された HTML（マクロ置換後）をそのまま返す。
// これによりエンドポイントがマクロ置換を正しく行っているかを直接検証できる。
vi.mock('satoru-render/workerd', () => ({
	render: vi.fn(async (opts: { value: string }) => opts.value),
}));

describe('auth helpers', () => {
	it('hashPassword / verifyPassword round-trip', async () => {
		const hash = await hashPassword('secret');
		expect(hash).toContain(':');
		expect(await verifyPassword('secret', hash)).toBe(true);
		expect(await verifyPassword('wrong', hash)).toBe(false);
	});

	it('hashPassword produces unique salts', async () => {
		const a = await hashPassword('secret');
		const b = await hashPassword('secret');
		expect(a).not.toBe(b);
	});
});

describe('OGP image worker', () => {
	beforeEach(clearKv);

	it('returns 400 for /api/render without html (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/api/render', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'html is required' });
	});

	it('returns 404 for unknown /ogp/:id (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/ogp/missing');
		const response = await fetchWorker(request);
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'template not found' });
	});

	it('serves static assets from ASSETS binding (integration style)', async () => {
		// public/ はエディタ UI のビルド成果物が入る想定。未ビルド時は 404。
		const response = await SELF.fetch('https://example.com');
		expect([200, 404]).toContain(response.status);
	});

	it('substitutes params in /api/render', async () => {
		const request = new IncomingRequest('http://example.com/api/render', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				html: '<h1>{{title}}</h1>',
				format: 'svg',
				params: { title: 'Hello' },
			}),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('<h1>Hello</h1>');
	});

	it('substitutes query params in /ogp/:id', async () => {
		const cookie = await setupAdmin();
		const createRequest = new IncomingRequest('http://example.com/api/templates', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: cookie,
			},
			body: JSON.stringify({
				name: 'macro-test',
				html: '<h1>{{title}}</h1>',
			}),
		});
		const createResponse = await fetchWorker(createRequest);
		expect(createResponse.status).toBe(200);
		const { id } = (await createResponse.json()) as { id: string };

		const request = new IncomingRequest(`http://example.com/ogp/${id}?title=Hello&format=svg`);
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('<h1>Hello</h1>');
	});
});

describe('authentication', () => {
	beforeEach(clearKv);

	it('returns configured:false when no admin exists', async () => {
		const request = new IncomingRequest('http://example.com/api/auth/status');
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			configured: false,
			authenticated: false,
		});
	});

	it('returns configured:true after setup', async () => {
		await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/auth/status');
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			configured: true,
			authenticated: false,
		});
	});

	it('returns 401 for /api/templates without auth', async () => {
		const request = new IncomingRequest('http://example.com/api/templates');
		const response = await fetchWorker(request);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'unauthorized' });
	});

	it('returns 401 for /api/proxy without auth', async () => {
		const request = new IncomingRequest('http://example.com/api/proxy?url=https%3A%2F%2Fexample.com');
		const response = await fetchWorker(request);
		expect(response.status).toBe(401);
	});

	it('allows /api/templates after login', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/templates', {
			headers: { Cookie: cookie },
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ templates: [] });
	});

	it('allows /api/render without auth', async () => {
		const request = new IncomingRequest('http://example.com/api/render', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ html: '<div>x</div>', format: 'svg' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
	});

	it('allows /ogp/:id without auth (404 for missing)', async () => {
		const request = new IncomingRequest('http://example.com/ogp/missing');
		const response = await fetchWorker(request);
		expect(response.status).toBe(404);
	});

	it('login with wrong password returns 401', async () => {
		await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: 'admin', password: 'wrong' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(401);
	});

	it('login with correct password returns ok and sets cookie', async () => {
		await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: 'admin', password: 'secret' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(response.headers.get('Set-Cookie')).toContain('session=');
	});

	it('lists admins without password hash', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/admins', {
			headers: { Cookie: cookie },
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			admins: { id: string; createdAt: number }[];
		};
		expect(body.admins).toHaveLength(1);
		expect(body.admins[0].id).toBe('admin');
		expect(body.admins[0]).not.toHaveProperty('passwordHash');
	});

	it('adds a second admin', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/admins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ id: 'admin2', password: 'secret2' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});

	it('rejects duplicate admin id with 409', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/admins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ id: 'admin', password: 'secret2' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(409);
	});

	it('cannot delete the last admin', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/admins/admin', {
			method: 'DELETE',
			headers: { Cookie: cookie },
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(400);
	});

	it('deletes a non-last admin', async () => {
		const cookie = await setupAdmin();
		const addRequest = new IncomingRequest('http://example.com/api/admins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ id: 'admin2', password: 'secret2' }),
		});
		const addResponse = await fetchWorker(addRequest);
		expect(addResponse.status).toBe(200);

		const delRequest = new IncomingRequest('http://example.com/api/admins/admin2', {
			method: 'DELETE',
			headers: { Cookie: cookie },
		});
		const delResponse = await fetchWorker(delRequest);
		expect(delResponse.status).toBe(200);
	});

	it('logout clears session', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/logout', {
			method: 'POST',
			headers: { Cookie: cookie },
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
	});

	it('invalidates session after self-deletion', async () => {
		const cookie = await setupAdmin();

		// 2 人目の管理者を追加して、自分自身を削除可能にする
		const addRequest = new IncomingRequest('http://example.com/api/admins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ id: 'admin2', password: 'secret2' }),
		});
		const addResponse = await fetchWorker(addRequest);
		expect(addResponse.status).toBe(200);

		// 自分自身（admin）を削除
		const delRequest = new IncomingRequest('http://example.com/api/admins/admin', {
			method: 'DELETE',
			headers: { Cookie: cookie },
		});
		const delResponse = await fetchWorker(delRequest);
		expect(delResponse.status).toBe(200);

		// 削除後、同じセッションで保護された API にアクセスすると 401
		const protectedRequest = new IncomingRequest('http://example.com/api/templates', { headers: { Cookie: cookie } });
		const protectedResponse = await fetchWorker(protectedRequest);
		expect(protectedResponse.status).toBe(401);
	});
});

describe('applyMacros', () => {
	it('replaces known keys', () => {
		expect(applyMacros('<h1>{{title}}</h1>', { title: 'Hello' })).toBe('<h1>Hello</h1>');
	});

	it('leaves unknown keys as literal', () => {
		expect(applyMacros('<h1>{{title}}</h1>', {})).toBe('<h1>{{title}}</h1>');
	});

	it('replaces multiple keys', () => {
		expect(
			applyMacros('<h1>{{title}}</h1><p>{{description}}</p>', {
				title: 'Hello',
				description: 'World',
			}),
		).toBe('<h1>Hello</h1><p>World</p>');
	});

	it('HTML-escapes values', () => {
		expect(applyMacros('<div>{{content}}</div>', { content: '<b>x</b>' })).toBe('<div>&lt;b&gt;x&lt;/b&gt;</div>');
	});

	it('escapes &, ", and \' in values', () => {
		expect(applyMacros('<div>{{content}}</div>', { content: '&"\'<>' })).toBe(
			'<div>&amp;&quot;&#39;&lt;&gt;</div>',
		);
	});
});

describe('dimension clamping', () => {
	it('parsePositiveInt clamps values above MAX_DIMENSION', () => {
		expect(parsePositiveInt('99999', 1200)).toBe(MAX_DIMENSION);
		expect(parsePositiveInt('4096', 1200)).toBe(4096);
		expect(parsePositiveInt('100', 1200)).toBe(100);
	});

	it('clampDimension returns fallback for non-number/negative and clamps large numbers', () => {
		expect(clampDimension('abc', 1200)).toBe(1200);
		expect(clampDimension(-5, 1200)).toBe(1200);
		expect(clampDimension(0, 1200)).toBe(1200);
		expect(clampDimension(1.5, 1200)).toBe(1200);
		expect(clampDimension(99999, 1200)).toBe(MAX_DIMENSION);
		expect(clampDimension(100, 1200)).toBe(100);
	});
});
