import { Hono } from 'hono';
import { applyMacros } from '../shared/macros';
import { renderRoutes } from './routes/render';
import { ogpRoutes } from './routes/ogp';
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admins';
import { proxyRoutes } from './routes/proxy';
import { templateRoutes } from './routes/templates';
import { generateRoutes } from './routes/generate';
import { assetRoutes } from './routes/assets';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.route('/', renderRoutes);
app.route('/', ogpRoutes);
app.route('/', authRoutes);
app.route('/', adminRoutes);
app.route('/', proxyRoutes);
app.route('/', templateRoutes);
app.route('/', generateRoutes);
app.route('/', assetRoutes);

// GET / (static assets)
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;

// テストから参照するため再エクスポート
export { applyMacros };
