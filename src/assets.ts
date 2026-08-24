/**
 * 画像アセットの KV アクセス層。
 * キー設計（プレフィックス等）の詳細をここに閉じ込め、ルート層からは
 * ドメイン操作のみを呼び出すようにする。
 *
 * キーは `__asset__:` プレフィックスを付ける。`listTemplates` は `__` 始まりの
 * キーを除外するため、テンプレート一覧と衝突しない。
 */

import { kv } from './kv';

export { encodeBase64, decodeBase64 } from '../shared/encoding';

export interface AssetSummary {
	id: string;
	name: string;
	contentType: string;
	size: number;
	updatedAt: number;
}

export interface AssetRecord {
	data: string;
	contentType: string;
	name: string;
	size: number;
}

export interface AssetMetadata {
	name: string;
	contentType: string;
	size: number;
	updatedAt: number;
}

const ASSET_PREFIX = '__asset__:';

export async function putAsset(env: Env, id: string, record: AssetRecord): Promise<void> {
	const metadata: AssetMetadata = {
		name: record.name,
		contentType: record.contentType,
		size: record.size,
		updatedAt: Date.now(),
	};
	await kv(env).put(ASSET_PREFIX + id, record.data, { metadata });
}

export async function getAsset(env: Env, id: string): Promise<(AssetRecord & AssetMetadata) | null> {
	const entry = await kv(env).getWithMetadata(ASSET_PREFIX + id);
	if (entry.value == null) return null;
	const meta = (entry.metadata ?? {}) as Partial<AssetMetadata>;
	return {
		data: entry.value,
		contentType: meta.contentType ?? 'application/octet-stream',
		name: meta.name ?? id,
		size: meta.size ?? 0,
		updatedAt: meta.updatedAt ?? 0,
	};
}

export async function deleteAsset(env: Env, id: string): Promise<void> {
	await kv(env).delete(ASSET_PREFIX + id);
}

export async function listAssets(env: Env): Promise<AssetSummary[]> {
	const list = await kv(env).list({ prefix: ASSET_PREFIX });
	return list.keys.map((key) => {
		const meta = (key.metadata ?? {}) as Partial<AssetMetadata>;
		return {
			id: key.name.slice(ASSET_PREFIX.length),
			name: meta.name ?? key.name,
			contentType: meta.contentType ?? 'application/octet-stream',
			size: meta.size ?? 0,
			updatedAt: meta.updatedAt ?? 0,
		};
	});
}
