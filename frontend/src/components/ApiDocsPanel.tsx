import { useState } from 'react';

interface ApiDocsPanelProps {
	open: boolean;
	onClose: () => void;
	currentTemplateId: string | null;
}

interface CodeBlockProps {
	label: string;
	code: string;
}

function CodeBlock({ label, code }: CodeBlockProps) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// クリップボード不可の環境では何もしない
		}
	}

	return (
		<div className="code-block">
			<div className="code-block-header">
				<span className="code-block-label">{label}</span>
				<button type="button" className="btn ghost small" onClick={copy}>
					{copied ? 'コピーしました' : 'コピー'}
				</button>
			</div>
			<pre className="code-block-body">
				<code>{code}</code>
			</pre>
		</div>
	);
}

export function ApiDocsPanel({ open, onClose, currentTemplateId }: ApiDocsPanelProps) {
	if (!open) return null;

	const origin = location.origin;
	const renderUrl = `${origin}/api/render`;
	const ogpBaseUrl = `${origin}/ogp/:id`;

	const renderBody = JSON.stringify(
		{
			html: '<h1>{{title}}</h1>',
			width: 1200,
			height: 630,
			format: 'png',
			params: { title: 'こんにちは' },
		},
		null,
		2,
	);

	const curlExample = `curl -X POST ${renderUrl} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ html: '<h1>Hello</h1>', width: 1200, height: 630, format: 'png' })}'`;

	return (
		<div className="overlay" onClick={onClose}>
			<div className="panel api-docs-panel" onClick={(e) => e.stopPropagation()}>
				<header className="panel-header">
					<h2>API ドキュメント</h2>
					<button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
						<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
							<path fill="currentColor" d="M5.3 5.3a1 1 0 0 1 1.4 0L12 10.6l5.3-5.3a1 1 0 1 1 1.4 1.4L13.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 0 1-1.4-1.4L10.6 12 5.3 6.7a1 1 0 0 1 0-1.4Z" />
						</svg>
					</button>
				</header>

				<div className="panel-body api-docs-body">
					<p className="api-docs-intro">
						画像生成 API は認証不要で、外部のアプリやスクリプトから直接呼び出せます。
					</p>

					<section className="api-section">
						<div className="api-section-head">
							<span className="api-method post">POST</span>
							<code className="api-endpoint">{renderUrl}</code>
						</div>
						<p className="api-section-desc">
							HTML を直接渡して画像を生成します。レスポンスは画像バイナリ（<code>image/png</code> など）です。
						</p>

						<h4 className="api-subtitle">リクエストボディ</h4>
						<CodeBlock label="JSON" code={renderBody} />

						<h4 className="api-subtitle">curl 例</h4>
						<CodeBlock label="Shell" code={curlExample} />

						<table className="api-table">
							<thead>
								<tr>
									<th>フィールド</th>
									<th>型</th>
									<th>説明</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td><code>html</code></td>
									<td>string</td>
									<td>レンダリングする HTML（必須）</td>
								</tr>
								<tr>
									<td><code>width</code></td>
									<td>number</td>
									<td>画像の幅（省略時 1200）</td>
								</tr>
								<tr>
									<td><code>height</code></td>
									<td>number</td>
									<td>画像の高さ（省略時 630）</td>
								</tr>
								<tr>
									<td><code>format</code></td>
									<td>string</td>
									<td><code>png</code> / <code>webp</code> / <code>svg</code></td>
								</tr>
								<tr>
									<td><code>params</code></td>
									<td>object</td>
									<td><code>{'{{key}}'}</code> マクロの置換値</td>
								</tr>
							</tbody>
						</table>
					</section>

					<section className="api-section">
						<div className="api-section-head">
							<span className="api-method get">GET</span>
							<code className="api-endpoint">{ogpBaseUrl}</code>
						</div>
						<p className="api-section-desc">
							保存済みテンプレートを画像として配信します。<code>:id</code> は保存時に発行されるテンプレート ID です。
						</p>

						{currentTemplateId && (
							<div className="api-current">
								<span className="api-current-label">現在のテンプレート</span>
								<CodeBlock label="URL" code={`${origin}/ogp/${currentTemplateId}`} />
							</div>
						)}

						<h4 className="api-subtitle">クエリパラメータ</h4>
						<table className="api-table">
							<thead>
								<tr>
									<th>パラメータ</th>
									<th>説明</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td><code>w</code></td>
									<td>画像の幅（省略時 1200）</td>
								</tr>
								<tr>
									<td><code>h</code></td>
									<td>画像の高さ（省略時 630）</td>
								</tr>
								<tr>
									<td><code>format</code></td>
									<td><code>png</code> / <code>webp</code> / <code>svg</code></td>
								</tr>
								<tr>
									<td><code>その他</code></td>
									<td>マクロキー名をそのまま指定（例: <code>?title=Hello</code>）</td>
								</tr>
							</tbody>
						</table>
					</section>
				</div>
			</div>
		</div>
	);
}
