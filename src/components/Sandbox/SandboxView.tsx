import { useEffect, useRef, useCallback, useMemo } from 'react';
import { buildReactSandboxHTML } from '../../utils/sandbox';
import type { VizType } from '../../types';
import './Sandbox.css';

interface SandboxViewProps {
  vizId: string;
  type: VizType;
  code: string;
  title: string;
  initialHeight: number;
}

const store = new Map<string, { type: VizType; code: string }>();

export function getVizCode(id: string) {
  return store.get(id);
}

function downloadViz(id: string) {
  const entry = store.get(id);
  if (!entry) {
    alert('找不到源码');
    return;
  }
  const ts = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[T:]/g, '-');
  const ext = entry.type === 'html' ? 'html' : 'jsx';
  const filename = entry.type === 'html'
    ? `visualization-${ts}.${ext}`
    : `component-${ts}.${ext}`;
  const mime = entry.type === 'html' ? 'text/html' : 'text/jsx';
  const blob = new Blob([entry.code], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Expose downloadViz globally for onclick in the HTML attribute
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__sandboxDownload = downloadViz;
}

export function SandboxView({
  vizId,
  type,
  code,
  title,
  initialHeight,
}: SandboxViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Store code for later download
  useEffect(() => {
    store.set(vizId, { type, code });
    return () => { store.delete(vizId); };
  }, [vizId, type, code]);

  // Handle iframe height messages
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const iframe = iframeRef.current;
      if (!iframe || e.source !== iframe.contentWindow) return;
      if (e.data?.type === 'sandbox-height') {
        const h = Math.min(e.data.height + 10, 800);
        if (h > 50) iframe.style.height = `${h}px`;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (doc) {
        const ch = Math.max(
          doc.body.scrollHeight,
          doc.documentElement.scrollHeight,
        );
        if (ch > 50) iframe.style.height = `${Math.min(ch + 20, 800)}px`;
      }
    } catch {
      // cross-origin, ignore
    }
  }, []);

  const tagClass = type === 'html' ? 'html' : 'react';
  const ext = type === 'html' ? '.html' : '.jsx';

  const blobUrl = useMemo(() => {
    const blobHtml = type === 'react' ? buildReactSandboxHTML(code) : code;
    const blob = new Blob([blobHtml], { type: 'text/html;charset=utf-8' });
    return URL.createObjectURL(blob);
  }, [type, code]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  return (
    <div className="msg">
      <div className="msg-lbl">Claude</div>
      <div className="viz">
        <div className="viz-h">
          <div className="viz-left">
            <span>{title}</span>
          </div>
          <div className="viz-right">
            <button
              className="dl-btn"
              onClick={() => downloadViz(vizId)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {ext}
            </button>
            <span className={`vtag ${tagClass}`}>
              {type === 'html' ? 'HTML' : 'REACT'}
            </span>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          className="viz-if"
          style={{ height: initialHeight }}
          src={blobUrl}
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
}
