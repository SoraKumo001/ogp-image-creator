interface IconProps {
	size?: number;
}

export function CloseIcon({ size = 18 }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			<path
				fill="currentColor"
				d="M5.3 5.3a1 1 0 0 1 1.4 0L12 10.6l5.3-5.3a1 1 0 1 1 1.4 1.4L13.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 0 1-1.4-1.4L10.6 12 5.3 6.7a1 1 0 0 1 0-1.4Z"
			/>
		</svg>
	);
}

export function DeleteIcon({ size = 16 }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			<path
				fill="currentColor"
				d="M7 4a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h1v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8h1a1 1 0 1 0 0-2h-2V5a1 1 0 0 0-1-1H7Zm2 5a1 1 0 0 1 2 0v6a1 1 0 0 1-2 0V9Zm4 0a1 1 0 0 1 2 0v6a1 1 0 0 1-2 0V9Z"
			/>
		</svg>
	);
}
