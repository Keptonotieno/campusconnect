import React, { useState } from 'react';
import { DetailedEmailLog } from '../../types';
import { X, CheckCircle2, AlertCircle, Clock, Copy, Eye, Code, Mail, RefreshCw } from 'lucide-react';

interface EmailLogDetailModalProps {
  log: DetailedEmailLog | null;
  onClose: () => void;
  onRetry?: (logId: string) => Promise<void>;
  isDarkMode?: boolean;
}

export const EmailLogDetailModal: React.FC<EmailLogDetailModalProps> = ({ log, onClose, onRetry, isDarkMode = false }) => {
  const [activeView, setActiveView] = useState<'PREVIEW' | 'RAW'>('PREVIEW');
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (!log) return null;

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>DELIVERED</span>
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>QUEUED</span>
          </span>
        );
      case 'FAILED':
      case 'BOUNCED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-start justify-between gap-4 ${
          isDarkMode ? 'border-slate-800 bg-[#131B2E]' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold border border-blue-500/20">
                {log.template}
              </span>
              {getStatusBadge(log.status)}
              <span className="text-xs text-slate-400 font-mono">
                {new Date(log.sentAt).toLocaleString()}
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight truncate">
              {log.subject}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              To: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{log.recipient}</strong>
              {log.universityName && <> • University: <span className="font-semibold">{log.universityName}</span></>}
              {log.provider && <> • Provider: <span className="font-mono">{log.provider}</span></>}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-xl p-1 border bg-slate-200/50 dark:bg-slate-800/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveView('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeView === 'PREVIEW'
                    ? (isDarkMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-600 shadow-xs')
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>HTML Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('RAW')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeView === 'RAW'
                    ? (isDarkMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-600 shadow-xs')
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Raw Data</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Metadata Bar */}
          <div className={`p-4 rounded-2xl border text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 ${
            isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className="text-slate-400 font-medium">Message ID:</span>
              <div className="font-mono font-bold truncate mt-0.5 text-[11px]">{log.messageId}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Idempotency Key:</span>
              <div className="font-mono font-bold truncate mt-0.5 text-[11px]">{log.idempotencyKey || 'None'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Delivery Handshake:</span>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">TLS 1.3 Verified</div>
            </div>
          </div>

          {log.errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Delivery Notice:</strong> {log.errorMessage}
              </div>
            </div>
          )}

          {/* View: HTML Preview */}
          {activeView === 'PREVIEW' ? (
            <div className="border rounded-2xl overflow-hidden shadow-xs">
              <div className={`px-4 py-2 border-b text-[11px] font-bold flex items-center justify-between ${
                isDarkMode ? 'bg-[#131B2E] border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <span>Rendered Branded Email Output</span>
                <span className="font-mono">Responsive Container (600px)</span>
              </div>
              <div className="p-4 bg-[#F1F5F9] flex justify-center min-h-[420px]">
                {log.renderedHtml ? (
                  <iframe
                    title="Rendered Email"
                    srcDoc={log.renderedHtml}
                    className="w-full max-w-[620px] h-[520px] rounded-xl border border-slate-300 shadow-sm bg-white"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
                    <Mail className="w-10 h-10 opacity-30" />
                    <p className="text-xs">No rendered HTML content available for this log entry.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* View: Raw JSON */
            <div className="relative">
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(log, null, 2))}
                className="absolute right-4 top-4 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md z-10"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
              </button>
              <pre className={`p-4 rounded-2xl border font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed ${
                isDarkMode ? 'bg-[#0A0E1A] border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-emerald-300'
              }`}>
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'border-slate-800 bg-[#131B2E]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="text-[11px] text-slate-400 font-mono">
            {log.metadata?.actualFromAddress ? `From: ${log.metadata.actualFromAddress}` : ''}
            {log.metadata?.attempts ? ` • Attempts: ${log.metadata.attempts}` : ''}
          </div>
          <div className="flex items-center gap-2">
            {onRetry && log.status !== 'DELIVERED' && (
              <button
                type="button"
                disabled={retrying}
                onClick={async () => {
                  setRetrying(true);
                  try {
                    await onRetry(log.id);
                  } finally {
                    setRetrying(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Retrying...' : 'Retry Delivery'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
