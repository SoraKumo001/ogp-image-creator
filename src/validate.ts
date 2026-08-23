/**
 * リクエストボディのバリデーション用ヘルパー。
 */

/**
 * 値が非空文字列かどうかを判定する型ガード。
 * 呼び出し側で `if (!isNonEmptyString(...))` とすることで型が絞り込まれる。
 */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

/**
 * テンプレートのスラッグ（URL 識別子）として有効かどうかを判定する。
 * 先頭は英数字、以降は英数字・ハイフン・アンダースコアのみ、最大 64 文字。
 * これにより OGP 画像 URL（/ogp/:id）が安全かつ安定した形になる。
 */
export function isValidSlug(value: unknown): value is string {
	return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
}
