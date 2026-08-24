/**
 * バックエンド・フロントエンドで共有するバリデーション。
 */

/**
 * テンプレートのスラッグ（URL 識別子）として有効かどうかを判定する。
 * 先頭は英数字、以降は英数字・ハイフン・アンダースコアのみ、最大 64 文字。
 * これにより OGP 画像 URL（/ogp/:id）が安全かつ安定した形になる。
 */
export function isValidSlug(value: unknown): value is string {
	return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
}
