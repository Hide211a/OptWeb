import { Router } from 'express';
import { DocumentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getManagerNotifications } from '../services/workspace-notifications.service.js';

const router = Router();

const EXPIRY_WARN_DAYS = 7;

router.get('/notifications', requireAuth, requireRoles('MANAGER', 'ADMIN'), async (_req, res, next) => {
  try {
    const notifications = await getManagerNotifications();
    res.json({ notifications, total: notifications.reduce((s, n) => s + n.count, 0) });
  } catch (err) {
    next(err);
  }
});

router.get('/manager', requireAuth, requireRoles('MANAGER', 'ADMIN'), async (_req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const warnDate = new Date();
    warnDate.setDate(warnDate.getDate() + EXPIRY_WARN_DAYS);
    const now = new Date();

    const [drafts, draftCount, postedToday, batches] = await Promise.all([
      prisma.document.findMany({
        where: { status: DocumentStatus.DRAFT },
        include: {
          supplier: true,
          customer: true,
          lines: { include: { product: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.document.count({ where: { status: DocumentStatus.DRAFT } }),
      prisma.document.count({
        where: {
          status: DocumentStatus.POSTED,
          postedAt: { gte: startOfDay },
        },
      }),
      prisma.stockBatch.findMany({
        where: { quantity: { gt: 0 } },
        include: { product: { include: { category: true } } },
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

    const lowStock = [...stockByProduct.values()]
      .filter((x) => x.stock < x.minStock)
      .map((x) => ({ product: x.product, stock: x.stock, minStock: x.minStock }))
      .slice(0, 8);

    const expiredBatches = batches.filter((b) => b.expiryDate && b.expiryDate < now);
    const expiringSoon = batches
      .filter((b) => b.expiryDate && b.expiryDate <= warnDate && b.expiryDate >= now)
      .slice(0, 8)
      .map((b) => ({
        id: b.id,
        product: b.product,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
      }));

    const notifications = await getManagerNotifications();

    res.json({
      drafts,
      postedToday,
      lowStock,
      expiringSoon,
      expiredBatches: expiredBatches.slice(0, 8).map((b) => ({
        id: b.id,
        product: b.product,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
      })),
      expiredCount: expiredBatches.length,
      draftCount,
      notifications,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/admin', requireAuth, requireRoles('ADMIN'), async (_req, res, next) => {
  try {
    const [users, products, categories, suppliers, customers, inactiveProducts] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: false } }),
    ]);

    res.json({
      users,
      products,
      categories,
      suppliers,
      customers,
      inactiveProducts,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
