import { Router } from 'express';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('DIRECTOR', 'ADMIN'));

router.get('/stock', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        batches: { where: { quantity: { gt: 0 } } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(
      products.map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        unit: p.unit,
        quantity: p.batches.reduce((s, b) => s + b.quantity, 0),
        value: p.batches.reduce((s, b) => s + b.quantity * (b.purchasePrice ?? 0), 0),
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/movement', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const docs = await prisma.document.findMany({
      where: {
        status: DocumentStatus.POSTED,
        postedAt: { gte: from, lte: to },
      },
      include: {
        lines: { include: { product: true } },
        supplier: true,
        customer: true,
      },
      orderBy: { postedAt: 'asc' },
    });

    const rows = docs.flatMap((d) =>
      d.lines.map((l) => ({
        date: d.postedAt,
        documentNumber: d.number,
        type: d.type,
        product: l.product.name,
        sku: l.product.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        counterparty: d.supplier?.name ?? d.customer?.name ?? '—',
      })),
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/top-customers', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 90 * 86400000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const docs = await prisma.document.findMany({
      where: {
        type: DocumentType.SHIPMENT,
        status: DocumentStatus.POSTED,
        postedAt: { gte: from, lte: to },
        customerId: { not: null },
      },
      include: {
        customer: true,
        lines: true,
      },
    });

    const map = new Map<string, { name: string; shipments: number; totalQty: number; totalSum: number }>();
    for (const d of docs) {
      if (!d.customer) continue;
      const cur = map.get(d.customerId!) ?? {
        name: d.customer.name,
        shipments: 0,
        totalQty: 0,
        totalSum: 0,
      };
      cur.shipments += 1;
      for (const l of d.lines) {
        cur.totalQty += l.quantity;
        cur.totalSum += l.quantity * (l.unitPrice ?? 0);
      }
      map.set(d.customerId!, cur);
    }

    res.json([...map.values()].sort((a, b) => b.totalSum - a.totalSum).slice(0, 10));
  } catch (err) {
    next(err);
  }
});

router.get('/expiry', async (req, res, next) => {
  try {
    const expiringDays = req.query.expiringDays ? Number(req.query.expiringDays) : 7;
    const includeOk = req.query.includeOk === 'true';
    const now = new Date();
    const warnDate = new Date();
    warnDate.setDate(warnDate.getDate() + (Number.isNaN(expiringDays) ? 7 : expiringDays));

    const batches = await prisma.stockBatch.findMany({
      where: {
        quantity: { gt: 0 },
        product: { isActive: true },
      },
      include: {
        product: { include: { category: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    });

    const rows = batches
      .map((b) => {
        const expiry = b.expiryDate;
        const isExpired = expiry ? expiry < now : false;
        const isExpiringSoon = expiry ? expiry <= warnDate && !isExpired : false;
        let status: 'expired' | 'warning' | 'ok' | 'none' = 'none';
        if (isExpired) status = 'expired';
        else if (isExpiringSoon) status = 'warning';
        else if (expiry) status = 'ok';

        const daysLeft = expiry
          ? Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000)
          : null;

        return {
          id: b.id,
          productName: b.product.name,
          sku: b.product.sku,
          category: b.product.category.name,
          unit: b.product.unit,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          daysLeft,
          status,
          purchasePrice: b.purchasePrice,
          value: b.quantity * (b.purchasePrice ?? 0),
          receivedAt: b.receivedAt,
        };
      })
      .filter((r) => includeOk || r.status === 'expired' || r.status === 'warning');

    const summary = {
      expiredCount: rows.filter((r) => r.status === 'expired').length,
      expiringCount: rows.filter((r) => r.status === 'warning').length,
      totalQty: Math.round(rows.reduce((s, r) => s + r.quantity, 0) * 100) / 100,
      valueAtRisk: Math.round(rows.reduce((s, r) => s + r.value, 0) * 100) / 100,
      expiringDays: Number.isNaN(expiringDays) ? 7 : expiringDays,
    };

    res.json({ summary, rows });
  } catch (err) {
    next(err);
  }
});

export default router;
