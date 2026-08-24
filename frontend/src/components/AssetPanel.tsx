import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteAsset, fetchAssets, uploadAsset } from '../api';
import { formatBytes, formatDate } from '../utils';
import { Panel } from './Panel';
import { CopyIcon, DeleteIcon, UploadIcon } from './icons';
import type { AssetSummary } from '../types';

interface AssetPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AssetPanel({ open, onClose }: AssetPanelProps) {
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setAssets(await fetchAssets());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const uploadFile = useCallback(async (file: File) => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setUploading(true);
    setError(null);
    try {
      await uploadAsset(file);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }, []);

  // パネルが開いている間、クリップボードからの画像ペーストを検知する
  useEffect(() => {
    if (!open) return;
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) void uploadFile(file);
          return;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open, uploadFile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルのみアップロードできます');
      return;
    }
    void uploadFile(file);
  }

  async function handleCopy(id: string) {
    const url = `/assets/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      setError('コピーに失敗しました');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('このアセットを削除しますか？')) return;
    try {
      await deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!open) return null;

  return (
    <Panel title="画像アセット" onClose={onClose}>
      <div
        className={`asset-upload${dragging ? ' dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="asset-file-input"
          aria-label="画像をアップロード"
        />
        <button
          type="button"
          className="btn primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <span className="spinner" /> : <UploadIcon />}
          <span className="btn-label">{uploading ? 'アップロード中…' : '画像をアップロード'}</span>
        </button>
      </div>

      <p className="asset-hint">
        クリップボードから貼り付け（Ctrl/Cmd+V）、またはドラッグ＆ドロップでも追加できます。
      </p>

      <p className="asset-hint">
        アップロードした画像は <code>&lt;img src="/assets/&#123;id&#125;"&gt;</code> や{' '}
        <code>background-image: url('/assets/&#123;id&#125;')</code> で HTML から参照できます。
      </p>

      {loading && <p className="panel-hint">読み込み中…</p>}
      {error && <p className="panel-error">{error}</p>}

      {!loading && !error && assets.length === 0 && <p className="panel-hint">アップロード済みの画像はまだありません。</p>}

      <ul className="asset-list">
        {assets.map((a) => (
          <li key={a.id} className="asset-item">
            <img className="asset-thumb" src={`/assets/${a.id}`} alt={a.name} loading="lazy" />
            <div className="asset-main">
              <span className="asset-name">{a.name}</span>
              <span className="asset-meta">
                {formatBytes(a.size)} · {formatDate(a.updatedAt)}
              </span>
            </div>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => handleCopy(a.id)}
              aria-label={`${a.name} の URL をコピー`}
            >
              <CopyIcon />
              <span className="btn-label">{copiedId === a.id ? 'コピー済み' : 'URLコピー'}</span>
            </button>
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => handleDelete(a.id)}
              aria-label={`${a.name} を削除`}
            >
              <DeleteIcon />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
