import { useCallback, useRef, useState } from 'react';
import { render, type RequiredResource } from 'satoru-render';
import { createCSS } from 'satoru-render/tailwind';
import { applyMacros, type MacroParams } from './macros';
import { decodeBase64 } from '../../shared/encoding';
import type { RenderSettings } from './types';

interface RenderState {
	status: 'idle' | 'rendering' | 'done' | 'error';
	imageUrl?: string;
	error?: string;
}

/**
 * `resolveResource` をオーバーライドし、外部リソースを
 * `/api/proxy` 経由で取得する（CORS 回避）。
 * 戻り値は Uint8Array（画像・CSS）として返す。
 */
async function resolveViaProxy(resource: RequiredResource): Promise<Uint8Array | null> {
	const { url } = resource;
	// data: URL はそのまま直接解決（外部取得不要）
	if (url.startsWith('data:')) {
		try {
			const base64 = url.slice(url.indexOf(',') + 1);
			return decodeBase64(base64);
		} catch {
			return null;
		}
	}
	// アップロード済みアセット（/assets/）はプロキシを介さず直接取得する
	if (url.startsWith('/assets/')) {
		try {
			const res = await fetch(url, { credentials: 'include' });
			if (!res.ok) return null;
			const buf = await res.arrayBuffer();
			return new Uint8Array(buf);
		} catch {
			return null;
		}
	}
	// 相対パスやスキームのない URL はプロキシ対象外
	if (!/^https?:\/\//i.test(url)) return null;

	try {
		const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, { credentials: 'include' });
		if (!res.ok) return null;
		const buf = await res.arrayBuffer();
		return new Uint8Array(buf);
	} catch {
		return null;
	}
}

export function useRenderer(settings: RenderSettings) {
	const [state, setState] = useState<RenderState>({ status: 'idle' });
	const renderSeq = useRef(0);

	const renderHtml = useCallback(
		async (html: string, params: MacroParams = {}) => {
			const seq = ++renderSeq.current;
			setState({ status: 'rendering' });
			try {
				const result = await render({
					value: applyMacros(html, params),
					css: await createCSS(html),
					width: settings.width,
					height: settings.height,
					format: settings.format,
					resolveResource: async (resource) => resolveViaProxy(resource),
				});
				if (seq !== renderSeq.current) return; // 古いレンダリングは破棄
				const blob =
					result instanceof Uint8Array
						? new Blob([new Uint8Array(result)], { type: settings.format === 'webp' ? 'image/webp' : 'image/png' })
						: new Blob([result], { type: 'image/svg+xml' });
				const imageUrl = URL.createObjectURL(blob);
				setState((prev) => {
					if (prev.imageUrl) URL.revokeObjectURL(prev.imageUrl);
					return { status: 'done', imageUrl };
				});
			} catch (err) {
				if (seq !== renderSeq.current) return;
				setState({ status: 'error', error: err instanceof Error ? err.message : String(err) });
			}
		},
		[settings.width, settings.height, settings.format],
	);

	return { state, renderHtml };
}
