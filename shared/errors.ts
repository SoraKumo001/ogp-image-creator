/**
 * エラーオブジェクトから安全にメッセージ文字列を取り出すヘルパー。
 * `e instanceof Error ? e.message : String(e)` の反復を排除する。
 */
export function errorMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}
