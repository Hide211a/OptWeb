export type ExpiryStatus = 'ok' | 'warning' | 'expired' | 'none';

export function expiryStatusLabel(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'Прострочено';
    case 'warning':
      return 'Скоро термін';
    case 'ok':
      return 'Придатний';
    default:
      return 'Без терміну';
  }
}

export function expiryStatusColor(status: ExpiryStatus): 'error' | 'warning' | 'success' | 'default' {
  switch (status) {
    case 'expired':
      return 'error';
    case 'warning':
      return 'warning';
    case 'ok':
      return 'success';
    default:
      return 'default';
  }
}

export function formatDaysLeft(days: number | null): string {
  if (days === null) return '—';
  if (days < 0) return `прострочено ${Math.abs(days)} дн.`;
  if (days === 0) return 'сьогодні';
  return `${days} дн.`;
}
