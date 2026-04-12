import { STATUS_BADGE, STATUS_LABEL } from '@/lib/format';

export function Badge({ variant, children }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const cls = STATUS_BADGE[status] || 'badge-gray';
  const label = STATUS_LABEL[status] || status || '—';
  return <span className={`badge ${cls}`}>{label}</span>;
}
