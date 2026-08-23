interface PreviewPaneProps {
	status: 'idle' | 'rendering' | 'done' | 'error';
	imageUrl?: string;
	error?: string;
	width: number;
	height: number;
	format: string;
}

export function PreviewPane({ status, imageUrl, error, width, height, format }: PreviewPaneProps) {
	return (
		<section className="preview-pane">
			<div className="preview-header">
				<span className="preview-title">プレビュー</span>
				<span className="preview-meta">
					{width} × {height} · {format.toUpperCase()}
				</span>
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
					<img
						key={imageUrl}
						src={imageUrl}
						alt="OGP プレビュー"
						className="preview-image"
						draggable={false}
					/>
				)}
			</div>
		</section>
	);
}
