export type OutputFormat = 'png' | 'webp' | 'svg';

export interface RenderSettings {
	width: number;
	height: number;
	format: OutputFormat;
}

export interface TemplateSummary {
	id: string;
	name: string;
	updatedAt: string;
}

export interface TemplateDetail {
	id: string;
	name: string;
	html: string;
	width: number;
	height: number;
	updatedAt: string;
}

export interface SaveTemplatePayload {
	id?: string;
	name: string;
	html: string;
	width?: number;
	height?: number;
}

export interface AuthStatus {
	configured: boolean;
	authenticated: boolean;
}

export interface AdminSummary {
	id: string;
	createdAt: string;
}
