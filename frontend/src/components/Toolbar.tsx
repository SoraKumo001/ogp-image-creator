import type { RenderSettings } from '../types';

interface ToolbarProps {
	settings: RenderSettings;
	onSettingsChange: (settings: RenderSettings) => void;
	onSave: () => void;
	onDownload: () => void;
	onOpenTemplates: () => void;
	onOpenAdmin: () => void;
	onOpenApiDocs: () => void;
	saving: boolean;
}

const FORMATS: { value: RenderSettings['format']; label: string }[] = [
	{ value: 'png', label: 'PNG' },
	{ value: 'webp', label: 'WebP' },
	{ value: 'svg', label: 'SVG' },
];

function NumberField({
	label,
	value,
	min,
	max,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	onChange: (v: number) => void;
}) {
	return (
		<label className="field">
			<span className="field-label">{label}</span>
			<input
				type="number"
				value={value}
				min={min}
				max={max}
				onChange={(e) => {
					const n = Number(e.target.value);
					if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
				}}
			/>
		</label>
	);
}

export function Toolbar({ settings, onSettingsChange, onSave, onDownload, onOpenTemplates, onOpenAdmin, onOpenApiDocs, saving }: ToolbarProps) {
	return (
		<header className="toolbar">
			<div className="toolbar-brand">
				<div className="logo-mark">OG</div>
				<div className="logo-text">
					OGP <span>Studio</span>
				</div>
			</div>

			<div className="toolbar-controls">
				<div className="control-group">
					<NumberField
						label="幅"
						value={settings.width}
						min={120}
						max={4096}
						onChange={(w) => onSettingsChange({ ...settings, width: w })}
					/>
					<span className="x-mark">×</span>
					<NumberField
						label="高さ"
						value={settings.height}
						min={120}
						max={4096}
						onChange={(h) => onSettingsChange({ ...settings, height: h })}
					/>
				</div>

				<div className="control-group">
					<div className="segmented">
						{FORMATS.map((f) => (
							<button
								key={f.value}
								type="button"
								className={`segment ${settings.format === f.value ? 'active' : ''}`}
								onClick={() => onSettingsChange({ ...settings, format: f.value })}
							>
								{f.label}
							</button>
						))}
					</div>
				</div>

				<div className="control-group actions">
					<button type="button" className="btn ghost" onClick={onOpenApiDocs}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
							<path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 2 5 5h-5V4ZM8 13h8v2H8v-2Zm0 4h8v2H8v-2Z" />
						</svg>
						<span className="btn-label">API</span>
					</button>
					<button type="button" className="btn ghost" onClick={onOpenTemplates}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
							<path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm2 0v13h12V7H6a2 2 0 0 1-2-2Zm6 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
						</svg>
						<span className="btn-label">テンプレート</span>
					</button>
					<button type="button" className="btn" onClick={onDownload}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
							<path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1ZM4 19a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" />
						</svg>
						<span className="btn-label">ダウンロード</span>
					</button>
					<button type="button" className="btn primary" onClick={onSave} disabled={saving}>
						{saving ? (
							<span className="spinner" aria-hidden="true" />
						) : (
							<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
								<path fill="currentColor" d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6H5Zm2 3h6v4h4v9H7V6Zm2 8h6v2H9v-2Zm0 4h6v2H9v-2Z" />
							</svg>
						)}
						<span className="btn-label">{saving ? '保存中…' : '保存'}</span>
					</button>
					<button type="button" className="icon-btn" onClick={onOpenAdmin} aria-label="管理者の管理" title="管理者の管理">
						<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
							<path fill="currentColor" d="M12 2a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 8c-3.3 0-6 1.8-6 4v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2c0-2.2-2.7-4-6-4Zm0 2c2.4 0 4 1.2 4 2v1H8v-1c0-.8 1.6-2 4-2Z" />
						</svg>
					</button>
				</div>
			</div>
		</header>
	);
}
