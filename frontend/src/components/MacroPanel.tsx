import { useState } from 'react';
import type { MacroParams } from '../macros';
import type { RenderSettings } from '../types';

type TabId = 'params' | 'settings';

const FORMATS: { value: RenderSettings['format']; label: string }[] = [
	{ value: 'png', label: 'PNG' },
	{ value: 'webp', label: 'WebP' },
	{ value: 'svg', label: 'SVG' },
];

interface MacroPanelProps {
	keys: string[];
	params: MacroParams;
	onChange: (key: string, value: string) => void;
	settings: RenderSettings;
	onSettingsChange: (settings: RenderSettings) => void;
	slug: string;
	onSlugChange: (slug: string) => void;
	style?: React.CSSProperties;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="field-row">
			<span className="field-row-label">{label}</span>
			<div className="field-row-value">{children}</div>
		</div>
	);
}

function NumberInput({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
	return (
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
	);
}

export function MacroPanel({ keys, params, onChange, settings, onSettingsChange, slug, onSlugChange, style }: MacroPanelProps) {
	const [open, setOpen] = useState(true);
	const [tab, setTab] = useState<TabId>('params');

	const TABS: { id: TabId; label: string }[] = [
		{ id: 'params', label: 'パラメータ' },
		{ id: 'settings', label: '設定' },
	];

	return (
		<div className="macro-panel" style={style}>
			<div className="macro-header">
				<div className="macro-tabs" role="tablist">
					{TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							role="tab"
							aria-selected={tab === t.id}
							className={`macro-tab ${tab === t.id ? 'active' : ''}`}
							onClick={() => setTab(t.id)}
						>
							{t.label}
							{t.id === 'params' && keys.length > 0 && <span className="macro-count">{keys.length}</span>}
						</button>
					))}
				</div>
				<button
					type="button"
					className="icon-btn macro-toggle"
					onClick={() => setOpen((v) => !v)}
					aria-label={open ? 'パネルを閉じる' : 'パネルを開く'}
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
				<div className="macro-body">
					{tab === 'params' &&
						(keys.length === 0 ? (
							<div className="macro-hint">
								マクロはありません。HTML に <code>{'{{key}}'}</code> を書くと、ここで値を設定できます。
							</div>
						) : (
							<div className="macro-fields">
								{keys.map((key) => (
									<FieldRow key={key} label={`{{${key}}}`}>
										<input
											type="text"
											value={params[key] ?? ''}
											placeholder={key}
											spellCheck={false}
											onChange={(e) => onChange(key, e.target.value)}
										/>
									</FieldRow>
								))}
							</div>
						))}

					{tab === 'settings' && (
						<div className="macro-fields settings-fields">
							<FieldRow label="スラッグ">
								<input
									type="text"
									value={slug}
									placeholder="例: my-ogp（空欄なら自動生成）"
									spellCheck={false}
									onChange={(e) => onSlugChange(e.target.value)}
								/>
							</FieldRow>

							<FieldRow label="サイズ">
								<div className="size-inputs">
									<NumberInput value={settings.width} min={120} max={4096} onChange={(w) => onSettingsChange({ ...settings, width: w })} />
									<span className="x-mark">×</span>
									<NumberInput
										value={settings.height}
										min={120}
										max={4096}
										onChange={(h) => onSettingsChange({ ...settings, height: h })}
									/>
								</div>
							</FieldRow>

							<FieldRow label="形式">
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
							</FieldRow>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
