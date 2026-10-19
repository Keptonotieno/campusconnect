import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './lib/firebase';

// Verify connection to Firestore on boot as required by Firebase skill
testConnection();

createRoot(document.getElementById('root')!).render(<App />);
