import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
	// 共通の除外対象
	{
		ignores: ['node_modules/**', 'public/**', 'dist/**', 'worker-configuration.d.ts', '.wrangler/**'],
	},

	// ベース設定（全 TS ファイル共通）
	{
		files: ['**/*.{ts,tsx,mts}'],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
	},

	// バックエンド（Cloudflare Workers / Hono）
	{
		files: ['src/**/*.ts', 'test/**/*.ts'],
		languageOptions: {
			globals: {
				// Cloudflare Workers のグローバル（Env 型は worker-configuration.d.ts で定義）
				crypto: 'readonly',
				btoa: 'readonly',
				atob: 'readonly',
				TextEncoder: 'readonly',
				TextDecoder: 'readonly',
				Response: 'readonly',
				Request: 'readonly',
				Headers: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				ReadableStream: 'readonly',
				TransformStream: 'readonly',
				FormData: 'readonly',
				Blob: 'readonly',
				File: 'readonly',
				WebSocket: 'readonly',
				fetch: 'readonly',
				console: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				structuredClone: 'readonly',
				AbortController: 'readonly',
				AbortSignal: 'readonly',
				performance: 'readonly',
			},
		},
	},

	// フロントエンド（React + Vite）
	{
		files: ['frontend/src/**/*.{ts,tsx}'],
		extends: [reactRefresh.configs.vite],
		plugins: {
			'react-hooks': reactHooks,
		},
		rules: {
			// 従来の推奨ルールのみ有効化（React Compiler 向けの厳格ルールは無効）
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
		},
		languageOptions: {
			globals: {
				window: 'readonly',
				document: 'readonly',
				navigator: 'readonly',
				location: 'readonly',
				history: 'readonly',
				localStorage: 'readonly',
				sessionStorage: 'readonly',
				HTMLElement: 'readonly',
				HTMLCanvasElement: 'readonly',
				HTMLImageElement: 'readonly',
				HTMLInputElement: 'readonly',
				HTMLTextAreaElement: 'readonly',
				HTMLDivElement: 'readonly',
				HTMLButtonElement: 'readonly',
				HTMLAnchorElement: 'readonly',
				Event: 'readonly',
				MouseEvent: 'readonly',
				KeyboardEvent: 'readonly',
				FileReader: 'readonly',
				Blob: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				FormData: 'readonly',
				fetch: 'readonly',
				console: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				requestAnimationFrame: 'readonly',
				cancelAnimationFrame: 'readonly',
				AbortController: 'readonly',
				AbortSignal: 'readonly',
				structuredClone: 'readonly',
				TextEncoder: 'readonly',
				TextDecoder: 'readonly',
				atob: 'readonly',
				btoa: 'readonly',
				performance: 'readonly',
				ResizeObserver: 'readonly',
				IntersectionObserver: 'readonly',
				MutationObserver: 'readonly',
			},
		},
	},

	// Prettier と競合するルールを無効化（最後に適用）
	prettier,
);
