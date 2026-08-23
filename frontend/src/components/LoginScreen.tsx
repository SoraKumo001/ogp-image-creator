import { useState, type FormEvent } from 'react';

interface LoginScreenProps {
	onSubmit: (id: string, password: string) => Promise<void>;
}

export function LoginScreen({ onSubmit }: LoginScreenProps) {
	const [id, setId] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);

		if (!id.trim() || !password) {
			setError('ID とパスワードを入力してください');
			return;
		}

		setSubmitting(true);
		try {
			await onSubmit(id.trim(), password);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'ログインに失敗しました');
			setSubmitting(false);
		}
	}

	return (
		<div className="auth-screen">
			<div className="auth-card">
				<div className="auth-brand">
					<div className="logo-mark">OG</div>
					<div className="logo-text">
						OGP <span>Studio</span>
					</div>
				</div>

				<h1 className="auth-title">ログイン</h1>
				<p className="auth-desc">エディタを利用するにはログインが必要です。</p>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label className="field full">
						<span className="field-label">ID</span>
						<input
							type="text"
							value={id}
							autoComplete="username"
							autoFocus
							placeholder="ID を入力"
							onChange={(e) => setId(e.target.value)}
						/>
					</label>

					<label className="field full">
						<span className="field-label">パスワード</span>
						<input
							type="password"
							value={password}
							autoComplete="current-password"
							placeholder="パスワードを入力"
							onChange={(e) => setPassword(e.target.value)}
						/>
					</label>

					{error && <p className="auth-error">{error}</p>}

					<button type="submit" className="btn primary auth-submit" disabled={submitting}>
						{submitting ? <span className="spinner" aria-hidden="true" /> : null}
						{submitting ? 'ログイン中…' : 'ログイン'}
					</button>
				</form>
			</div>
		</div>
	);
}
