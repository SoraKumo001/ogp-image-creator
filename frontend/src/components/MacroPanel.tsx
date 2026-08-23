import { useState } from 'react';
import type { MacroParams } from '../macros';

interface MacroPanelProps {
	keys: string[];
	params: MacroParams;
	onChange: (key: string, value: string) => void;
	style?: React.CSSProperties;
}

export function MacroPanel({ keys, params, onChange, style }: MacroPanelProps) {
	const [open, setOpen] = useState(true);

	if (keys.length === 0) {
		return (
			<div className="macro-panel empty" style={style}>
				<span className="macro-hint">
					マクロはありません。HTML に <code>{'{{key}}'}</code> を書くと、ここで値を設定できます。
				</span>
			</div>
		);
	}

	return (
		<div className="macro-panel" style={style}>
			<div className="macro-header">
				<span className="macro-title">パラメータ</span>
				<span className="macro-count">{keys.length}</span>
				<button
					type="button"
					className="icon-btn macro-toggle"
					onClick={() => setOpen((v) => !v)}
					aria-label={open ? 'パラメータを閉じる' : 'パラメータを開く'}
					aria-expanded={open}
				>
					<svg
						viewBox="0 0 24 24"
						width="16"
						height="16"
						aria-hidden="true"
						style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
					>
						<path
							fill="currentColor"
							d="M6.3 9.3a1 1 0 0 1 1.4 0L12 13.6l4.3-4.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4Z"
						/>
					</svg>
				</button>
			</div>

			{open && (
				<div className="macro-fields">
					{keys.map((key) => (
						<label key={key} className="macro-field">
							<span className="macro-key">{`{{${key}}}`}</span>
							<input
								type="text"
								value={params[key] ?? ''}
								placeholder={key}
								spellCheck={false}
								onChange={(e) => onChange(key, e.target.value)}
							/>
						</label>
					))}
				</div>
			)}
		</div>
	);
}
