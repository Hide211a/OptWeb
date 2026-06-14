import { Router } from 'express';
import { StorageZone } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const EXPIRY_WARN_DAYS = 7;

router.get('/', async (req, res, next) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const lowOnly = req.query.lowOnly === 'true';
    const expiringOnly = req.query.expiringOnly === 'true';
    const zone = req.query.zone as StorageZone | undefined;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        ...(zone ? { storageZone: zone } : {}),
      },
      include: {
        category: true,
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const warnDate = new Date();
    warnDate.setDate(warnDate.getDate() + EXPIRY_WARN_DAYS);

    const result = products
      .map((p) => {
        const totalStock = p.batches.reduce((s, b) => s + b.quantity, 0);
        const hasExpiring = p.batches.some(
          (b) => b.expiryDate && b.expiryDate <= warnDate,
        );
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
          minStock: p.minStock,
          category: p.category,
          totalStock,
          isLow: totalStock < p.minStock,
          hasExpiring,
          batches: p.batches,
        };
      })
      .filter((p) => {
        if (lowOnly && !p.isLow) return false;
        if (expiringOnly && !p.hasExpiring) return false;
        return p.totalStock > 0 || !expiringOnly;
      });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/batches', async (req, res, next) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const expiringDays = req.query.expiringDays
      ? Number(req.query.expiringDays)
      : undefined;
    const expiredOnly = req.query.expiredOnly === 'true';
    const zone = req.query.zone as StorageZone | undefined;

    const batches = await prisma.stockBatch.findMany({
      where: {
        quantity: { gt: 0 },
        ...(zone ? { storageZone: zone } : {}),
        product: {
          isActive: true,
          ...(categoryId ? { categoryId } : {}),
        },
      },
      include: {
        product: { include: { category: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    });

    const now = new Date();
    const warnDate = new Date();
    if (expiringDays !== undefined && !Number.isNaN(expiringDays)) {
      warnDate.setDate(warnDate.getDate() + expiringDays);
    } else {
      warnDate.setDate(warnDate.getDate() + EXPIRY_WARN_DAYS);
    }

    const result = batches
      .map((b) => {
        const expiry = b.expiryDate;
        const isExpired = expiry ? expiry < now : false;
        const isExpiringSoon = expiry ? expiry <= warnDate && !isExpired : false;
        let status: 'ok' | 'warning' | 'expired' | 'none' = 'none';
        if (isExpired) status = 'expired';
        else if (isExpiringSoon) status = 'warning';
        else if (expiry) status = 'ok';

        const daysLeft = expiry
          ? Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000)
          : null;

        return {
          id: b.id,
          quantity: b.quantity,
          purchasePrice: b.purchasePrice,
          expiryDate: b.expiryDate,
          storageZone: b.storageZone,
          receivedAt: b.receivedAt,
          receiptDocumentId: b.receiptDocumentId,
          daysLeft,
          status,
          product: {
            id: b.product.id,
            sku: b.product.sku,
            name: b.product.name,
            unit: b.product.unit,
            minStock: b.product.minStock,
            category: b.product.category,
          },
        };
      })
      .filter((b) => {
        if (expiredOnly) return b.status === 'expired';
        if (expiringDays !== undefined && !expiredOnly) {
          return b.status === 'warning' || b.status === 'expired';
        }
        return true;
      });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
