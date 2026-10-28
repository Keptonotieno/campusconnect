import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './lib/firebase';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Global error protection against uncaught runtime crashes on mobile & tablet webviews
window.addEventListener('error', (event) => {
  const msg = event?.message || String(event?.error || '');
  if (msg.includes('WebSocket') || msg.includes('vite') || msg.includes('HMR')) {
    return;
  }
  console.warn('[CampusConnect Runtime Intercept]', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const reasonMsg = reason?.message || String(reason || '');
  if (
    reasonMsg.includes('WebSocket') ||
    reasonMsg.includes('closed without opened') ||
    reasonMsg.includes('vite')
  ) {
    // Environment constraint: HMR is disabled in AI Studio preview. Ignore Vite WebSocket noise.
    event.preventDefault();
    return;
  }
  console.warn('[CampusConnect Promise Intercept]', reason);
});

// Verify connection to Firestore on boot as required by Firebase skill
testConnection();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="Application Error Recovery">
    <App />
  </ErrorBoundary>
);
