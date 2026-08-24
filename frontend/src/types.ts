import type { RenderFormat } from '../../shared/types';

export interface RenderSettings {
	width: number;
	height: number;
	format: RenderFormat;
}

export interface TemplateSummary {
	id: string;
	name: string;
	updatedAt: number;
}

export interface TemplateDetail {
	id: string;
	name: string;
	html: string;
	width: number;
	height: number;
	updatedAt: number;
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
  createdAt: number;
}

export interface AssetSummary {
  id: string;
  name: string;
  contentType: string;
  size: number;
  updatedAt: number;
}

export interface UploadedAsset {
  id: string;
  name: string;
  contentType: string;
  size: number;
  url: string;
}
