/**
 * base64 変換ヘルパー。
 * btoa/atob は大きなデータでスタックオーバーフローを起こすため、
 * チャンク分割して変換する。
 *
 * バックエンド（assets.ts）・フロントエンド（useRenderer.ts）・
 * 認証（auth.ts）で重複していた実装をここに統合する。
 */

const CHUNK_SIZE = 0x8000;

export function encodeBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
		binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
	}
	return btoa(binary);
}

export function decodeBase64(data: string): Uint8Array<ArrayBuffer> {
	const binary = atob(data);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += CHUNK_SIZE) {
		const chunk = binary.slice(i, i + CHUNK_SIZE);
		for (let j = 0; j < chunk.length; j++) {
			bytes[i + j] = chunk.charCodeAt(j);
		}
	}
	return bytes;
}
