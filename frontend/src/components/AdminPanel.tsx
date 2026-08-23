import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createAdmin, deleteAdmin, fetchAdmins } from '../api';
import { formatDate } from '../utils';
import { Panel } from './Panel';
import { DeleteIcon } from './icons';
import type { AdminSummary } from '../types';

interface AdminPanelProps {
	open: boolean;
	onClose: () => void;
	onLogout: () => void;
}

export function AdminPanel({ open, onClose, onLogout }: AdminPanelProps) {
	const [admins, setAdmins] = useState<AdminSummary[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [newId, setNewId] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [adding, setAdding] = useState(false);
	const [addError, setAddError] = useState<string | null>(null);
	const loadedRef = useRef(false);

	useEffect(() => {
		if (!open || loadedRef.current) return;
		loadedRef.current = true;
		void load();
	}, [open]);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			setAdmins(await fetchAdmins());
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	async function handleAdd(e: FormEvent) {
		e.preventDefault();
		setAddError(null);
		if (!newId.trim() || !newPassword) {
			setAddError('ID とパスワードを入力してください');
			return;
		}
		setAdding(true);
		try {
			await createAdmin(newId.trim(), newPassword);
			setNewId('');
			setNewPassword('');
			setAdmins(await fetchAdmins());
		} catch (err) {
			setAddError(err instanceof Error ? err.message : '追加に失敗しました');
		} finally {
			setAdding(false);
		}
	}

	async function handleDelete(id: string) {
		if (!window.confirm(`管理者「${id}」を削除しますか？`)) return;
		try {
			await deleteAdmin(id);
			setAdmins((prev) => prev.filter((a) => a.id !== id));
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	if (!open) return null;

	const isLast = admins.length <= 1;

	return (
		<Panel title="管理者の管理" onClose={onClose} className="admin-panel">
			{loading && <p className="panel-hint">読み込み中…</p>}
			{error && <p className="panel-error">{error}</p>}

			{!loading && !error && (
				<ul className="admin-list">
					{admins.map((a) => (
						<li key={a.id} className="admin-item">
							<div className="admin-info">
								<span className="admin-id">{a.id}</span>
								<span className="admin-date">{formatDate(a.createdAt)}</span>
							</div>
							<button
								type="button"
								className="icon-btn danger"
								onClick={() => handleDelete(a.id)}
								disabled={isLast}
								title={isLast ? '最後の管理者は削除できません' : '削除'}
								aria-label={`${a.id} を削除`}
							>
								<DeleteIcon />
							</button>
						</li>
					))}
				</ul>
			)}

			<form className="admin-add" onSubmit={handleAdd}>
				<h3 className="admin-add-title">管理者を追加</h3>
				<div className="admin-add-row">
					<input type="text" value={newId} placeholder="ID" autoComplete="off" onChange={(e) => setNewId(e.target.value)} />
					<input
						type="password"
						value={newPassword}
						placeholder="パスワード"
						autoComplete="new-password"
						onChange={(e) => setNewPassword(e.target.value)}
					/>
					<button type="submit" className="btn primary" disabled={adding}>
						{adding ? '追加中…' : '追加'}
					</button>
				</div>
				{addError && <p className="panel-error">{addError}</p>}
			</form>

			<div className="admin-footer">
				<button type="button" className="btn ghost" onClick={onLogout}>
					<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
						<path
							fill="currentColor"
							d="M10 3a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm5.7 2.3a1 1 0 0 1 1.4 0A9 9 0 1 1 3 12a1 1 0 1 1 2 0 7 7 0 1 0 2.3-5.3 1 1 0 0 1 0-1.4Z"
						/>
					</svg>
					ログアウト
				</button>
			</div>
		</Panel>
	);
}
