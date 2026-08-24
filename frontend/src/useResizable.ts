import { useRef } from 'react';

/**
 * エディタペインの幅とマクロパネルの高さをドラッグで変更するためのフック。
 * ドラッグ状態（useRef）を内部に保持し、ポインタイベントハンドラ群を返す。
 */
export function useResizable(
	workspaceRef: React.RefObject<HTMLDivElement | null>,
	setEditorWidth: (width: number) => void,
	setMacroHeight: (height: number) => void,
) {
	const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
	const macroDragState = useRef<{ startY: number; startHeight: number } | null>(null);

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

	return {
		handleResizeStart,
		handleResizeMove,
		handleResizeEnd,
		handleMacroResizeStart,
		handleMacroResizeMove,
		handleMacroResizeEnd,
	};
}
