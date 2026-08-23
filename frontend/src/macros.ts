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
 * HTML 内の `{{key}}` を params の値で置換する。
 * 値が未指定（undefined / 空文字）のキーは `{{key}}` をそのまま残す。
 */
export function applyMacros(html: string, params: MacroParams): string {
	return html.replace(MACRO_RE, (match, key: string) => {
		const value = params[key];
		return value ? value : match;
	});
}
