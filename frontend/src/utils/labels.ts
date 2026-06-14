import type { DocumentType, DocumentStatus, Unit, Role, WriteOffReason, StorageZone, AuditAction } from '../types';

export const unitLabels: Record<Unit, string> = {
  KG: 'кг',
  L: 'л',
  PCS: 'шт',
  PACK: 'уп',
};

export const docTypeLabels: Record<DocumentType, string> = {
  RECEIPT: 'Надходження',
  SHIPMENT: 'Реалізація',
  INVENTORY: 'Інвентаризація',
  WRITE_OFF: 'Списання',
};

export const docStatusLabels: Record<DocumentStatus, string> = {
  DRAFT: 'Чернетка',
  POSTED: 'Проведено',
};

export const writeOffReasonLabels: Record<WriteOffReason, string> = {
  EXPIRED: 'Прострочення',
  DAMAGE: 'Брак / пошкодження',
  OTHER: 'Інше',
};

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Адміністратор',
  MANAGER: 'Менеджер складу',
  DIRECTOR: 'Керівник',
};

export const storageZoneLabels: Record<StorageZone, string> = {
  DRY: 'Сухий склад',
  COLD: 'Холодильник',
  FROZEN: 'Морозильник',
};

export const auditActionLabels: Record<AuditAction, string> = {
  DOCUMENT_CREATE: 'Документ створено',
  DOCUMENT_UPDATE: 'Документ оновлено',
  DOCUMENT_DELETE: 'Документ видалено',
  DOCUMENT_POST: 'Документ проведено',
  DOCUMENT_UNPOST: 'Розпроведення',
  USER_CREATE: 'Користувач створений',
  USER_UPDATE: 'Користувач оновлений',
  PRODUCT_CREATE: 'Товар додано',
  PRODUCT_UPDATE: 'Товар оновлено',
  PRODUCT_DEACTIVATE: 'Товар деактивовано',
  PASSWORD_CHANGE: 'Зміна пароля',
  CUSTOMER_PRICE_UPDATE: 'Прайс-лист оновлено',
};

export function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('uk-UA');
}

export function formatDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('uk-UA');
}
