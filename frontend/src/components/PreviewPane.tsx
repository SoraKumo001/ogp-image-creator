interface PreviewPaneProps {
	status: 'idle' | 'rendering' | 'done' | 'error';
	imageUrl?: string;
	error?: string;
	width: number;
	height: number;
	format: string;
	onDownload: () => void;
}

export function PreviewPane({ status, imageUrl, error, width, height, format, onDownload }: PreviewPaneProps) {
	return (
		<section className="preview-pane">
			<div className="preview-header">
				<span className="preview-title">プレビュー</span>
				<span className="preview-meta">
					{width} × {height} · {format.toUpperCase()}
				</span>
				<button type="button" className="btn small" onClick={onDownload} disabled={status !== 'done'}>
					<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
						<path
							fill="currentColor"
							d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1ZM4 19a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z"
						/>
					</svg>
					<span className="btn-label">ダウンロード</span>
				</button>
			</div>

			<div className="preview-stage">
				{status === 'rendering' && (
					<div className="preview-state">
						<div className="preview-spinner" />
						<p>レンダリング中…</p>
					</div>
				)}

				{status === 'error' && (
					<div className="preview-state error">
						<div className="error-icon">!</div>
						<p>レンダリングに失敗しました</p>
						{error && <code>{error}</code>}
					</div>
				)}

				{status === 'idle' && (
					<div className="preview-state">
						<p>左のエディタで HTML を編集すると、ここにプレビューが表示されます。</p>
					</div>
				)}

				{status === 'done' && imageUrl && (
					<img key={imageUrl} src={imageUrl} alt="OGP プレビュー" className="preview-image" draggable={false} />
				)}
			</div>
		</section>
	);
}
