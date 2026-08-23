import type { AdminSummary, AuthStatus, SaveTemplatePayload, TemplateDetail, TemplateSummary } from './types';

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
