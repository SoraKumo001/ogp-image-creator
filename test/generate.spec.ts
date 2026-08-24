import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncomingRequest, clearKv, fetchWorker, setupAdmin } from './helpers';

// Workers AI のストリーミングレスポンスは SSE 形式。
// `data: {...}\n\n` のフレームを数個送り、最後に `data: [DONE]\n\n` を送る ReadableStream を生成する。
function createFakeSseStream(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});
}

// AI が返す SSE フレームの例（.response デルタを含む）
const FAKE_SSE_FRAMES = [
	'data: {"response":"<!DOCTYPE "}\n\n',
	'data: {"response":"html>"}\n\n',
	'data: [DONE]\n\n',
];

describe('/api/generate', () => {
	beforeEach(async () => {
		await clearKv();
		// 各テスト前に AI.run をモックし、SSE ストリームを返すようにする。
		vi.spyOn(env.AI, 'run').mockResolvedValue(
			createFakeSseStream(FAKE_SSE_FRAMES) as unknown as Awaited<ReturnType<typeof env.AI.run>>,
		);
	});

	it('returns 401 without auth', async () => {
		const request = new IncomingRequest('http://example.com/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ prompt: 'test' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(401);
	});

	it('returns 400 for empty prompt', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ prompt: '' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'prompt is required' });
	});

	it('returns 400 for unsupported model', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ prompt: 'test', model: 'unsupported/model' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'unsupported model' });
	});

	it('streams SSE response for a valid request', async () => {
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ prompt: 'ダークなテック系OGP' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/event-stream');
		const text = await response.text();
		expect(text).toContain('<!DOCTYPE ');
		expect(text).toContain('html>');
		expect(text).toContain('[DONE]');
		// AI.run がデフォルトモデルで呼ばれたことを検証
		expect(env.AI.run).toHaveBeenCalledWith(
			'@cf/google/gemma-4-26b-a4b-it',
			expect.objectContaining({ stream: true, max_tokens: 4096 }),
		);
	});

	it('maps 3036 free allocation error to 429', async () => {
		vi.spyOn(env.AI, 'run').mockRejectedValue(new Error('Error 3036: daily free allocation exceeded'));
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ prompt: 'test' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(429);
		const body = (await response.json()) as { error: string };
		expect(body.error).toContain('無料枠');
	});

	it('maps 3040 capacity error to 503', async () => {
		vi.spyOn(env.AI, 'run').mockRejectedValue(new Error('Error 3040: Out of capacity'));
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ prompt: 'test' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(503);
	});

	it('maps 3007 timeout error to 504', async () => {
		vi.spyOn(env.AI, 'run').mockRejectedValue(new Error('Error 3007: timeout'));
		const cookie = await setupAdmin();
		const request = new IncomingRequest('http://example.com/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ prompt: 'test' }),
		});
		const response = await fetchWorker(request);
		expect(response.status).toBe(504);
	});
});