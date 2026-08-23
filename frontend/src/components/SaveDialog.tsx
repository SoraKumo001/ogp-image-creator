import { useEffect, useRef, useState } from 'react';

interface SaveDialogProps {
	open: boolean;
	defaultName: string;
	onCancel: () => void;
	onConfirm: (name: string) => void;
}

export function SaveDialog({ open, defaultName, onCancel, onConfirm }: SaveDialogProps) {
	const [name, setName] = useState(defaultName);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) {
			setName(defaultName);
			setTimeout(() => inputRef.current?.select(), 0);
		}
	}, [open, defaultName]);

	if (!open) return null;

	return (
		<div className="overlay" onClick={onCancel}>
			<div className="panel dialog" onClick={(e) => e.stopPropagation()}>
				<header className="panel-header">
					<h2>テンプレートを保存</h2>
				</header>
				<div className="panel-body">
					<label className="field full">
						<span className="field-label">テンプレート名</span>
						<input
							ref={inputRef}
							type="text"
							value={name}
							placeholder="例: 新着記事 OGP"
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') onConfirm(name.trim());
								if (e.key === 'Escape') onCancel();
							}}
						/>
					</label>
					<div className="dialog-actions">
						<button type="button" className="btn ghost" onClick={onCancel}>
							キャンセル
						</button>
						<button
							type="button"
							className="btn primary"
							disabled={!name.trim()}
							onClick={() => onConfirm(name.trim())}
						>
							保存する
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
