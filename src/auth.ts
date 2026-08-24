import { encodeBase64, decodeBase64 } from '../shared/encoding';
import { kv } from './kv';

const ADMIN_PREFIX = '__admin__:';
const SESSION_PREFIX = '__session__:';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PBKDF2_ITERATIONS = 100000;

export interface AdminRecord {
	passwordHash: string;
	createdAt: number;
}

export interface SessionRecord {
	adminId: string;
	expiresAt: number;
}

export function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256',
		},
		keyMaterial,
		256,
	);
	const hash = new Uint8Array(bits);
	return `${encodeBase64(salt)}:${encodeBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltB64, hashB64] = stored.split(':');
	if (!saltB64 || !hashB64) return false;
	const salt = decodeBase64(saltB64);
	const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256',
		},
		keyMaterial,
		256,
	);
	const computed = encodeBase64(new Uint8Array(bits));
	return constantTimeEqual(computed, hashB64);
}

export function adminKey(id: string): string {
	return `${ADMIN_PREFIX}${id}`;
}

export function sessionKey(token: string): string {
	return `${SESSION_PREFIX}${token}`;
}

export async function createSession(env: Env, adminId: string): Promise<string> {
	const token = crypto.randomUUID();
	const record: SessionRecord = {
		adminId,
		expiresAt: Date.now() + SESSION_TTL_MS,
	};
	await kv(env).put(sessionKey(token), JSON.stringify(record), {
		expirationTtl: Math.floor(SESSION_TTL_MS / 1000),
	});
	return token;
}

export async function getSession(env: Env, token: string): Promise<string | null> {
	const raw = await kv(env).get(sessionKey(token));
	if (raw == null) return null;
	try {
		const record = JSON.parse(raw) as SessionRecord;
		if (record.expiresAt < Date.now()) {
			await kv(env).delete(sessionKey(token));
			return null;
		}
		// セッションの adminId が実際に存在する管理者かを検証する。
		// 管理者が削除済みの場合はセッションを無効化し、KV エントリもクリーンアップする。
		const admin = await getAdmin(env, record.adminId);
		if (admin == null) {
			await kv(env).delete(sessionKey(token));
			return null;
		}
		return record.adminId;
	} catch {
		return null;
	}
}

export async function deleteSession(env: Env, token: string): Promise<void> {
	await kv(env).delete(sessionKey(token));
}

export interface AdminEntry {
	id: string;
	createdAt: number;
}

export async function listAdminEntries(env: Env): Promise<AdminEntry[]> {
	const list = await kv(env).list({ prefix: ADMIN_PREFIX });
	const entries: AdminEntry[] = [];
	for (const key of list.keys) {
		const raw = await kv(env).get(key.name);
		if (raw == null) continue;
		try {
			const record = JSON.parse(raw) as AdminRecord;
			entries.push({
				id: key.name.slice(ADMIN_PREFIX.length),
				createdAt: record.createdAt,
			});
		} catch {
			// ignore malformed records
		}
	}
	return entries;
}

export async function getAdmin(env: Env, id: string): Promise<AdminRecord | null> {
	const raw = await kv(env).get(adminKey(id));
	if (raw == null) return null;
	try {
		return JSON.parse(raw) as AdminRecord;
	} catch {
		return null;
	}
}

export async function isConfigured(env: Env): Promise<boolean> {
	const list = await kv(env).list({ prefix: ADMIN_PREFIX, limit: 1 });
	return list.keys.length > 0;
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
	const result: Record<string, string> = {};
	if (!header) return result;
	for (const part of header.split(';')) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		const name = part.slice(0, idx).trim();
		const value = part.slice(idx + 1).trim();
		if (name) result[name] = value;
	}
	return result;
}

export const SESSION_COOKIE = 'session';
