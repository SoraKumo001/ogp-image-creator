/**
 * テンプレートの KV アクセス層。
 * キー設計（プレフィックス等）の詳細をここに閉じ込め、ルート層からは
 * ドメイン操作のみを呼び出すようにする。
 */

export interface TemplateData {
	html: string;
	width?: number;
	height?: number;
}

export interface TemplateMetadata {
	name: string;
	updatedAt: number;
}

export interface TemplateSummary {
	id: string;
	name: string;
	updatedAt: number;
}

export interface TemplateDetail extends TemplateSummary {
	html: string;
	width: number;
	height: number;
}

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

export async function getTemplate(env: Env, id: string): Promise<TemplateData | null> {
	const raw = await env['OGP-IMAGE-CREATOR'].get(id);
	if (raw == null) return null;
	try {
		return JSON.parse(raw) as TemplateData;
	} catch {
		return null;
	}
}

export async function getTemplateMetadata(env: Env, id: string): Promise<Partial<TemplateMetadata>> {
	const entry = await env['OGP-IMAGE-CREATOR'].getWithMetadata(id);
	return (entry.metadata ?? {}) as Partial<TemplateMetadata>;
}

export async function putTemplate(env: Env, id: string, data: TemplateData, metadata: TemplateMetadata): Promise<void> {
	await env['OGP-IMAGE-CREATOR'].put(id, JSON.stringify(data), { metadata });
}

export async function deleteTemplate(env: Env, id: string): Promise<void> {
	await env['OGP-IMAGE-CREATOR'].delete(id);
}

export async function listTemplates(env: Env): Promise<TemplateSummary[]> {
	const list = await env['OGP-IMAGE-CREATOR'].list();
	return list.keys
		.filter((key) => !key.name.startsWith('__'))
		.map((key) => {
			const meta = (key.metadata ?? {}) as Partial<TemplateMetadata>;
			return {
				id: key.name,
				name: meta.name ?? key.name,
				updatedAt: meta.updatedAt ?? 0,
			};
		});
}

export function resolveTemplateSize(template: TemplateData): { width: number; height: number } {
	return {
		width: template.width ?? DEFAULT_WIDTH,
		height: template.height ?? DEFAULT_HEIGHT,
	};
}
