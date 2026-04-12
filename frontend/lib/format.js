export function formatCurrency(value) {
  return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function catLabel(c) {
  return { graos: 'Grãos', frutas: 'Frutas', gado: 'Pecuária', maquinas: 'Máquinas', outros: 'Outros' }[c] || c || '—';
}

export function histLabel(t) {
  return { deposit: 'Depósito recebido', purchase: 'Compra realizada', sale: 'Venda recebida', refund: 'Reembolso', withdraw: 'Saque' }[t] || t;
}

export const STATUS_BADGE = {
  pending: 'badge-wheat', paid: 'badge-green', completed: 'badge-green',
  cancelled: 'badge-gray', disputed: 'badge-rust', refunded: 'badge-gray',
  active: 'badge-green', paused: 'badge-wheat', sold: 'badge-gray',
  open: 'badge-wheat', succeeded: 'badge-green', failed: 'badge-rust',
};

export const STATUS_LABEL = {
  pending: 'Pendente', paid: 'Pago', completed: 'Concluído',
  cancelled: 'Cancelado', disputed: 'Em disputa', refunded: 'Reembolsado',
  active: 'Ativo', paused: 'Pausado', sold: 'Vendido',
  open: 'Aberta', succeeded: 'Confirmado', failed: 'Falhou',
};

export const CAT_EMOJI = { graos: '🌾', frutas: '🍎', gado: '🐄', maquinas: '🚜', outros: '📦' };
