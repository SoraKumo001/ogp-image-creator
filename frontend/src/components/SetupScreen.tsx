import { useState, type FormEvent } from 'react';

interface SetupScreenProps {
	onSubmit: (id: string, password: string) => Promise<void>;
}

export function SetupScreen({ onSubmit }: SetupScreenProps) {
	const [id, setId] = useState('');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);

		if (!id.trim()) {
			setError('ID を入力してください');
			return;
		}
		if (password.length < 4) {
			setError('パスワードは 4 文字以上で入力してください');
			return;
		}
		if (password !== confirm) {
			setError('パスワードが一致しません');
			return;
		}

		setSubmitting(true);
		try {
			await onSubmit(id.trim(), password);
		} catch (err) {
			setError(err instanceof Error ? err.message : '設定に失敗しました');
			setSubmitting(false);
		}
	}

	return (
		<div className="auth-screen">
			<div className="auth-card">
				<div className="auth-brand">
					<div className="logo-mark">OG</div>
					<div className="logo-text">
						OGP <span>Image</span> Creator
					</div>
				</div>

				<h1 className="auth-title">はじめに管理者を設定</h1>
				<p className="auth-desc">エディタを利用するための管理者アカウントを作成します。この ID とパスワードでログインしてください。</p>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label className="field full">
						<span className="field-label">ID</span>
						<input
							type="text"
							value={id}
							autoComplete="username"
							autoFocus
							placeholder="例: admin"
							onChange={(e) => setId(e.target.value)}
						/>
					</label>

					<label className="field full">
						<span className="field-label">パスワード</span>
						<input
							type="password"
							value={password}
							autoComplete="new-password"
							placeholder="4 文字以上"
							onChange={(e) => setPassword(e.target.value)}
						/>
					</label>

					<label className="field full">
						<span className="field-label">パスワード（確認）</span>
						<input
							type="password"
							value={confirm}
							autoComplete="new-password"
							placeholder="もう一度入力"
							onChange={(e) => setConfirm(e.target.value)}
						/>
					</label>

					{error && <p className="auth-error">{error}</p>}

					<button type="submit" className="btn primary auth-submit" disabled={submitting}>
						{submitting ? <span className="spinner" aria-hidden="true" /> : null}
						{submitting ? '設定中…' : '設定して開始'}
					</button>
				</form>
			</div>
		</div>
	);
}
