import type { Context, MiddlewareHandler } from 'hono';
import { getSession, parseCookies, SESSION_COOKIE } from './auth';
import type { AppEnv } from './types';

// セッション Cookie を生成する。`Secure` 属性は HTTPS 接続時のみ付与する。
// ローカル開発（http://localhost）では Secure を付けるとブラウザが Cookie を
// 保存せず、認証が成立しなくなるため、接続プロトコルに応じて切り替える。
export function sessionCookieHeader(c: Context, token: string, maxAge: number): string {
	const secure = c.req.url.startsWith('https://');
	const secureAttr = secure ? '; Secure' : '';
	return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax${secureAttr}; Path=/; Max-Age=${maxAge}`;
}

// 認証ミドルウェア: /api/templates* と /api/proxy を保護
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
	const cookies = parseCookies(c.req.header('Cookie'));
	const token = cookies[SESSION_COOKIE];
	if (!token) {
		return c.json({ error: 'unauthorized' }, 401);
	}
	const adminId = await getSession(c.env, token);
	if (adminId == null) {
		return c.json({ error: 'unauthorized' }, 401);
	}
	c.set('adminId', adminId);
	await next();
};
