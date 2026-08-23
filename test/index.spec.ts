import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect, vi, beforeEach } from "vitest";
import worker, { applyMacros } from "../src/index";
import { hashPassword, verifyPassword } from "../src/auth";

// satoru-render の render をモックし、渡された HTML（マクロ置換後）をそのまま返す。
// これによりエンドポイントがマクロ置換を正しく行っているかを直接検証できる。
vi.mock("satoru-render/workerd", () => ({
	render: vi.fn(async (opts: { value: string }) => opts.value),
}));

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

async function setupAdmin(): Promise<string> {
	const request = new IncomingRequest("http://example.com/api/setup", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id: "admin", password: "secret" }),
	});
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	expect(response.status).toBe(200);
	const setCookie = response.headers.get("Set-Cookie");
	expect(setCookie).toBeTruthy();
	return setCookie!.split(";")[0]; // "session=<token>"
}

describe("auth helpers", () => {
	it("hashPassword / verifyPassword round-trip", async () => {
		const hash = await hashPassword("secret");
		expect(hash).toContain(":");
		expect(await verifyPassword("secret", hash)).toBe(true);
		expect(await verifyPassword("wrong", hash)).toBe(false);
	});

	it("hashPassword produces unique salts", async () => {
		const a = await hashPassword("secret");
		const b = await hashPassword("secret");
		expect(a).not.toBe(b);
	});
});

describe("OGP image worker", () => {
	beforeEach(async () => {
		// 各テスト前に KV をクリーンにする
		const list = await env.TEMPLATES.list();
		for (const key of list.keys) {
			await env.TEMPLATES.delete(key.name);
		}
	});

	it("returns 400 for /api/render without html (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/api/render", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "html is required" });
	});

	it("returns 404 for unknown /ogp/:id (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/ogp/missing");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "template not found" });
	});

	it("serves static assets from ASSETS binding (integration style)", async () => {
		// public/ はエディタ UI のビルド成果物が入る想定。未ビルド時は 404。
		const response = await SELF.fetch("https://example.com");
		expect([200, 404]).toContain(response.status);
	});

	it("substitutes params in /api/render", async () => {
		const request = new IncomingRequest("http://example.com/api/render", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				html: "<h1>{{title}}</h1>",
				format: "svg",
				params: { title: "Hello" },
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("<h1>Hello</h1>");
	});

	it("substitutes query params in /ogp/:id", async () => {
		const cookie = await setupAdmin();
		const createRequest = new IncomingRequest(
			"http://example.com/api/templates",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: cookie,
				},
				body: JSON.stringify({
					name: "macro-test",
					html: "<h1>{{title}}</h1>",
				}),
			},
		);
		const ctx = createExecutionContext();
		const createResponse = await worker.fetch(createRequest, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(createResponse.status).toBe(200);
		const { id } = (await createResponse.json()) as { id: string };

		const request = new IncomingRequest(
			`http://example.com/ogp/${id}?title=Hello&format=svg`,
		);
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("<h1>Hello</h1>");
	});
});

describe("authentication", () => {
	beforeEach(async () => {
		const list = await env.TEMPLATES.list();
		for (const key of list.keys) {
			await env.TEMPLATES.delete(key.name);
		}
	});

	it("returns configured:false when no admin exists", async () => {
		const request = new IncomingRequest("http://example.com/api/auth/status");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			configured: false,
			authenticated: false,
		});
	});

	it("returns configured:true after setup", async () => {
		await setupAdmin();
		const request = new IncomingRequest("http://example.com/api/auth/status");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			configured: true,
			authenticated: false,
		});
	});

	it("returns 401 for /api/templates without auth", async () => {
		const request = new IncomingRequest("http://example.com/api/templates");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "unauthorized" });
	});

	it("returns 401 for /api/proxy without auth", async () => {
		const request = new IncomingRequest(
			"http://example.com/api/proxy?url=https%3A%2F%2Fexample.com",
		);
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
	});

	it("allows /api/templates after login", async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest("http://example.com/api/templates", {
			headers: { Cookie: cookie },
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ templates: [] });
	});

	it("allows /api/render without auth", async () => {
		const request = new IncomingRequest("http://example.com/api/render", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ html: "<div>x</div>", format: "svg" }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it("allows /ogp/:id without auth (404 for missing)", async () => {
		const request = new IncomingRequest("http://example.com/ogp/missing");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("login with wrong password returns 401", async () => {
		await setupAdmin();
		const request = new IncomingRequest("http://example.com/api/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: "admin", password: "wrong" }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
	});

	it("login with correct password returns ok and sets cookie", async () => {
		await setupAdmin();
		const request = new IncomingRequest("http://example.com/api/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: "admin", password: "secret" }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(response.headers.get("Set-Cookie")).toContain("session=");
	});

	it("lists admins without password hash", async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest("http://example.com/api/admins", {
			headers: { Cookie: cookie },
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			admins: { id: string; createdAt: number }[];
		};
		expect(body.admins).toHaveLength(1);
		expect(body.admins[0].id).toBe("admin");
		expect(body.admins[0]).not.toHaveProperty("passwordHash");
	});

	it("adds a second admin", async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest("http://example.com/api/admins", {
			method: "POST",
			headers: { "Content-Type": "application/json", Cookie: cookie },
			body: JSON.stringify({ id: "admin2", password: "secret2" }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});

	it("rejects duplicate admin id with 409", async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest("http://example.com/api/admins", {
			method: "POST",
			headers: { "Content-Type": "application/json", Cookie: cookie },
			body: JSON.stringify({ id: "admin", password: "secret2" }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(409);
	});

	it("cannot delete the last admin", async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest(
			"http://example.com/api/admins/admin",
			{
				method: "DELETE",
				headers: { Cookie: cookie },
			},
		);
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});

	it("deletes a non-last admin", async () => {
		const cookie = await setupAdmin();
		const ctx = createExecutionContext();
		const addRequest = new IncomingRequest("http://example.com/api/admins", {
			method: "POST",
			headers: { "Content-Type": "application/json", Cookie: cookie },
			body: JSON.stringify({ id: "admin2", password: "secret2" }),
		});
		const addResponse = await worker.fetch(addRequest, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(addResponse.status).toBe(200);

		const delRequest = new IncomingRequest(
			"http://example.com/api/admins/admin2",
			{
				method: "DELETE",
				headers: { Cookie: cookie },
			},
		);
		const delResponse = await worker.fetch(delRequest, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(delResponse.status).toBe(200);
	});

	it("logout clears session", async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest("http://example.com/api/logout", {
			method: "POST",
			headers: { Cookie: cookie },
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
	});

	it("invalidates session after self-deletion", async () => {
		const cookie = await setupAdmin();
		const ctx = createExecutionContext();

		// 2 人目の管理者を追加して、自分自身を削除可能にする
		const addRequest = new IncomingRequest("http://example.com/api/admins", {
			method: "POST",
			headers: { "Content-Type": "application/json", Cookie: cookie },
			body: JSON.stringify({ id: "admin2", password: "secret2" }),
		});
		const addResponse = await worker.fetch(addRequest, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(addResponse.status).toBe(200);

		// 自分自身（admin）を削除
		const delRequest = new IncomingRequest(
			"http://example.com/api/admins/admin",
			{
				method: "DELETE",
				headers: { Cookie: cookie },
			},
		);
		const delResponse = await worker.fetch(delRequest, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(delResponse.status).toBe(200);

		// 削除後、同じセッションで保護された API にアクセスすると 401
		const protectedRequest = new IncomingRequest(
			"http://example.com/api/templates",
			{ headers: { Cookie: cookie } },
		);
		const protectedResponse = await worker.fetch(protectedRequest, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(protectedResponse.status).toBe(401);
	});
});

describe("applyMacros", () => {
	it("replaces known keys", () => {
		expect(applyMacros("<h1>{{title}}</h1>", { title: "Hello" })).toBe(
			"<h1>Hello</h1>",
		);
	});

	it("leaves unknown keys as literal", () => {
		expect(applyMacros("<h1>{{title}}</h1>", {})).toBe(
			"<h1>{{title}}</h1>",
		);
	});

	it("replaces multiple keys", () => {
		expect(
			applyMacros("<h1>{{title}}</h1><p>{{description}}</p>", {
				title: "Hello",
				description: "World",
			}),
		).toBe("<h1>Hello</h1><p>World</p>");
	});

	it("does not HTML-escape values", () => {
		expect(applyMacros("<div>{{content}}</div>", { content: "<b>x</b>" })).toBe(
			"<div><b>x</b></div>",
		);
	});
});
