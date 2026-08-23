import { useEffect, useState } from 'react';
import { deleteTemplate, fetchTemplates } from '../api';
import { formatDate } from '../utils';
import { Panel } from './Panel';
import { DeleteIcon } from './icons';
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
		<Panel title="テンプレート" onClose={onClose}>
			{loading && <p className="panel-hint">読み込み中…</p>}
			{error && <p className="panel-error">{error}</p>}

			{!loading && !error && templates.length === 0 && <p className="panel-hint">保存済みのテンプレートはまだありません。</p>}

			<ul className="template-list">
				{templates.map((t) => (
					<li key={t.id} className="template-item">
						<button type="button" className="template-main" onClick={() => onLoad(t.id)}>
							<span className="template-name">{t.name}</span>
							<span className="template-date">{formatDate(t.updatedAt)}</span>
						</button>
						<button type="button" className="icon-btn danger" onClick={() => handleDelete(t.id)} aria-label={`${t.name} を削除`}>
							<DeleteIcon />
						</button>
					</li>
				))}
			</ul>
		</Panel>
	);
}
