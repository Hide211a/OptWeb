import { Router } from 'express';
import { z } from 'zod';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';
import { writeAudit } from '../services/audit.service.js';

const priceBulkSchema = z.object({
  prices: z.array(
    z.object({
      productId: z.string(),
      unitPrice: z.number().min(0),
    }),
  ),
});

const router = Router();
router.use(requireAuth);

const nameSchema = z.object({ name: z.string().min(1) });

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  edrpou: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Categories
router.get('/categories', async (_req, res, next) => {
  try {
    const items = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/categories', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const { name } = nameSchema.parse(req.body);
    const item = await prisma.category.create({ data: { name } });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const { name } = nameSchema.parse(req.body);
    const item = await prisma.category.update({ where: { id: paramId(req) }, data: { name } });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: paramId(req) } });
    res.json({ ok: true });
  } catch (err) {
    next(new AppError('Не можна видалити: є повʼязані товари', 400));
  }
});

// Suppliers
router.get('/suppliers', async (_req, res, next) => {
  try {
    const items = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/suppliers', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const data = supplierSchema.parse(req.body);
    const item = await prisma.supplier.create({ data: { ...data, email: data.email || null } });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/suppliers/:id', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const data = supplierSchema.partial().parse(req.body);
    const item = await prisma.supplier.update({
      where: { id: paramId(req) },
      data: { ...data, email: data.email === '' ? null : data.email },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// Customers
router.get('/customers', async (_req, res, next) => {
  try {
    const items = await prisma.customer.findMany({ orderBy: { name: 'asc' } });

    const stats = await prisma.document.groupBy({
      by: ['customerId'],
      where: {
        customerId: { not: null },
        type: DocumentType.SHIPMENT,
        status: DocumentStatus.POSTED,
      },
      _count: { _all: true },
    });
    const statsMap = new Map(stats.map((s) => [s.customerId!, s._count._all]));

    res.json(
      items.map((c) => ({
        ...c,
        shipmentCount: statsMap.get(c.id) ?? 0,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: paramId(req) } });
    if (!customer) throw new AppError('Клієнта не знайдено', 404);

    const shipments = await prisma.document.findMany({
      where: {
        customerId: customer.id,
        type: DocumentType.SHIPMENT,
        status: DocumentStatus.POSTED,
      },
      include: {
        lines: { include: { product: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { postedAt: 'desc' },
      take: 20,
    });

    let totalQty = 0;
    let totalRevenue = 0;
    for (const doc of shipments) {
      for (const line of doc.lines) {
        totalQty += line.quantity;
        totalRevenue += line.quantity * (line.unitPrice ?? 0);
      }
    }

    res.json({
      customer,
      stats: {
        shipmentCount: shipments.length,
        totalQty: Math.round(totalQty * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        lastShipmentAt: shipments[0]?.postedAt ?? null,
      },
      shipments: shipments.map((d) => ({
        id: d.id,
        number: d.number,
        postedAt: d.postedAt,
        lineCount: d.lines.length,
        totalQty: d.lines.reduce((s, l) => s + l.quantity, 0),
        totalSum: Math.round(
          d.lines.reduce((s, l) => s + l.quantity * (l.unitPrice ?? 0), 0) * 100,
        ) / 100,
        createdBy: d.createdBy.fullName,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id/prices', async (req, res, next) => {
  try {
    const customerId = paramId(req);
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError('Клієнта не знайдено', 404);

    const prices = await prisma.customerPrice.findMany({
      where: { customerId },
      include: {
        product: { include: { category: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    res.json(
      prices.map((p) => ({
        id: p.id,
        productId: p.productId,
        unitPrice: p.unitPrice,
        updatedAt: p.updatedAt,
        product: p.product,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.put('/customers/:id/prices', requireRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const customerId = paramId(req);
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError('Клієнта не знайдено', 404);

    const { prices } = priceBulkSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      for (const row of prices) {
        if (row.unitPrice <= 0) {
          await tx.customerPrice.deleteMany({
            where: { customerId, productId: row.productId },
          });
          continue;
        }
        await tx.customerPrice.upsert({
          where: { customerId_productId: { customerId, productId: row.productId } },
          create: { customerId, productId: row.productId, unitPrice: row.unitPrice },
          update: { unitPrice: row.unitPrice },
        });
      }
    });

    await writeAudit({
      userId: req.user!.id,
      action: 'CUSTOMER_PRICE_UPDATE',
      entityType: 'Customer',
      entityId: customerId,
      summary: `Оновлено прайс-лист для ${customer.name}`,
      metadata: { count: prices.length },
    });

    const updated = await prisma.customerPrice.findMany({
      where: { customerId },
      include: { product: { include: { category: true } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/customers', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const data = customerSchema.parse(req.body);
    const item = await prisma.customer.create({ data: { ...data, email: data.email || null } });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/customers/:id', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const data = customerSchema.partial().parse(req.body);
    const item = await prisma.customer.update({
      where: { id: paramId(req) },
      data: { ...data, email: data.email === '' ? null : data.email },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

export default router;
