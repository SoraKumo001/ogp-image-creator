export type RenderFormat = 'png' | 'webp' | 'svg';

export type AppEnv = {
	Bindings: Env;
	Variables: {
		adminId: string;
	};
};
