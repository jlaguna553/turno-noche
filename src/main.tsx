import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/styles.css';

// Sin StrictMode a proposito: el doble montaje recrearia el contexto WebGL y el
// mundo fisico (caro y con fugas de recursos en desarrollo).
const container = document.getElementById('root');
if (!container) throw new Error('Falta #root en index.html');

createRoot(container).render(<App />);
document.getElementById('boot-splash')?.remove();

// PWA: solo en produccion, para no interferir con HMR ni con el QA en dev.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(url).catch(() => undefined);
  });
}
