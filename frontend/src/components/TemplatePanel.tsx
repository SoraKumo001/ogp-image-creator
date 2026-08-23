import { useEffect, useState } from 'react';
import { deleteTemplate, fetchTemplates } from '../api';
import type { TemplateSummary } from '../types';

interface TemplatePanelProps {
  open: boolean;
  onClose: () => void;
  onLoad: (id: string) => void;
}

export function TemplatePanel({ open, onClose, onLoad }: TemplatePanelProps) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			setTemplates(await fetchTemplates());
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete(id: string) {
		if (!window.confirm('このテンプレートを削除しますか？')) return;
		try {
			await deleteTemplate(id);
			setTemplates((prev) => prev.filter((t) => t.id !== id));
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	if (!open) return null;

	return (
		<div className="overlay" onClick={onClose}>
			<div className="panel" onClick={(e) => e.stopPropagation()}>
				<header className="panel-header">
					<h2>テンプレート</h2>
					<button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
						<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
							<path fill="currentColor" d="M5.3 5.3a1 1 0 0 1 1.4 0L12 10.6l5.3-5.3a1 1 0 1 1 1.4 1.4L13.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 0 1-1.4-1.4L10.6 12 5.3 6.7a1 1 0 0 1 0-1.4Z" />
						</svg>
					</button>
				</header>

				<div className="panel-body">
					{loading && <p className="panel-hint">読み込み中…</p>}
					{error && <p className="panel-error">{error}</p>}

					{!loading && !error && templates.length === 0 && (
						<p className="panel-hint">保存済みのテンプレートはまだありません。</p>
					)}

					<ul className="template-list">
						{templates.map((t) => (
							<li key={t.id} className="template-item">
								<button type="button" className="template-main" onClick={() => onLoad(t.id)}>
									<span className="template-name">{t.name}</span>
									<span className="template-date">{formatDate(t.updatedAt)}</span>
								</button>
								<button
									type="button"
									className="icon-btn danger"
									onClick={() => handleDelete(t.id)}
									aria-label={`${t.name} を削除`}
								>
									<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
										<path fill="currentColor" d="M7 4a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h1v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8h1a1 1 0 1 0 0-2h-2V5a1 1 0 0 0-1-1H7Zm2 5a1 1 0 0 1 2 0v6a1 1 0 0 1-2 0V9Zm4 0a1 1 0 0 1 2 0v6a1 1 0 0 1-2 0V9Z" />
									</svg>
								</button>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleString('ja-JP', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}
