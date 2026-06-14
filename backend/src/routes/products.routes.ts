import { Router } from 'express';
import { z } from 'zod';
import { Unit, StorageZone } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getProductStock } from '../services/stock.service.js';
import { writeAudit } from '../services/audit.service.js';
import { paramId } from '../lib/params.js';
import { normalizeSku, validateSku } from '../lib/sku.js';

const router = Router();
router.use(requireAuth);

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string(),
  unit: z.nativeEnum(Unit),
  minStock: z.number().min(0).default(0),
  shelfLifeDays: z.number().int().positive().optional().nullable(),
  storageZone: z.nativeEnum(StorageZone).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search as string) ?? '';
    const categoryId = req.query.categoryId as string | undefined;
    const products = await prisma.product.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
              ],
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(req.query.storageZone
          ? { storageZone: req.query.storageZone as StorageZone }
          : {}),
        ...(req.query.inactiveOnly === 'true'
          ? { isActive: false }
          : req.query.activeOnly === 'true'
            ? { isActive: true }
            : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    const withStock = await Promise.all(
      products.map(async (p) => ({
        ...p,
        stock: await getProductStock(p.id),
      })),
    );

    res.json(withStock);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: paramId(req) },
      include: { category: true, batches: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: 'asc' } } },
    });
    if (!product) throw new AppError('Товар не знайдено', 404);
    const stock = await getProductStock(product.id);
    res.json({ ...product, stock });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new AppError('Категорія не знайдена', 400);
    const skuErr = validateSku(data.sku, category.name);
    if (skuErr) throw new AppError(skuErr, 400);
    const sku = normalizeSku(data.sku);
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) throw new AppError('Товар з таким SKU вже існує', 400);
    const product = await prisma.product.create({
      data: { ...data, sku, shelfLifeDays: data.shelfLifeDays ?? null },
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'PRODUCT_CREATE',
      entityType: 'Product',
      entityId: product.id,
      summary: `Додано товар ${product.sku}`,
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where: { id: paramId(req) },
      data: { ...data, shelfLifeDays: data.shelfLifeDays ?? undefined },
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'PRODUCT_UPDATE',
      entityType: 'Product',
      entityId: product.id,
      summary: `Оновлено товар ${product.sku}`,
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: paramId(req) },
      data: { isActive: false },
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'PRODUCT_DEACTIVATE',
      entityType: 'Product',
      entityId: product.id,
      summary: `Деактивовано товар ${product.sku}`,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/activate', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: paramId(req) },
      data: { isActive: true },
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

export default router;
