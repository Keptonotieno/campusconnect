import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Suppress expected Vite HMR WebSocket errors in preview environments where HMR is disabled
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const reasonMsg = reason?.message || String(reason || '');
  if (
    reasonMsg.includes('WebSocket') ||
    reasonMsg.includes('closed without opened') ||
    reasonMsg.includes('vite')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="Application Error Recovery">
    <App />
  </ErrorBoundary>
);
