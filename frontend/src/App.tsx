import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTemplate, saveTemplate } from './api';
import { CodeEditor } from './components/CodeEditor';
import { PreviewPane } from './components/PreviewPane';
import { Toolbar } from './components/Toolbar';
import { EditorHeader } from './components/EditorHeader';
import { TemplatePanel } from './components/TemplatePanel';
import { SamplePanel } from './components/SamplePanel';
import { SaveDialog } from './components/SaveDialog';
import { MacroPanel } from './components/MacroPanel';
import { AdminPanel } from './components/AdminPanel';
import { ApiDocsPanel } from './components/ApiDocsPanel';
import { SetupScreen } from './components/SetupScreen';
import { LoginScreen } from './components/LoginScreen';
import { ToastContainer, type Toast } from './components/Toast';
import { DEFAULT_HTML } from './preset';
import { useRenderer } from './useRenderer';
import { useAuth } from './useAuth';
import { extractMacroKeys, type MacroParams } from './macros';
import type { RenderSettings } from './types';
import type { SampleTemplate } from './samples';

const DEFAULT_SETTINGS: RenderSettings = { width: 1200, height: 630, format: 'png' };

const DEFAULT_PARAMS: MacroParams = {
	category: 'Product Update',
	title: '美しい OGP 画像を、コードで自由に。',
	description: 'HTML を編集するだけで、X / はてな / Zenn などで映える 1200×630 の OGP 画像を瞬時に生成。',
	site: 'OGP',
	cta: '今すぐ生成 →',
};

function App() {
	const { phase, setup, login, logout } = useAuth();
	const [html, setHtml] = useState(DEFAULT_HTML);
	const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS);
	const [params, setParams] = useState<MacroParams>(DEFAULT_PARAMS);
	const [saving, setSaving] = useState(false);
	const [currentId, setCurrentId] = useState<string | null>(null);
	const [templateName, setTemplateName] = useState('無題のテンプレート');
	const [slug, setSlug] = useState('');
	const [dirty, setDirty] = useState(false);
	const [templatesOpen, setTemplatesOpen] = useState(false);
	const [samplesOpen, setSamplesOpen] = useState(false);
	const [saveOpen, setSaveOpen] = useState(false);
	const [adminOpen, setAdminOpen] = useState(false);
	const [apiDocsOpen, setApiDocsOpen] = useState(false);
	const [toast, setToast] = useState<Toast | null>(null);
	const [editorWidth, setEditorWidth] = useState<number | null>(null);
	const [macroHeight, setMacroHeight] = useState<number | null>(null);
	const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
	const [isNarrow, setIsNarrow] = useState(false);

	const { state, renderHtml } = useRenderer(settings);
	const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const workspaceRef = useRef<HTMLDivElement | null>(null);
	const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
	const macroDragState = useRef<{ startY: number; startHeight: number } | null>(null);

	const macroKeys = useMemo(() => extractMacroKeys(html), [html]);

	// 狭い画面（縦積みレイアウト）かどうかを検出する
	useEffect(() => {
		const mq = window.matchMedia('(max-width: 960px)');
		const update = () => setIsNarrow(mq.matches);
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	}, []);

	// 認証状態が「認証済み」以外に変わったら、開いているパネル等の UI 状態をリセットする。
	// これによりログアウト→再ログイン時に前回のパネルが開いたまま残るのを防ぐ。
	useEffect(() => {
		if (phase !== 'authenticated') {
			setTemplatesOpen(false);
			setSamplesOpen(false);
			setSaveOpen(false);
			setAdminOpen(false);
			setApiDocsOpen(false);
		}
	}, [phase]);

	const notify = useCallback((message: string, kind: Toast['kind'] = 'success') => {
		setToast({ id: Date.now(), message, kind });
	}, []);

	// デバウンス付きライブレンダリング（HTML とマクロ値の両方に反応）
	// 認証済みのときだけ実行する。未認証時に走ると /api/proxy が 401 になり
	// フォント等の外部リソースが取得できず、認証後に再実行もされないため。
	useEffect(() => {
		if (phase !== 'authenticated') return;
		if (renderTimer.current) clearTimeout(renderTimer.current);
		renderTimer.current = setTimeout(() => {
			void renderHtml(html, params);
		}, 500);
		return () => {
			if (renderTimer.current) clearTimeout(renderTimer.current);
		};
	}, [html, params, renderHtml, phase]);

	function handleParamChange(key: string, value: string) {
		setParams((prev) => ({ ...prev, [key]: value }));
		setDirty(true);
	}

	// HTML 編集（エディタ）を反映し、未保存状態にする。
	function handleHtmlChange(value: string) {
		setHtml(value);
		setDirty(true);
	}

	// サイズ・形式の変更を反映し、未保存状態にする。
	function handleSettingsChange(next: RenderSettings) {
		setSettings(next);
		setDirty(true);
	}

	// スラッグ（URL 識別子）の変更を反映し、未保存状態にする。
	function handleSlugChange(value: string) {
		setSlug(value);
		setDirty(true);
	}

	// 保存状態を「保存済み」に戻す。
	function markClean() {
		setDirty(false);
	}

	// 共有 URL に現在のマクロ値をクエリとして付与
	function buildSharedUrl(id: string): string {
		const base = `${location.origin}/ogp/${id}`;
		const query = new URLSearchParams();
		for (const key of macroKeys) {
			const value = params[key];
			if (value) query.set(key, value);
		}
		const qs = query.toString();
		return qs ? `${base}?${qs}` : base;
	}

	async function handleSave() {
		setSaveOpen(true);
	}

	async function confirmSave(name: string) {
		setSaveOpen(false);
		setSaving(true);
		try {
			const trimmedSlug = slug.trim();
			if (trimmedSlug && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(trimmedSlug)) {
				notify('スラッグは英数字（先頭）と - / _ のみ使用できます', 'error');
				return;
			}
			const { id } = await saveTemplate({
				id: trimmedSlug || currentId || undefined,
				name,
				html,
				width: settings.width,
				height: settings.height,
			});
			setCurrentId(id);
			setSlug(id);
			setTemplateName(name);
			markClean();
			notify('テンプレートを保存しました');
		} catch (e) {
			notify(e instanceof Error ? e.message : '保存に失敗しました', 'error');
		} finally {
			setSaving(false);
		}
	}

	async function handleLoad(id: string) {
		try {
			const t = await fetchTemplate(id);
			setHtml(t.html);
			setSettings((prev) => ({ ...prev, width: t.width || prev.width, height: t.height || prev.height }));
			setCurrentId(t.id);
			setSlug(t.id);
			setTemplateName(t.name);
			markClean();
			notify(`「${t.name}」を読み込みました`);
		} catch (e) {
			notify(e instanceof Error ? e.message : '読込に失敗しました', 'error');
		}
	}

	function handleSelectSample(sample: SampleTemplate) {
		setHtml(sample.html);
		setParams(sample.params);
		setSettings((prev) => ({ ...prev, width: sample.width, height: sample.height }));
		setCurrentId(null);
		setSlug('');
		setTemplateName('無題のテンプレート');
		setSamplesOpen(false);
		markClean();
		notify(`サンプル「${sample.name}」を読み込みました`);
	}

	// ヘッダからテンプレート名をリネームする
	async function handleRename(name: string) {
		const trimmed = name.trim();
		if (!trimmed || trimmed === templateName) return;
		if (!currentId) {
			// 未保存の場合は名前だけ保持（保存時に確定）
			setTemplateName(trimmed);
			notify('テンプレート名を変更しました');
			return;
		}
		try {
			await saveTemplate({
				id: currentId,
				name: trimmed,
				html,
				width: settings.width,
				height: settings.height,
			});
			setTemplateName(trimmed);
			markClean();
			notify('テンプレート名を変更しました');
		} catch (e) {
			notify(e instanceof Error ? e.message : '名前の変更に失敗しました', 'error');
		}
	}

	function handleDownload() {
		if (state.status !== 'done' || !state.imageUrl) {
			notify('まだプレビューが生成されていません', 'info');
			return;
		}
		const ext = settings.format;
		const a = document.createElement('a');
		a.href = state.imageUrl;
		a.download = `ogp-${settings.width}x${settings.height}.${ext}`;
		document.body.appendChild(a);
		a.click();
		a.remove();
	}

	async function copyUrl() {
		if (!currentId) return;
		const url = buildSharedUrl(currentId);
		try {
			await navigator.clipboard.writeText(url);
			notify('URL をコピーしました');
		} catch {
			notify('コピーに失敗しました', 'error');
		}
	}

	function openUrl() {
		if (!currentId) return;
		window.open(buildSharedUrl(currentId), '_blank', 'noopener,noreferrer');
	}

	// エディタペインの幅をドラッグで変更する
	function handleResizeStart(e: React.PointerEvent<HTMLDivElement>) {
		const workspace = workspaceRef.current;
		if (!workspace) return;
		const editorPane = workspace.querySelector<HTMLElement>('.editor-pane');
		if (!editorPane) return;
		dragState.current = { startX: e.clientX, startWidth: editorPane.getBoundingClientRect().width };
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function handleResizeMove(e: React.PointerEvent<HTMLDivElement>) {
		const drag = dragState.current;
		const workspace = workspaceRef.current;
		if (!drag || !workspace) return;
		const delta = e.clientX - drag.startX;
		const min = 320;
		const max = workspace.getBoundingClientRect().width - 240;
		const next = Math.max(min, Math.min(max, drag.startWidth + delta));
		setEditorWidth(next);
	}

	function handleResizeEnd() {
		dragState.current = null;
	}

	// パラメータパネルの高さをドラッグで変更する
	function handleMacroResizeStart(e: React.PointerEvent<HTMLDivElement>) {
		const editorPane = e.currentTarget.closest<HTMLElement>('.editor-pane');
		if (!editorPane) return;
		const macroPanel = editorPane.querySelector<HTMLElement>('.macro-panel');
		if (!macroPanel) return;
		macroDragState.current = { startY: e.clientY, startHeight: macroPanel.getBoundingClientRect().height };
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function handleMacroResizeMove(e: React.PointerEvent<HTMLDivElement>) {
		const drag = macroDragState.current;
		const editorPane = e.currentTarget.closest<HTMLElement>('.editor-pane');
		if (!drag || !editorPane) return;
		const delta = drag.startY - e.clientY;
		const paneHeight = editorPane.getBoundingClientRect().height;
		const min = 60;
		const max = paneHeight - 120;
		const next = Math.max(min, Math.min(max, drag.startHeight + delta));
		setMacroHeight(next);
	}

	function handleMacroResizeEnd() {
		macroDragState.current = null;
	}

	if (phase === 'loading') {
		return (
			<div className="auth-screen">
				<div className="auth-loading">
					<div className="preview-spinner" />
					<p>読み込み中…</p>
				</div>
			</div>
		);
	}

	if (phase === 'setup') {
		return <SetupScreen onSubmit={setup} />;
	}

	if (phase === 'login') {
		return <LoginScreen onSubmit={login} />;
	}

	return (
		<div className="app">
			<Toolbar
				onOpenSamples={() => setSamplesOpen(true)}
				onOpenAdmin={() => setAdminOpen(true)}
				onOpenApiDocs={() => setApiDocsOpen(true)}
			/>

			<div className="share-bar">
				<div className="share-bar-inner">
					<span className="share-label">OGP 画像 URL</span>
					{currentId ? (
						<code className="share-url">{buildSharedUrl(currentId)}</code>
					) : (
						<span className="share-url placeholder">テンプレートを保存すると、ここに OGP 画像 URL が表示されます。</span>
					)}
					<button type="button" className="btn ghost small" onClick={copyUrl} disabled={!currentId}>
						コピー
					</button>
					<button type="button" className="btn ghost small" onClick={openUrl} disabled={!currentId}>
						別タブで開く
					</button>
				</div>
			</div>

			<div className="workspace" ref={workspaceRef}>
				{isNarrow && (
					<div className="workspace-tabs" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'editor'}
							className={`workspace-tab ${activeTab === 'editor' ? 'active' : ''}`}
							onClick={() => setActiveTab('editor')}
						>
							HTML 編集
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'preview'}
							className={`workspace-tab ${activeTab === 'preview' ? 'active' : ''}`}
							onClick={() => setActiveTab('preview')}
						>
							プレビュー
						</button>
					</div>
				)}

				<div
					className="pane editor-pane"
					style={editorWidth != null ? { flex: `0 0 ${editorWidth}px` } : undefined}
					hidden={isNarrow && activeTab !== 'editor'}
				>
					<EditorHeader
						templateName={templateName}
						currentId={currentId}
						dirty={dirty}
						saving={saving}
						onRename={handleRename}
						onSave={handleSave}
						onOpenTemplates={() => setTemplatesOpen(true)}
					/>
					<div className="editor-wrap">
						<CodeEditor value={html} onChange={handleHtmlChange} />
					</div>
					<div
						className="macro-resize-handle"
						onPointerDown={handleMacroResizeStart}
						onPointerMove={handleMacroResizeMove}
						onPointerUp={handleMacroResizeEnd}
						onPointerCancel={handleMacroResizeEnd}
						role="separator"
						aria-orientation="horizontal"
						aria-label="パラメータの高さを変更"
					/>
					<MacroPanel
						keys={macroKeys}
						params={params}
						onChange={handleParamChange}
						settings={settings}
						onSettingsChange={handleSettingsChange}
						slug={slug}
						onSlugChange={handleSlugChange}
						style={macroHeight != null ? { height: `${macroHeight}px`, flex: 'none', maxHeight: 'none' } : undefined}
					/>
				</div>

				{!isNarrow && (
					<div
						className="resize-handle"
						onPointerDown={handleResizeStart}
						onPointerMove={handleResizeMove}
						onPointerUp={handleResizeEnd}
						onPointerCancel={handleResizeEnd}
						role="separator"
						aria-orientation="vertical"
						aria-label="エディタの幅を変更"
					/>
				)}

				<div className="preview-pane-wrap" hidden={isNarrow && activeTab !== 'preview'}>
					<PreviewPane
						status={state.status}
						imageUrl={state.imageUrl}
						error={state.error}
						width={settings.width}
						height={settings.height}
						format={settings.format}
						onDownload={handleDownload}
					/>
				</div>
			</div>

			<TemplatePanel open={templatesOpen} onClose={() => setTemplatesOpen(false)} onLoad={handleLoad} />
			<SamplePanel open={samplesOpen} onClose={() => setSamplesOpen(false)} onSelect={handleSelectSample} />
			<AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} onLogout={logout} />
			<ApiDocsPanel open={apiDocsOpen} onClose={() => setApiDocsOpen(false)} currentTemplateId={currentId} />
			<SaveDialog open={saveOpen} defaultName={templateName} onCancel={() => setSaveOpen(false)} onConfirm={confirmSave} />
			<ToastContainer toast={toast} onDismiss={() => setToast(null)} />
		</div>
	);
}

export default App;
