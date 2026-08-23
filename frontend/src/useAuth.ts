import { useCallback, useEffect, useState } from 'react';
import { fetchAuthStatus, login as apiLogin, logout as apiLogout, setupAdmin as apiSetup, setOnUnauthorized } from './api';

export type AuthPhase = 'loading' | 'setup' | 'login' | 'authenticated';

export function useAuth() {
	const [phase, setPhase] = useState<AuthPhase>('loading');

	const refresh = useCallback(async () => {
		try {
			const status = await fetchAuthStatus();
			if (!status.configured) setPhase('setup');
			else if (!status.authenticated) setPhase('login');
			else setPhase('authenticated');
		} catch {
			// ステータス取得に失敗した場合はログイン画面へ（安全側に倒す）
			setPhase('login');
		}
	}, []);

	// 401（認証切れ）を検出したらログイン画面へ戻すコールバックを登録
	useEffect(() => {
		setOnUnauthorized(() => setPhase('login'));
		return () => setOnUnauthorized(null);
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const setup = useCallback(
		async (id: string, password: string) => {
			await apiSetup(id, password);
			setPhase('authenticated');
		},
		[],
	);

	const login = useCallback(
		async (id: string, password: string) => {
			await apiLogin(id, password);
			setPhase('authenticated');
		},
		[],
	);

	const logout = useCallback(async () => {
		await apiLogout();
		setPhase('login');
	}, []);

	return { phase, refresh, setup, login, logout };
}
