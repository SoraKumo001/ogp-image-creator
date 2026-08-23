import { DEFAULT_HTML } from './preset';

export interface SampleTemplate {
	id: string;
	name: string;
	description: string;
	html: string;
	width: number;
	height: number;
	params: Record<string, string>;
}

const GLASS_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap");
    body { font-family: "Noto Sans JP", sans-serif; }
  </style>
</head>
<body style="width:1200px;height:630px;margin:0">
  <div class="relative flex h-full w-full overflow-hidden bg-[#0f172a]">
    <div class="absolute -left-25 -top-25 flex size-150 rounded-full bg-indigo-600/20 blur-[100px]"></div>
    <div class="absolute -bottom-37.5 right-25 flex size-175 rounded-full bg-purple-600/15 blur-[120px]"></div>
    <div class="z-10 flex size-full flex-row items-center justify-between p-15">
      <div class="flex w-[62%] flex-col rounded-[48px] border border-white/10 bg-white/5 p-12 shadow-2xl backdrop-blur-2xl">
        <div class="mb-8 flex items-center">
          <div class="mr-5 h-1.5 w-16 rounded-full bg-linear-to-r from-indigo-500 to-purple-500"></div>
          <div class="flex text-xl font-bold uppercase tracking-[0.25em] text-indigo-300">{{category}}</div>
        </div>
        <div class="mb-8 flex text-[76px] font-black leading-[1.1] text-white">{{title}}</div>
        <div class="flex text-[30px] font-medium leading-relaxed text-slate-300 opacity-90">{{description}}</div>
        <div class="mt-12 flex items-center gap-4">
          <div class="flex rounded-2xl border border-indigo-500/30 bg-indigo-500/20 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-indigo-100">{{site}}</div>
          <div class="flex rounded-2xl border border-purple-500/30 bg-purple-500/20 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-purple-100">{{cta}}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const MINIMAL_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap");
    body { font-family: "Inter", sans-serif; }
  </style>
</head>
<body style="width:1200px;height:630px;margin:0">
  <div class="flex h-full w-full flex-col justify-between bg-white p-20 text-black">
    <div class="flex items-center gap-3">
      <div class="h-3 w-3 rounded-full bg-black"></div>
      <div class="text-2xl font-bold tracking-tight">{{site}}</div>
    </div>
    <div class="flex flex-col gap-6">
      <div class="text-5xl font-black leading-tight tracking-tight">{{title}}</div>
      <div class="text-2xl text-neutral-500">{{description}}</div>
    </div>
    <div class="flex items-center justify-between">
      <div class="text-xl font-semibold text-neutral-400">{{category}}</div>
      <div class="rounded-full bg-black px-8 py-3 text-xl font-bold text-white">{{cta}}</div>
    </div>
  </div>
</body>
</html>
`;

const TECH_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@700;900&display=swap");
    body { font-family: "Inter", sans-serif; }
  </style>
</head>
<body style="width:1200px;height:630px;margin:0">
  <div class="relative flex h-full w-full flex-col justify-between overflow-hidden bg-black p-20 text-white">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,255,170,0.15),transparent_50%)]"></div>
    <div class="relative flex items-center gap-4">
      <div class="font-mono text-2xl text-emerald-400">&gt;_</div>
      <div class="font-mono text-2xl text-neutral-400">{{category}}</div>
    </div>
    <div class="relative flex flex-col gap-6">
      <div class="text-7xl font-black leading-none tracking-tight">{{title}}</div>
      <div class="text-2xl text-neutral-400">{{description}}</div>
    </div>
    <div class="relative flex items-center justify-between">
      <div class="font-mono text-xl text-neutral-500">{{site}}</div>
      <div class="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-6 py-3 font-mono text-xl font-bold text-emerald-300">{{cta}}</div>
    </div>
  </div>
</body>
</html>
`;

export const SAMPLES: SampleTemplate[] = [
	{
		id: 'default',
		name: 'デフォルト',
		description: 'グラデーション背景の定番レイアウト（素の CSS）',
		html: DEFAULT_HTML,
		width: 1200,
		height: 630,
		params: {
			category: 'Product Update',
			title: '美しい OGP 画像を、コードで自由に。',
			description: 'HTML を編集するだけで、X / はてな / Zenn などで映える 1200×630 の OGP 画像を瞬時に生成。',
			site: 'OGP',
			cta: '今すぐ生成 →',
		},
	},
	{
		id: 'glass',
		name: 'グラスモーフィズム',
		description: 'Tailwind のガラス風カードと光彩エフェクト',
		html: GLASS_HTML,
		width: 1200,
		height: 630,
		params: {
			category: 'Insight & Technology',
			title: 'Tailwind で描く、映える OGP',
			description: 'backdrop-blur と光彩で、洗練されたガラス風デザインを実現。',
			site: 'OGP',
			cta: '詳しく見る',
		},
	},
	{
		id: 'minimal',
		name: 'ミニマル',
		description: '白背景のシンプルで読みやすいレイアウト',
		html: MINIMAL_HTML,
		width: 1200,
		height: 630,
		params: {
			category: 'Announcement',
			title: 'シンプルに、伝える。',
			description: '余白を活かしたミニマルデザインで、メッセージを際立たせます。',
			site: 'OGP',
			cta: '読む',
		},
	},
	{
		id: 'tech',
		name: 'ダークテック',
		description: 'モノスペース＋ネオングリーンの開発者向けデザイン',
		html: TECH_HTML,
		width: 1200,
		height: 630,
		params: {
			category: 'Release Notes',
			title: 'Build faster, ship better.',
			description: '開発者向けのダークテックな OGP デザイン。',
			site: 'OGP',
			cta: 'Get Started',
		},
	},
];
