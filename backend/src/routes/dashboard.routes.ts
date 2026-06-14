import { Router } from 'express';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('DIRECTOR', 'ADMIN'));

const EXPIRY_WARN_DAYS = 7;

function monthStart() {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function shipmentsByDay(days: number) {
  const result: { date: string; revenue: number; qty: number; docCount: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const { start, end } = dayBounds(d);
    const sum = await sumLinesForDocs(DocumentType.SHIPMENT, start, end);
    result.push({
      date: start.toISOString().slice(0, 10),
      revenue: Math.round(sum.sumUah * 100) / 100,
      qty: sum.qty,
      docCount: sum.docCount,
    });
  }
  return result;
}

async function topCustomersThisMonth(limit = 5) {
  const docs = await prisma.document.findMany({
    where: {
      type: DocumentType.SHIPMENT,
      status: DocumentStatus.POSTED,
      postedAt: { gte: monthStart() },
      customerId: { not: null },
    },
    include: { customer: true, lines: true },
  });

  const map = new Map<
    string,
    { id: string; name: string; shipments: number; totalQty: number; totalSum: number }
  >();

  for (const doc of docs) {
    if (!doc.customerId || !doc.customer) continue;
    const cur = map.get(doc.customerId) ?? {
      id: doc.customerId,
      name: doc.customer.name,
      shipments: 0,
      totalQty: 0,
      totalSum: 0,
    };
    cur.shipments += 1;
    for (const line of doc.lines) {
      cur.totalQty += line.quantity;
      cur.totalSum += line.quantity * (line.unitPrice ?? 0);
    }
    map.set(doc.customerId, cur);
  }

  return [...map.values()]
    .sort((a, b) => b.totalSum - a.totalSum)
    .slice(0, limit)
    .map((r) => ({
      ...r,
      totalSum: Math.round(r.totalSum * 100) / 100,
      totalQty: Math.round(r.totalQty * 100) / 100,
    }));
}

async function sumLinesForDocs(
  type: DocumentType,
  from: Date,
  to?: Date,
): Promise<{ qty: number; sumUah: number; docCount: number }> {
  const docs = await prisma.document.findMany({
    where: {
      type,
      status: DocumentStatus.POSTED,
      postedAt: {
        gte: from,
        ...(to ? { lte: to } : {}),
      },
    },
    include: { lines: true },
  });
  let qty = 0;
  let sumUah = 0;
  for (const d of docs) {
    for (const l of d.lines) {
      qty += l.quantity;
      sumUah += l.quantity * (l.unitPrice ?? 0);
    }
  }
  return { qty, sumUah, docCount: docs.length };
}

router.get('/', async (_req, res, next) => {
  try {
    const warnDate = new Date();
    warnDate.setDate(warnDate.getDate() + EXPIRY_WARN_DAYS);
    const fromMonth = monthStart();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      productCount,
      customerCount,
      postedToday,
      postedTodayShipments,
      draftCount,
      batches,
      shipmentsMonth,
      shipmentsToday,
      writeOffsMonth,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.document.count({
        where: { status: DocumentStatus.POSTED, postedAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.document.count({
        where: {
          type: DocumentType.SHIPMENT,
          status: DocumentStatus.POSTED,
          postedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.document.count({ where: { status: DocumentStatus.DRAFT } }),
      prisma.stockBatch.findMany({
        where: { quantity: { gt: 0 } },
        include: { product: { include: { category: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      sumLinesForDocs(DocumentType.SHIPMENT, fromMonth),
      sumLinesForDocs(DocumentType.SHIPMENT, startOfDay, endOfDay),
      sumLinesForDocs(DocumentType.WRITE_OFF, fromMonth),
    ]);

    const stockByProduct = new Map<
      string,
      { stock: number; minStock: number; product: (typeof batches)[0]['product'] }
    >();
    for (const b of batches) {
      const cur = stockByProduct.get(b.productId) ?? {
        stock: 0,
        minStock: b.product.minStock,
        product: b.product,
      };
      cur.stock += b.quantity;
      stockByProduct.set(b.productId, cur);
    }

    const lowStock = [...stockByProduct.values()]
      .filter((x) => x.stock < x.minStock)
      .map((x) => ({ product: x.product, stock: x.stock, minStock: x.minStock }))
      .slice(0, 10);

    const expiringSoon = batches
      .filter((b) => b.expiryDate && b.expiryDate <= warnDate)
      .slice(0, 10);

    const recentDocs = await prisma.document.findMany({
      where: { status: DocumentStatus.POSTED },
      include: {
        supplier: true,
        customer: true,
        createdBy: { select: { fullName: true } },
      },
      orderBy: { postedAt: 'desc' },
      take: 8,
    });

    const draftPreview = await prisma.document.findMany({
      where: { status: DocumentStatus.DRAFT },
      include: { supplier: true, customer: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    const [shipmentsTrend, topCustomers] = await Promise.all([
      shipmentsByDay(14),
      topCustomersThisMonth(5),
    ]);

    res.json({
      kpi: {
        products: productCount,
        customers: customerCount,
        postedToday,
        draftCount,
        postedTodayShipments,
        shipmentsQtyMonth: shipmentsMonth.qty,
        revenueMonthUah: Math.round(shipmentsMonth.sumUah * 100) / 100,
        shipmentsQtyToday: shipmentsToday.qty,
        revenueTodayUah: Math.round(shipmentsToday.sumUah * 100) / 100,
        writeOffQtyMonth: writeOffsMonth.qty,
        writeOffCountMonth: writeOffsMonth.docCount,
        lowStockCount: lowStock.length,
      },
      lowStock,
      expiringSoon,
      recentDocs,
      draftPreview,
      shipmentsTrend,
      topCustomers,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
