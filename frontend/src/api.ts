import type { AdminSummary, AssetSummary, AuthStatus, SaveTemplatePayload, TemplateDetail, TemplateSummary, UploadedAsset } from './types';

const json = (init: RequestInit = {}): RequestInit => ({
	...init,
	credentials: 'include',
	headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
});

export class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

/**
 * 401（認証切れ）を検出した際に呼ばれるコールバック。
 * useAuth 側で登録し、ログイン画面への遷移を担う。
 * 循環参照を避けるため、api.ts は setter のみ公開する。
 */
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null): void {
	onUnauthorized = handler;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(url, { ...init, credentials: 'include' });
	if (res.status === 401) {
		onUnauthorized?.();
		throw new ApiError('認証が必要です', 401);
	}
	if (!res.ok) {
		throw new ApiError(`リクエストに失敗しました (${res.status})`, res.status);
	}
	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}

/* ---------- 認証・管理者 ---------- */

export async function fetchAuthStatus(): Promise<AuthStatus> {
	return request<AuthStatus>('/api/auth/status');
}

export async function setupAdmin(id: string, password: string): Promise<{ ok: true }> {
	return request<{ ok: true }>('/api/setup', json({ method: 'POST', body: JSON.stringify({ id, password }) }));
}

export async function login(id: string, password: string): Promise<{ ok: true }> {
	return request<{ ok: true }>('/api/login', json({ method: 'POST', body: JSON.stringify({ id, password }) }));
}

export async function logout(): Promise<{ ok: true }> {
	return request<{ ok: true }>('/api/logout', json({ method: 'POST' }));
}

export async function fetchAdmins(): Promise<AdminSummary[]> {
	const data = await request<{ admins: AdminSummary[] }>('/api/admins');
	return data.admins;
}

export async function createAdmin(id: string, password: string): Promise<{ ok: true }> {
	return request<{ ok: true }>('/api/admins', json({ method: 'POST', body: JSON.stringify({ id, password }) }));
}

export async function deleteAdmin(id: string): Promise<void> {
	return request<void>(`/api/admins/${id}`, { method: 'DELETE' });
}

/* ---------- テンプレート ---------- */

export async function fetchTemplates(): Promise<TemplateSummary[]> {
	const data = await request<{ templates: TemplateSummary[] }>('/api/templates');
	return data.templates;
}

export async function fetchTemplate(id: string): Promise<TemplateDetail> {
	return request<TemplateDetail>(`/api/templates/${id}`);
}

export async function saveTemplate(payload: SaveTemplatePayload): Promise<{ id: string }> {
	return request<{ id: string }>('/api/templates', json({ method: 'POST', body: JSON.stringify(payload) }));
}

export async function deleteTemplate(id: string): Promise<void> {
  return request<void>(`/api/templates/${id}`, { method: 'DELETE' });
}

/* ---------- 画像アセット ---------- */

export async function fetchAssets(): Promise<AssetSummary[]> {
  const data = await request<{ assets: AssetSummary[] }>('/api/assets');
  return data.assets;
}

export async function deleteAsset(id: string): Promise<void> {
  return request<void>(`/api/assets/${id}`, { method: 'DELETE' });
}

export async function uploadAsset(file: File): Promise<UploadedAsset> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/assets', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError('認証が必要です', 401);
  }
  if (!res.ok) {
    throw new ApiError(`リクエストに失敗しました (${res.status})`, res.status);
  }
  return (await res.json()) as UploadedAsset;
}

/* ---------- AI 生成（モデル一覧・ストリーミング） ---------- */

export interface ModelOption {
	id: string;
	label: string;
	hint: string;
	isDefault: boolean;
}

export async function fetchModels(): Promise<ModelOption[]> {
	const data = await request<{ models: ModelOption[] }>('/api/models');
	return data.models;
}

export interface GenerateHandle {
	cancel: () => void;
	promise: Promise<void>;
}

/**
 * POST /api/generate にストリーミングリクエストを送る。
 * SSE フレームを順次デコードし、onChunk でトークンを渡す。
 * [DONE] で完了、エラー時は onError に通知する。
 * キャンセルは返却値の cancel() で行う。
 */
export function streamGenerate(
	opts: { prompt: string; model?: string; width?: number; height?: number; useTailwind?: boolean },
	handlers: { onChunk: (token: string) => void; onDone: () => void; onError: (e: Error) => void },
): GenerateHandle {
	const controller = new AbortController();

	const promise = (async () => {
		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: opts.prompt,
					model: opts.model,
					width: opts.width,
					height: opts.height,
					useTailwind: opts.useTailwind,
				}),
				signal: controller.signal,
			});

			if (res.status === 401) {
				onUnauthorized?.();
				throw new ApiError('認証が必要です', 401);
			}

			if (!res.ok) {
				let message = `リクエストに失敗しました (${res.status})`;
				try {
					const body = (await res.json()) as { error?: string };
					if (typeof body.error === 'string' && body.error) message = body.error;
				} catch {
					// JSON 以外のエラーレスポンスはデフォルトメッセージを使用
				}
				throw new ApiError(message, res.status);
			}

			const body = res.body;
			if (!body) throw new ApiError('ストリームを取得できませんでした', res.status);

			const reader = body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });

				// SSE フレームは \n\n で区切られる。最後の断片は不完全の可能性があるため保持する。
				const frames = buffer.split('\n\n');
				buffer = frames.pop() ?? '';

				for (const frame of frames) {
					for (const rawLine of frame.split('\n')) {
						const line = rawLine.replace(/\r$/, '').trimStart();
						if (!line.startsWith('data:')) continue;
						const payload = line.slice(5).trim();
						if (payload === '[DONE]') {
							handlers.onDone();
							return;
						}
						try {
							const data = JSON.parse(payload) as { response?: string; usage?: unknown };
							// response が空で usage のみ存在する会計フレームは無視
							if ((!data.response || data.response === '') && data.usage) continue;
							if (typeof data.response === 'string' && data.response !== '') {
								handlers.onChunk(data.response);
							}
						} catch {
							// JSON パース失敗は無視
						}
					}
				}
			}

			handlers.onDone();
		} catch (e) {
			// キャンセル時はサイレントに終了
			if (controller.signal.aborted) return;
			handlers.onError(e instanceof Error ? e : new Error(String(e)));
		}
	})();

	return { cancel: () => controller.abort(), promise };
}
