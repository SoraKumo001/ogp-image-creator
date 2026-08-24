import type { Context } from 'hono';
import { render } from 'satoru-render';
import { createCSS } from 'satoru-render/tailwind';
import { getAsset, decodeBase64 } from './assets';
import type { RenderFormat } from './types';

const CONTENT_TYPES: Record<RenderFormat, string> = {
	png: 'image/png',
	webp: 'image/webp',
	svg: 'image/svg+xml',
};

export function parseFormat(value: string | null | undefined): RenderFormat {
	if (value === 'webp' || value === 'svg') return value;
	return 'png';
}

export function parsePositiveInt(value: string | null | undefined, fallback: number): number {
	if (value == null) return fallback;
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n <= 0) return fallback;
	return n;
}

export async function renderImage(c: Context, html: string, width: number, height: number, format: RenderFormat): Promise<Response> {
	const result = await render({
		value: html,
		css: await createCSS(html),
		width,
		height,
		format,
		resolveResource: async (resource, defaultResolver) => {
			// 相対パス画像（/assets/:id）は KV から解決する。
			// それ以外は defaultResolver に委譲する。
			if (resource.url.startsWith('/assets/')) {
				const id = resource.url.slice('/assets/'.length);
				const asset = await getAsset(c.env, id);
				if (asset) return decodeBase64(asset.data);
				return null;
			}
			return defaultResolver(resource);
		},
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

export async function hashString(value: string): Promise<string> {
	const data = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return toHex(new Uint8Array(digest));
}

// レンダリング結果のキャッシュキーを生成する。
// Cache API は GET リクエストのみキーにできるため、内部用の URL を組み立てる。
export function renderCacheKey(segments: string[], query: Record<string, string>): Request {
	const url = new URL('https://ogp-cache.local/');
	url.pathname = '/' + segments.map(encodeURIComponent).join('/');
	for (const [key, value] of Object.entries(query)) {
		url.searchParams.set(key, value);
	}
	return new Request(url.toString());
}
