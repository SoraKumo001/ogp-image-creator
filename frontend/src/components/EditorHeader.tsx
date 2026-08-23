import { useEffect, useRef, useState } from 'react';

interface EditorHeaderProps {
	templateName: string;
	currentId: string | null;
	dirty: boolean;
	saving: boolean;
	onRename: (name: string) => void;
	onSave: () => void;
	onOpenTemplates: () => void;
}

function NameField({
	name,
	currentId,
	dirty,
	onRename,
}: {
	name: string;
	currentId: string | null;
	dirty: boolean;
	onRename: (name: string) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(name);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!editing) setValue(name);
	}, [name, editing]);

	useEffect(() => {
		if (editing) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [editing]);

	function commit() {
		setEditing(false);
		onRename(value);
	}

	const status = !currentId ? 'unsaved' : dirty ? 'dirty' : 'saved';
	const statusLabel = !currentId ? '未保存' : dirty ? '未保存の変更' : '保存済み';

	return (
		<div className="name-field">
			<div className="name-field-row">
				<span className={`doc-status ${status}`} aria-hidden="true" />
				{editing ? (
					<input
						ref={inputRef}
						className="doc-name-input"
						type="text"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onBlur={commit}
						onKeyDown={(e) => {
							if (e.key === 'Enter') commit();
							if (e.key === 'Escape') {
								setValue(name);
								setEditing(false);
							}
						}}
					/>
				) : (
					<button type="button" className="doc-name" title="クリックで名前を変更" onClick={() => setEditing(true)}>
						{name}
					</button>
				)}
			</div>
			<span className="doc-status-label">{statusLabel}</span>
		</div>
	);
}

export function EditorHeader({ templateName, currentId, dirty, saving, onRename, onSave, onOpenTemplates }: EditorHeaderProps) {
	return (
		<div className="pane-label editor-header">
			<button type="button" className="btn small" onClick={onOpenTemplates}>
				<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
					<path
						fill="currentColor"
						d="M4 5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm2 0v13h12V7H6a2 2 0 0 1-2-2Zm6 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
					/>
				</svg>
				<span className="btn-label">読み込む</span>
			</button>

			<span className="pane-title">HTML</span>

			<NameField name={templateName} currentId={currentId} dirty={dirty} onRename={onRename} />

			<div className="editor-header-actions">
				<button type="button" className="btn primary small" onClick={onSave} disabled={saving}>
					{saving ? (
						<span className="spinner" aria-hidden="true" />
					) : (
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
							<path
								fill="currentColor"
								d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6H5Zm2 3h6v4h4v9H7V6Zm2 8h6v2H9v-2Zm0 4h6v2H9v-2Z"
							/>
						</svg>
					)}
					<span className="btn-label">{saving ? '保存中…' : currentId ? '上書き保存' : '保存'}</span>
				</button>
			</div>
		</div>
	);
}
