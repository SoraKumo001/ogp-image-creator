import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
export const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

/** 各テスト前に KV をクリーンにする */
export async function clearKv(): Promise<void> {
	const list = await env['OGP-IMAGE-CREATOR'].list();
	for (const key of list.keys) {
		await env['OGP-IMAGE-CREATOR'].delete(key.name);
	}
}

/** リクエストを実行し、ExecutionContext の完了を待ってレスポンスを返す */
export async function fetchWorker(request: Request): Promise<Response> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

/** 初期管理者をセットアップし、セッション Cookie を返す */
export async function setupAdmin(): Promise<string> {
	const request = new IncomingRequest('http://example.com/api/setup', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id: 'admin', password: 'secret' }),
	});
	const response = await fetchWorker(request);
	expect(response.status).toBe(200);
	const setCookie = response.headers.get('Set-Cookie');
	expect(setCookie).toBeTruthy();
	return setCookie!.split(';')[0]; // "session=<token>"
}
