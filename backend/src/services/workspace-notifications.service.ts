import { DocumentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const EXPIRY_WARN_DAYS = 7;

export type WorkspaceNotification = {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  link: string;
  count: number;
};

export async function getManagerNotifications(): Promise<WorkspaceNotification[]> {
  const warnDate = new Date();
  warnDate.setDate(warnDate.getDate() + EXPIRY_WARN_DAYS);
  const now = new Date();

  const [draftCount, batches] = await Promise.all([
    prisma.document.count({ where: { status: DocumentStatus.DRAFT } }),
    prisma.stockBatch.findMany({
      where: { quantity: { gt: 0 } },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    }),
  ]);

  const stockByProduct = new Map<
    string,
    { product: (typeof batches)[0]['product']; stock: number; minStock: number }
  >();
  for (const b of batches) {
    const cur = stockByProduct.get(b.productId) ?? {
      product: b.product,
      stock: 0,
      minStock: b.product.minStock,
    };
    cur.stock += b.quantity;
    stockByProduct.set(b.productId, cur);
  }

  const lowStockCount = [...stockByProduct.values()].filter((x) => x.stock < x.minStock).length;
  const expiredCount = batches.filter((b) => b.expiryDate && b.expiryDate < now).length;
  const expiringCount = batches.filter(
    (b) => b.expiryDate && b.expiryDate <= warnDate && b.expiryDate >= now,
  ).length;

  const notifications: WorkspaceNotification[] = [];

  if (expiredCount > 0) {
    notifications.push({
      id: 'expired',
      severity: 'error',
      title: 'Прострочено на складі',
      message: `${expiredCount} партій потребують списання`,
      link: '/batches?expiredOnly=true',
      count: expiredCount,
    });
  }

  if (expiringCount > 0) {
    notifications.push({
      id: 'expiring',
      severity: 'warning',
      title: 'Термін ≤ 7 днів',
      message: `${expiringCount} партій під ризиком`,
      link: '/batches?expiringOnly=true',
      count: expiringCount,
    });
  }

  if (lowStockCount > 0) {
    notifications.push({
      id: 'low-stock',
      severity: 'warning',
      title: 'Низький залишок',
      message: `${lowStockCount} позицій нижче мінімуму`,
      link: '/stock?lowOnly=true',
      count: lowStockCount,
    });
  }

  if (draftCount > 0) {
    notifications.push({
      id: 'drafts',
      severity: 'info',
      title: 'Чернетки документів',
      message: `${draftCount} док. очікують проведення`,
      link: '/documents?status=DRAFT',
      count: draftCount,
    });
  }

  return notifications;
}
