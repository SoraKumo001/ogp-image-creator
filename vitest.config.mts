import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			// wrangler.jsonc では `ai` バインディングが `remote: true` のため、
			// デフォルト（remoteBindings: true）だとリモートプロキシセッションの
			// 確立に CLOUDFLARE_API_TOKEN が必要になる。テストでは AI をモックするため、
			// リモートバインディングの解決を無効化してトークン不要にする。
			remoteBindings: false,
			miniflare: {
				ai: { binding: 'AI' },
			},
		}),
	],
});
