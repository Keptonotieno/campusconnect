import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './lib/firebase';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Verify connection to Firestore on boot as required by Firebase skill
testConnection();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="Application Error Recovery">
    <App />
  </ErrorBoundary>
);
