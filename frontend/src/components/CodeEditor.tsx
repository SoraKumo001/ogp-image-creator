import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
	value: string;
	onChange: (value: string) => void;
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	const handleMount: OnMount = (editor, monaco) => {
		editorRef.current = editor;
		monaco.editor.defineTheme('ogp-dark', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'comment', foreground: '5b6478', fontStyle: 'italic' },
				{ token: 'string', foreground: 'a5e075' },
				{ token: 'number', foreground: 'd19a66' },
				{ token: 'tag', foreground: '61afef' },
				{ token: 'attribute.name', foreground: 'e06c75' },
				{ token: 'attribute.value', foreground: '98c379' },
				{ token: 'delimiter', foreground: '8b93a8' },
			],
			colors: {
				'editor.background': '#0d1424',
				'editor.foreground': '#d6def2',
				'editorLineNumber.foreground': '#3d4763',
				'editorLineNumber.activeForeground': '#8b93a8',
				'editor.lineHighlightBackground': '#131c31',
				'editor.selectionBackground': '#2a3a5e66',
				'editorCursor.foreground': '#7c5cff',
				'editorIndentGuide.background': '#1c2740',
				'editorGutter.background': '#0d1424',
				'scrollbarSlider.background': '#1c2740aa',
				'scrollbarSlider.hoverBackground': '#27334faa',
			},
		});
		monaco.editor.setTheme('ogp-dark');
		editor.focus();
	};

	// 外部からの value 更新（読込時）をエディタへ反映
	useEffect(() => {
		const ed = editorRef.current;
		if (ed && ed.getValue() !== value) {
			ed.setValue(value);
		}
	}, [value]);

	return (
		<Editor
			height="100%"
			language="html"
			value={value}
			onChange={(v) => onChange(v ?? '')}
			onMount={handleMount}
			theme="ogp-dark"
			options={{
				fontSize: 13.5,
				fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
				lineNumbers: 'on',
				minimap: { enabled: false },
				wordWrap: 'on',
				scrollBeyondLastLine: false,
				smoothScrolling: true,
				cursorBlinking: 'smooth',
				padding: { top: 16, bottom: 16 },
				automaticLayout: true,
				tabSize: 2,
				renderWhitespace: 'selection',
				bracketPairColorization: { enabled: true },
				guides: { bracketPairs: true, indentation: true },
			}}
		/>
	);
}
