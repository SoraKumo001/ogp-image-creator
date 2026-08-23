import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTemplate, saveTemplate } from './api';
import { CodeEditor } from './components/CodeEditor';
import { PreviewPane } from './components/PreviewPane';
import { Toolbar } from './components/Toolbar';
import { TemplatePanel } from './components/TemplatePanel';
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
	const [templatesOpen, setTemplatesOpen] = useState(false);
	const [saveOpen, setSaveOpen] = useState(false);
	const [adminOpen, setAdminOpen] = useState(false);
	const [apiDocsOpen, setApiDocsOpen] = useState(false);
	const [toast, setToast] = useState<Toast | null>(null);

	const { state, renderHtml } = useRenderer(settings);
	const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const macroKeys = useMemo(() => extractMacroKeys(html), [html]);

	// 認証状態が「認証済み」以外に変わったら、開いているパネル等の UI 状態をリセットする。
	// これによりログアウト→再ログイン時に前回のパネルが開いたまま残るのを防ぐ。
	useEffect(() => {
		if (phase !== 'authenticated') {
			setTemplatesOpen(false);
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
			const { id } = await saveTemplate({
				id: currentId ?? undefined,
				name,
				html,
				width: settings.width,
				height: settings.height,
			});
			setCurrentId(id);
			setTemplateName(name);
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
			setTemplateName(t.name);
			setSharedUrl(buildSharedUrl(t.id));
			setify(`「${t.name}」を読み込みました`);
		} catch (e) {
			notify(e instanceof Error ? e.message : '読込に失敗しました', 'error');
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
				settings={settings}
				onSettingsChange={setSettings}
				onSave={handleSave}
				onDownload={handleDownload}
				onOpenTemplates={() => setTemplatesOpen(true)}
				onOpenAdmin={() => setAdminOpen(true)}
				onOpenApiDocs={() => setApiDocsOpen(true)}
				saving={saving}
			/>

			<div className="workspace">
				<div className="pane editor-pane">
					<div className="pane-label">
						<span>HTML</span>
						{currentId && <span className="saved-indicator">保存済み</span>}
					</div>
					<CodeEditor value={html} onChange={setHtml} />
					<MacroPanel keys={macroKeys} params={params} onChange={handleParamChange} />
				</div>

				<PreviewPane
					status={state.status}
					imageUrl={state.imageUrl}
					error={state.error}
					width={settings.width}
					height={settings.height}
					format={settings.format}
				/>
			</div>

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

			<TemplatePanel open={templatesOpen} onClose={() => setTemplatesOpen(false)} onLoad={handleLoad} />
			<AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} onLogout={logout} />
			<ApiDocsPanel open={apiDocsOpen} onClose={() => setApiDocsOpen(false)} currentTemplateId={currentId} />
			<SaveDialog open={saveOpen} defaultName={templateName} onCancel={() => setSaveOpen(false)} onConfirm={confirmSave} />
			<ToastContainer toast={toast} onDismiss={() => setToast(null)} />
		</div>
	);
}

export default App;
