import type { ReactNode } from 'react';
import { CloseIcon } from './icons';

interface PanelProps {
	title: string;
	onClose: () => void;
	children: ReactNode;
	className?: string;
}

/**
 * オーバーレイ＋パネルの共通レイアウト。
 * 各パネルはタイトルと本文のみを提供する。
 */
export function Panel({ title, onClose, children, className }: PanelProps) {
	return (
		<div className="overlay" onClick={onClose}>
			<div className={`panel${className ? ` ${className}` : ''}`} onClick={(e) => e.stopPropagation()}>
				<header className="panel-header">
					<h2>{title}</h2>
					<button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
						<CloseIcon />
					</button>
				</header>
				<div className="panel-body">{children}</div>
			</div>
		</div>
	);
}
