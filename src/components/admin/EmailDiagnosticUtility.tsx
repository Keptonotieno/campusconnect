import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Terminal,
  RefreshCw,
  Send,
  Copy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Server,
  Cloud
} from 'lucide-react';
import {
  EmailDiagnosticReport,
  UniversityEmailEventType
} from '../../types';
import { runAdminEmailDiagnostics } from '../../lib/adminApi';

interface EmailDiagnosticUtilityProps {
  recipient?: string;
  universityId?: string;
  eventType?: UniversityEmailEventType;
  onToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  onComplete?: () => void;
  isDarkMode?: boolean;
  autoRunOnMount?: boolean;
}

export const EmailDiagnosticUtility: React.FC<EmailDiagnosticUtilityProps> = ({
  recipient = '',
  universityId = 'general',
  eventType = 'WELCOME',
  onToast,
  onComplete,
  isDarkMode = false,
  autoRunOnMount = true
}) => {
  const [probeRecipient, setProbeRecipient] = useState(recipient);
  const [runningCheck, setRunningCheck] = useState(false);
  const [runningSendProbe, setRunningSendProbe] = useState(false);
  const [report, setReport] = useState<EmailDiagnosticReport | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    if (recipient) {
      setProbeRecipient(recipient);
    }
  }, [recipient]);

  const logReportToConsole = useCallback((diag: EmailDiagnosticReport, withSendProbe: boolean) => {
    const label = `[EmailDiagnosticUtility] Email Infrastructure Diagnostic (${diag.timestamp})`;
    console.group(label);

    console.info('[EmailDiagnosticUtility] Active Engine Summary:', {
      activeProvider: diag.activeProvider,
      sendingEnabled: diag.sendingEnabled,
      hasResendKey: diag.hasResendKey,
      hasSmtpCredentials: diag.hasSmtpCredentials
    });

    if (diag.smtpConnection.status === 'CONNECTED') {
      console.info('[EmailDiagnosticUtility] SMTP Connection Status:', diag.smtpConnection);
    } else if (diag.smtpConnection.status === 'FAILED') {
      console.error('[EmailDiagnosticUtility] SMTP Connection Status:', diag.smtpConnection);
    } else {
      console.warn('[EmailDiagnosticUtility] SMTP Connection Status:', diag.smtpConnection);
    }

    if (diag.resendApi.connected) {
      console.info('[EmailDiagnosticUtility] Resend API Domain Status:', diag.resendApi);
    } else {
      console.error('[EmailDiagnosticUtility] Resend API Domain Status:', diag.resendApi);
    }

    if (withSendProbe || diag.resendSendResponse) {
      if (diag.resendSendResponse?.ok) {
        console.info('[EmailDiagnosticUtility] Resend Email Sending Response:', diag.resendSendResponse);
      } else {
        console.error('[EmailDiagnosticUtility] Resend Email Sending Response (Explicit Error):', diag.resendSendResponse);
      }
    }

    if (diag.log) {
      console.info('[EmailDiagnosticUtility] Persisted SQLite Email Log:', {
        id: diag.log.id,
        status: diag.log.status,
        messageId: diag.log.messageId,
        provider: diag.log.provider,
        recipient: diag.log.recipient,
        errorMessage: diag.log.errorMessage,
        metadata: diag.log.metadata
      });
    }

    console.groupEnd();
  }, []);

  const executeDiagnostics = useCallback(async (attemptTestSend: boolean) => {
    if (attemptTestSend && (!probeRecipient || !probeRecipient.includes('@'))) {
      onToast?.('Recipient Required', 'Enter a valid recipient email before running a live send probe.', 'error');
      return;
    }

    if (attemptTestSend) {
      setRunningSendProbe(true);
    } else {
      setRunningCheck(true);
    }
    setFatalError(null);

    try {
      const diag = await runAdminEmailDiagnostics({
        recipient: attemptTestSend ? probeRecipient.trim() : undefined,
        universityId,
        eventType,
        attemptTestSend
      });

      setReport(diag);
      logReportToConsole(diag, attemptTestSend);

      if (attemptTestSend) {
        if (diag.resendSendResponse?.ok) {
          onToast?.(
            'Diagnostic Send Succeeded',
            `Dispatched via ${diag.resendSendResponse.provider} (ID: ${diag.resendSendResponse.messageId}). Full response logged to browser console.`,
            'success'
          );
        } else {
          const errCode = diag.resendSendResponse?.error?.code || 'EMAIL_DELIVERY_FAILED';
          const errMsg = diag.resendSendResponse?.error?.message || 'Delivery probe failed.';
          onToast?.(
            `Diagnostic Error (${errCode})`,
            `${errMsg} Full Resend response logged to browser console.`,
            'error'
          );
        }
        onComplete?.();
      }
    } catch (err: any) {
      const message = err?.message || 'Unable to execute email diagnostics.';
      setFatalError(message);
      console.error('[EmailDiagnosticUtility] Diagnostic request threw error:', {
        message,
        status: err?.status,
        data: err?.data
      });
      if (attemptTestSend) {
        onToast?.('Diagnostic Probe Failed', message, 'error');
      }
    } finally {
      setRunningCheck(false);
      setRunningSendProbe(false);
    }
  }, [probeRecipient, universityId, eventType, logReportToConsole, onToast, onComplete]);

  useEffect(() => {
    if (autoRunOnMount) {
      executeDiagnostics(false);
    }
  }, [autoRunOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopyJson = () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        onToast?.('Diagnostics Copied', 'JSON diagnostic payload copied to clipboard.', 'success');
      }).catch(() => {});
    }
  };

  return (
    <div
      className={`p-6 rounded-3xl border space-y-5 ${
        isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-500" />
            <h4 className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Email Infrastructure Diagnostic Utility
            </h4>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              Console Logger Active
            </span>
          </div>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Verifies live SMTP TLS handshakes and logs raw Resend API responses and explicit delivery exceptions to the browser DevTools console.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => executeDiagnostics(false)}
            disabled={runningCheck || runningSendProbe}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 ${
              isDarkMode
                ? 'bg-[#0F172A] border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningCheck ? 'animate-spin' : ''}`} />
            <span>{runningCheck ? 'Checking...' : 'Check SMTP & Resend'}</span>
          </button>

          {report && (
            <button
              type="button"
              onClick={handleCopyJson}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isDarkMode
                  ? 'bg-[#0F172A] border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Send Probe Controls */}
      <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${
        isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200/80'
      }`}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 shrink-0">
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          <span>Debug Send Probe:</span>
        </div>
        <input
          type="email"
          value={probeRecipient}
          onChange={(e) => setProbeRecipient(e.target.value)}
          placeholder="Enter recipient email to capture live Resend send response..."
          className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-indigo-500 ${
            isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
          }`}
        />
        <button
          type="button"
          onClick={() => executeDiagnostics(true)}
          disabled={runningSendProbe || runningCheck || !probeRecipient}
          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{runningSendProbe ? 'Probing...' : 'Probe Resend Send'}</span>
        </button>
      </div>

      {fatalError && (
        <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
          isDarkMode ? 'bg-rose-950/25 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Diagnostic Request Exception</div>
            <div className="font-mono text-[11px] mt-0.5">{fatalError}</div>
          </div>
        </div>
      )}

      {/* Diagnostic Status Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SMTP Connection Status */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            report.smtpConnection.status === 'CONNECTED'
              ? (isDarkMode ? 'bg-emerald-950/15 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200')
              : report.smtpConnection.status === 'FAILED'
              ? (isDarkMode ? 'bg-rose-950/15 border-rose-500/30' : 'bg-rose-50/60 border-rose-200')
              : (isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200')
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black">
                <Server className="w-4 h-4 text-slate-400" />
                <span>SMTP Connection Status</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                report.smtpConnection.status === 'CONNECTED'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : report.smtpConnection.status === 'FAILED'
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-amber-500/15 text-amber-500'
              }`}>
                {report.smtpConnection.status}
              </span>
            </div>

            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {report.smtpConnection.message}
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-slate-400">
              <span>Host: {report.smtpConnection.host || 'unset'}</span>
              <span>Port: {report.smtpConnection.port || 587}</span>
              {typeof report.smtpConnection.latencyMs === 'number' && (
                <span>Latency: {report.smtpConnection.latencyMs}ms</span>
              )}
              {report.smtpConnection.errorCode && (
                <span className="text-rose-500">Code: {report.smtpConnection.errorCode}</span>
              )}
            </div>
          </div>

          {/* Resend API Status */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            report.resendApi.connected && report.resendApi.mode === 'PRODUCTION'
              ? (isDarkMode ? 'bg-emerald-950/15 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200')
              : report.resendApi.connected
              ? (isDarkMode ? 'bg-amber-950/15 border-amber-500/30' : 'bg-amber-50/60 border-amber-200')
              : (isDarkMode ? 'bg-rose-950/15 border-rose-500/30' : 'bg-rose-50/60 border-rose-200')
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black">
                <Cloud className="w-4 h-4 text-slate-400" />
                <span>Resend API & Domain Probe</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                report.resendApi.mode === 'PRODUCTION'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : report.resendApi.mode === 'SANDBOX'
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-rose-500/15 text-rose-500'
              }`}>
                {report.resendApi.mode}
              </span>
            </div>

            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {report.resendApi.error
                ? report.resendApi.error
                : report.resendApi.verifiedDomains.length > 0
                ? `Verified Resend domain(s): ${report.resendApi.verifiedDomains.join(', ')}`
                : 'Resend API key active, but 0 custom sending domains verified.'}
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-slate-400">
              <span>Key: {report.hasResendKey ? 'Configured' : 'Missing'}</span>
              {typeof report.resendApi.httpStatus === 'number' && (
                <span>HTTP: {report.resendApi.httpStatus}</span>
              )}
              {typeof report.resendApi.latencyMs === 'number' && (
                <span>Latency: {report.resendApi.latencyMs}ms</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resend Send Response / Explicit Thrown Error Inspector */}
      {report?.resendSendResponse && (
        <div className={`p-4 rounded-2xl border space-y-2 ${
          report.resendSendResponse.ok
            ? (isDarkMode ? 'bg-emerald-950/15 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200')
            : (isDarkMode ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/70 border-rose-200')
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black">
              {report.resendSendResponse.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              )}
              <span>
                {report.resendSendResponse.ok
                  ? 'Resend Sending Response (Logged to Console)'
                  : `Explicit EmailDeliveryError Thrown (${report.resendSendResponse.error?.code || 'FAILED'})`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span>Provider: {report.resendSendResponse.provider}</span>
              {report.resendSendResponse.httpStatus && (
                <span>HTTP {report.resendSendResponse.httpStatus}</span>
              )}
              {report.resendSendResponse.messageId && (
                <span>ID: {report.resendSendResponse.messageId}</span>
              )}
            </div>
          </div>

          {report.resendSendResponse.error && (
            <div className={`text-xs font-medium ${isDarkMode ? 'text-rose-300' : 'text-rose-800'}`}>
              {report.resendSendResponse.error.message}
            </div>
          )}

          {report.resendSendResponse.rawResponse && (
            <pre className={`p-3 rounded-xl text-[11px] font-mono overflow-x-auto border ${
              isDarkMode ? 'bg-[#070B14] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              {JSON.stringify(report.resendSendResponse.rawResponse, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
