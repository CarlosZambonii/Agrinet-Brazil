'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveAuth, decodeToken } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

export default function AuthModal({ tab: initialTab = 'login', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function doLogin() {
    setLoading(true);
    const e = email || 'demo@agrinet.io';
    const p = pwd || 'demo12345';
    try {
      const res = await api('/auth/login', 'POST', { email: e, password: p });
      const user = res.user || decodeToken(res.token);
      saveAuth(res.token, user);
      toast('Bem-vindo ao Agrinet!');
      onClose();
      router.refresh();
    } catch {
      saveAuthDemo(e);
    } finally {
      setLoading(false);
    }
  }

  async function doRegister() {
    setLoading(true);
    const e = email || 'demo@agrinet.io';
    const p = pwd || 'demo12345';
    try {
      const res = await api('/auth/register', 'POST', { email: e, password: p });
      const user = res.user || decodeToken(res.token);
      saveAuth(res.token, user);
      toast('Conta criada!');
      onClose();
      router.refresh();
    } catch {
      saveAuthDemo(e);
    } finally {
      setLoading(false);
    }
  }

  function saveAuthDemo(e) {
    const user = { id: 'demo-001', email: e || 'demo@agrinet.io', role: 'admin', reputation_score: 42, trust_level: 'verified', fraud_score: 0 };
    saveAuth('demo', user);
    toast('Modo demo — backend offline', 'info');
    onClose();
    router.refresh();
  }

  return (
    <div className="overlay" style={{ zIndex: 300 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--r-xl)', width: '100%', maxWidth: 400, padding: 40, boxShadow: 'var(--shadow-lg)', animation: 'slideUp .2s ease' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, color: 'var(--moss)', marginBottom: 4 }}>Agrinet</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28 }}>Marketplace agrícola descentralizado</div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 18px', fontSize: 14, cursor: 'pointer', fontWeight: 500,
              color: tab === t ? 'var(--moss)' : 'var(--text3)',
              borderBottom: tab === t ? '2px solid var(--moss)' : '2px solid transparent',
              marginBottom: -1, background: 'none',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              transition: 'all .15s',
            }}>
              {t === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          ))}
        </div>

        <div className="form-group">
          <label className="form-label">E-mail</label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Senha</label>
          <input type="password" placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? doLogin() : doRegister())} />
        </div>

        <button className="btn btn-primary btn-full mt-8" disabled={loading}
          onClick={tab === 'login' ? doLogin : doRegister}>
          {loading ? 'Aguarde...' : (tab === 'login' ? 'Entrar' : 'Criar conta')}
        </button>

        <div style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', marginTop: 14 }}>
          Clique em Entrar sem preencher para modo demo
        </div>
      </div>
    </div>
  );
}
