/**
 * タイムスタンプ（Unix ミリ秒）を日本語の日時文字列に整形する。
 * 無効な値の場合は空文字を返す。
 */
export function formatDate(timestamp: number): string {
	const d = new Date(timestamp);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleString('ja-JP', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}
