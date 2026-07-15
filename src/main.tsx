import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {isSupabaseConfigured} from './supabase';
import {PREVIEW_MODE} from './previewData';
import './index.css';

const root = document.getElementById('root')!;

// Modo conferência (VITE_PREVIEW=true): renderiza a UI sem exigir Supabase.
if (!isSupabaseConfigured && !PREVIEW_MODE) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F8FA;color:#2A2F36;font-family:Inter,system-ui,sans-serif;padding:24px;text-align:center">
      <div style="max-width:440px">
        <div style="font-family:Georgia,serif;font-size:2rem;letter-spacing:-0.035em;color:#0D1B2A;margin:0 0 16px">Alfredo<span style="color:#1BA6B6">.</span></div>
        <h1 style="font-size:1.15rem;margin:0 0 12px;color:#0D1B2A">Configuração incompleta</h1>
        <p style="margin:0;color:#63717B;line-height:1.55">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>
          nas variáveis de ambiente do projeto na Vercel e faça um novo deploy.
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
