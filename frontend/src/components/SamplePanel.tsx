import { Panel } from './Panel';
import { SAMPLES, type SampleTemplate } from '../samples';

interface SamplePanelProps {
	open: boolean;
	onClose: () => void;
	onSelect: (sample: SampleTemplate) => void;
}

export function SamplePanel({ open, onClose, onSelect }: SamplePanelProps) {
	if (!open) return null;

	return (
		<Panel title="サンプル" onClose={onClose}>
			<p className="panel-hint">サンプルを選ぶと、HTML・サイズ・パラメータが置き換わります。</p>
			<ul className="template-list">
				{SAMPLES.map((s) => (
					<li key={s.id} className="template-item">
						<button type="button" className="template-main" onClick={() => onSelect(s)}>
							<span className="template-name">{s.name}</span>
							<span className="template-date">{s.description}</span>
						</button>
					</li>
				))}
			</ul>
		</Panel>
	);
}
