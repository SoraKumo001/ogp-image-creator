import { MAX_PARAM_LENGTH } from './constants';

export type MacroParams = Record<string, string>;

const MACRO_RE = /\{\{\s*([\w-]+)\s*\}\}/g;

/**
 * HTML から `{{key}}` 形式のマクロキーを抽出する。
 * 重複は除去し、出現順で返す。
 */
export function extractMacroKeys(html: string): string[] {
	const keys = new Set<string>();
	for (const m of html.matchAll(MACRO_RE)) {
		keys.add(m[1]);
	}
	return [...keys];
}

/**
 * HTML に埋め込む値をエスケープする。
 * `&` を最初に置換することで二重エスケープを防ぐ。
 */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * HTML 内の `{{key}}` を params の値で置換する。
 * キーが params に存在しない場合は `{{key}}` をそのまま残す。
 * 値は HTML エスケープされ、長さは MAX_PARAM_LENGTH で切り詰められる。
 */
export function applyMacros(html: string, params: MacroParams): string {
	return html.replace(MACRO_RE, (match, key: string) => {
		if (!Object.prototype.hasOwnProperty.call(params, key)) return match;
		const value = params[key];
		const truncated = value.length > MAX_PARAM_LENGTH ? value.slice(0, MAX_PARAM_LENGTH) : value;
		return escapeHtml(truncated);
	});
}
