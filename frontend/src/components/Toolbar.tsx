interface ToolbarProps {
	onOpenSamples: () => void;
	onOpenAdmin: () => void;
	onOpenApiDocs: () => void;
}

export function Toolbar({ onOpenSamples, onOpenAdmin, onOpenApiDocs }: ToolbarProps) {
	return (
		<header className="toolbar">
			<div className="toolbar-brand">
				<div className="logo-mark">OG</div>
				<div className="logo-text">
					OGP <span>Image</span> Creator
				</div>
			</div>

			<div className="toolbar-controls">
				<div className="control-group actions">
					<button type="button" className="btn ghost" onClick={onOpenApiDocs}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
							<path
								fill="currentColor"
								d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 2 5 5h-5V4ZM8 13h8v2H8v-2Zm0 4h8v2H8v-2Z"
							/>
						</svg>
						<span className="btn-label">API</span>
					</button>
					<button type="button" className="btn ghost" onClick={onOpenSamples}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
							<path
								fill="currentColor"
								d="M12 2 2 7l10 5 10-5-10-5ZM4.5 12.5 2 14l10 5 10-5-2.5-1.5L12 16l-7.5-3.5Zm0 5L2 19l10 5 10-5-2.5-1.5L12 21l-7.5-3.5Z"
							/>
						</svg>
						<span className="btn-label">サンプル</span>
					</button>
					<button type="button" className="icon-btn" onClick={onOpenAdmin} aria-label="管理者の管理" title="管理者の管理">
						<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
							<path
								fill="currentColor"
								d="M12 2a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 8c-3.3 0-6 1.8-6 4v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2c0-2.2-2.7-4-6-4Zm0 2c2.4 0 4 1.2 4 2v1H8v-1c0-.8 1.6-2 4-2Z"
							/>
						</svg>
					</button>
				</div>
			</div>
		</header>
	);
}
