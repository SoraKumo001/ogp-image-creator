/**
 * Workers AI の SSE ストリームをフロントエンドが期待する形式に正規化する。
 *
 * qwen3.8-27b は OpenAI 互換形式（choices[0].delta.content / delta.reasoning）で返す。
 * フロントエンドは Llama 形式（{response: "token"}）を期待するため、SSE を正規化する。
 * reasoning トークンは推論過程なので破棄し、content のみを抽出する。
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// 単一の SSE フレーム（`data: ...` 行の集合）を処理し、正規化済みの出力を controller に流す。
function processFrame(frame: string, controller: TransformStreamDefaultController<Uint8Array>): void {
	for (const line of frame.split('\n')) {
		const trimmed = line.replace(/^\r/, '').trimStart();
		if (!trimmed.startsWith('data:')) continue;
		const payload = trimmed.slice(5).trim();
		if (payload === '[DONE]') {
			controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			continue;
		}
		try {
			const data = JSON.parse(payload);
			// [DONE] 終端
			// OpenAI 互換形式（qwen3.8-27b）: choices[0].delta.content を抽出
			const content = data?.choices?.[0]?.delta?.content;
			if (typeof content === 'string' && content !== '') {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: content })}\n\n`));
			}
			// reasoning トークンは破棄
			// Llama 形式（念のためフォールバック）: data.response
			if (typeof data.response === 'string' && data.response !== '') {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: data.response })}\n\n`));
			}
		} catch {
			// JSON パース失敗は無視
		}
	}
}

export function normalizeSseStream(rawStream: ReadableStream): ReadableStream {
	let sseBuffer = '';

	return rawStream.pipeThrough(
		new TransformStream({
			transform(chunk, controller) {
				sseBuffer += decoder.decode(chunk, { stream: true });
				const frames = sseBuffer.split('\n\n');
				sseBuffer = frames.pop() ?? '';
				for (const frame of frames) {
					processFrame(frame, controller);
				}
			},
			flush(controller) {
				// 残りのバッファを処理
				if (sseBuffer) {
					processFrame(sseBuffer, controller);
				}
			},
		}),
	);
}
