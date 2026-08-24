import { useEffect, useRef, useState } from 'react';
import { Panel } from './Panel';
import { fetchModels, streamGenerate, type GenerateHandle, type ModelOption } from '../api';

interface GeneratePanelProps {
	open: boolean;
	onClose: () => void;
	onInsert: (html: string) => void;
	notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_PROMPT = '';
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

/**
 * モデル出力から markdown のコードフェンスを取り除く。
 * ```html ... ``` や ``` ... ``` を想定。
 */
function stripCodeFences(text: string): string {
	const trimmed = text.trim();
	const openMatch = trimmed.match(/^```(?:html)?\s*\n/i);
	if (!openMatch) return trimmed;
	const rest = trimmed.slice(openMatch[0].length);
	const closeMatch = rest.match(/\n```\s*$/);
	if (!closeMatch) return rest.trimEnd();
	return rest.slice(0, closeMatch.index).trimEnd();
}

export function GeneratePanel({ open, onClose, onInsert, notify }: GeneratePanelProps) {
	const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
	const [models, setModels] = useState<ModelOption[]>([]);
	const [selectedModel, setSelectedModel] = useState<string>('');
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [height, setHeight] = useState(DEFAULT_HEIGHT);
	const [useTailwind, setUseTailwind] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [output, setOutput] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [tokenCount, setTokenCount] = useState(0);

	const handleRef = useRef<GenerateHandle | null>(null);
	const outputRef = useRef<HTMLPreElement | null>(null);
	const promptRef = useRef<HTMLTextAreaElement | null>(null);
	const accumulatedRef = useRef('');

	// パネルを開き直したときに入力をリセットし、プロンプトにフォーカス
	useEffect(() => {
		if (open) {
			setPrompt(DEFAULT_PROMPT);
			setShowAdvanced(false);
			setWidth(DEFAULT_WIDTH);
			setHeight(DEFAULT_HEIGHT);
			setUseTailwind(true);
			setGenerating(false);
			setOutput('');
			setError(null);
			setTokenCount(0);
			accumulatedRef.current = '';
			handleRef.current = null;
			setTimeout(() => promptRef.current?.focus(), 0);
		}
	}, [open]);

	// パネルを開いたときにモデル一覧を取得し、デフォルトを選択
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		fetchModels()
			.then((list) => {
				if (cancelled) return;
				setModels(list);
				const def = list.find((m) => m.isDefault);
				setSelectedModel(def?.id ?? list[0]?.id ?? '');
			})
			.catch(() => {
				// fetch失敗時は空リストのまま（生成時にバリデーションで弾かれる）
			});
		return () => {
			cancelled = true;
		};
	}, [open]);

	// ストリーミング出力エリアを末尾に自動スクロール
	useEffect(() => {
		if (outputRef.current) {
			outputRef.current.scrollTop = outputRef.current.scrollHeight;
		}
	}, [output]);

	// パネルが閉じられたら進行中のストリームをキャンセル
	useEffect(() => {
		if (!open && handleRef.current) {
			handleRef.current.cancel();
			handleRef.current = null;
		}
	}, [open]);

	function handleGenerate() {
		if (generating) return;
		const trimmed = prompt.trim();
		if (!trimmed) return;

		setGenerating(true);
		setOutput('');
		setError(null);
		setTokenCount(0);
		accumulatedRef.current = '';

		handleRef.current = streamGenerate(
			{ prompt: trimmed, model: selectedModel, width, height, useTailwind },
			{
				onChunk: (token) => {
					accumulatedRef.current += token;
					setOutput(accumulatedRef.current);
					setTokenCount((c) => c + 1);
				},
				onDone: () => {
					const clean = stripCodeFences(accumulatedRef.current);
					handleRef.current = null;
					setGenerating(false);
					if (!clean) {
						setError('生成された HTML が空です。プロンプトを変えてもう一度お試しください。');
						return;
					}
					onInsert(clean);
					notify('AIでHTMLを生成し、エディタに挿入しました');
					onClose();
				},
				onError: (e) => {
					handleRef.current = null;
					setGenerating(false);
					setError(e.message || '生成に失敗しました');
				},
			},
		);
	}

	function handleCancel() {
		if (handleRef.current) {
			handleRef.current.cancel();
			handleRef.current = null;
		}
		setGenerating(false);
	}

	if (!open) return null;

	return (
		<Panel title="AI で OGP を生成" onClose={onClose} className="generate-panel">
			<div className="generate-form">
				<label className="field full">
					<span className="field-label">プロンプト</span>
					<textarea
						ref={promptRef}
						className="generate-prompt"
						value={prompt}
						rows={4}
						placeholder="例: ダーク系テック風で、リリースノート向けのOGP画像。ネオングリーンのアクセント。"
						spellCheck={false}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={(e) => {
							if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !generating && prompt.trim() && selectedModel) {
								e.preventDefault();
								handleGenerate();
							}
						}}
					/>
					<span className="generate-field-hint">Cmd / Ctrl + Enter で生成</span>
				</label>

				<div className="generate-model">
					<span className="field-label">モデル</span>
					<div className="segmented generate-segmented">
						{models.map((m) => (
							<button
								key={m.id}
								type="button"
								className={`segment ${selectedModel === m.id ? 'active' : ''}`}
								disabled={generating}
								onClick={() => setSelectedModel(m.id)}
							>
								{m.label}
							</button>
						))}
					</div>
					<span className="generate-model-hint">
						{models.find((m) => m.id === selectedModel)?.hint}
					</span>
				</div>

				<div className="generate-advanced">
					<button
						type="button"
						className="generate-advanced-toggle"
						aria-expanded={showAdvanced}
						onClick={() => setShowAdvanced((v) => !v)}
					>
						<svg
							viewBox="0 0 24 24"
							width="14"
							height="14"
							aria-hidden="true"
							style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}
						>
							<path fill="currentColor" d="M8 5a1 1 0 0 1 1.4 0L16 11.6 9.4 18a1 1 0 0 1-1.4-1.4L13.2 12 8 6.4A1 1 0 0 1 8 5Z" />
						</svg>
						詳細設定
					</button>
					{showAdvanced && (
						<>
							<div className="generate-size-row">
								<label className="generate-size-field">
									<span>幅</span>
									<input
										type="number"
										value={width}
										min={120}
										max={4096}
										disabled={generating}
										onChange={(e) => {
											const n = Number(e.target.value);
											if (!Number.isNaN(n)) setWidth(n);
										}}
									/>
								</label>
								<span className="x-mark">×</span>
								<label className="generate-size-field">
									<span>高さ</span>
									<input
										type="number"
										value={height}
										min={120}
										max={4096}
										disabled={generating}
										onChange={(e) => {
											const n = Number(e.target.value);
											if (!Number.isNaN(n)) setHeight(n);
										}}
									/>
								</label>
							</div>
							<label className="generate-toggle-field">
								<span className="generate-toggle-switch">
									<input
										type="checkbox"
										checked={useTailwind}
										disabled={generating}
										onChange={(e) => setUseTailwind(e.target.checked)}
									/>
									<span className="generate-toggle-track" aria-hidden="true">
										<span className="generate-toggle-thumb" />
									</span>
								</span>
								<span className="generate-toggle-text">
									<span className="generate-toggle-label">Tailwind CSS</span>
									<span className="generate-toggle-hint">
										{useTailwind ? 'ユーティリティクラスを使用' : 'プレーン CSS を使用'}
									</span>
								</span>
							</label>
						</>
					)}
				</div>

				{error && <p className="panel-error generate-error">{error}</p>}

				<div className="generate-actions">
					{generating ? (
						<button type="button" className="btn ghost" onClick={handleCancel}>
							キャンセル
						</button>
					) : (
						<button type="button" className="btn ghost" onClick={onClose}>
							閉じる
						</button>
					)}
					<button
						type="button"
						className="btn primary generate-submit"
						disabled={generating || !prompt.trim() || !selectedModel}
						onClick={handleGenerate}
					>
						{generating ? (
							<>
								<span className="spinner" />
								生成中…
							</>
						) : (
							<>
								<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
									<path
										fill="currentColor"
										d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2Zm6 12l.9 2.8L22 18l-3.1.9L18 22l-.9-3.1L14 18l3.1-.9L18 14Z"
									/>
								</svg>
								生成
							</>
						)}
					</button>
				</div>
			</div>

			{(generating || output) && (
				<div className="generate-output">
					<div className="generate-output-header">
						<span className="generate-output-label">生成中の HTML</span>
						{generating && (
							<span className="generate-output-meta">
								<span className="spinner" />
								{tokenCount} トークン
							</span>
						)}
					</div>
					<pre ref={outputRef} className="generate-output-body">
						{output}
						{generating && <span className="generate-cursor" aria-hidden="true" />}
					</pre>
				</div>
			)}
		</Panel>
	);
}