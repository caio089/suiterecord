import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {isSupabaseConfigured} from './supabase';
import './index.css';

const root = document.getElementById('root')!;

if (!isSupabaseConfigured) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#090b0e;color:#e5e7eb;font-family:system-ui,sans-serif;padding:24px;text-align:center">
      <div style="max-width:420px">
        <h1 style="font-size:1.25rem;margin:0 0 12px">Configuração incompleta</h1>
        <p style="margin:0;opacity:.85;line-height:1.5">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>
          no Environment do Static Site no Render e faça
          <strong>Clear build cache &amp; deploy</strong>.
        </p>
      </div>
    </div>
  `;
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
