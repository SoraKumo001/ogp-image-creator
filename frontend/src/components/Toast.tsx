import { useEffect, useRef } from 'react';

interface Toast {
	id: number;
	message: string;
	kind: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
	toast: Toast | null;
	onDismiss: () => void;
}

export function ToastContainer({ toast, onDismiss }: ToastContainerProps) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (toast) {
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(onDismiss, 3200);
		}
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, [toast, onDismiss]);

	if (!toast) return null;

	return (
		<div className={`toast ${toast.kind}`} role="status">
			<span className="toast-dot" />
			{toast.message}
		</div>
	);
}

export type { Toast };
