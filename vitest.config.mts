import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			miniflare: {
				// wrangler.jsonc では `ai` バインディングが `remote: true` のため、
				// CI などの非対話環境ではリモートプロキシセッションの確立に
				// CLOUDFLARE_API_TOKEN が必要になる。テストでは AI をモックするため、
				// ローカルバインディングに上書きしてリモート接続を不要にする。
				ai: { binding: 'AI' },
			},
		}),
	],
});
