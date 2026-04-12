'use client';
import { useState } from 'react';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { catLabel, CAT_EMOJI, formatCurrency, formatDate } from '@/lib/format';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

export default function ListingDetail({ listing, onClose }) {
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const l = listing;

  async function buy() {
    const q = parseFloat(qty);
    if (!q || q <= 0) return toast('Informe a quantidade', 'error');
    setLoading(true);
    try {
      await api('/transactions/from-listing', 'POST', { listingId: l.id, quantity: q });
      toast('Compra iniciada! Acesse seu perfil para pagar.');
      onClose();
      router.push('/perfil?tab=transacoes');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="560px">
      <ModalHeader title={l.title} onClose={onClose} />

      <div style={{ height: 180, borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={`listing-img-bg ${l.category || 'outros'}`} style={{ width: '100%', height: '100%', fontSize: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {CAT_EMOJI[l.category] || '📦'}
        </div>
      </div>

      <div className="flex-between mb-16">
        <div>
          <div className="flex gap-8 mb-8">
            <Badge variant="green">{catLabel(l.category)}</Badge>
            <Badge variant="gray">{l.unit}</Badge>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 700, color: 'var(--moss)', lineHeight: 1 }}>{formatCurrency(l.price)}</div>
          <div style={{ fontSize: 15, color: 'var(--text3)', marginTop: 4 }}>por {l.unit}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-xs text-muted mb-8" style={{ letterSpacing: '.06em', textTransform: 'uppercase' }}>Disponível</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--soil)' }}>
            {Number(l.quantity_available).toLocaleString('pt-BR')} {l.unit}
          </div>
        </div>
      </div>

      {l.description && (
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>{l.description}</div>
      )}

      <div className="flex-between text-sm text-muted mb-16">
        <span>📍 {l.city}, {l.state}</span>
        <span>{formatDate(l.created_at)}</span>
      </div>

      <div className="divider" />

      <div className="form-group">
        <label className="form-label">Quantidade que deseja comprar</label>
        <input type="number" placeholder="Ex: 10" min="1" value={qty} onChange={e => setQty(e.target.value)} />
      </div>

      <div className="flex gap-8">
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={buy} disabled={loading}>
          {loading ? 'Aguarde...' : 'Comprar agora'}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}
