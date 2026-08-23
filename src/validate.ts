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
