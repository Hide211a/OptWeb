import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DocumentType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { previewFefoAllocations, postDocument } from './stock.service.js';

describe('FEFO — партійне списання', () => {
  let userId: string;
  let productId: string;
  let batchEarlyId: string;
  let batchLateId: string;
  const testSku = `TEST-FEFO-${Date.now()}`;

  beforeAll(async () => {
    const user = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
    const category = await prisma.category.findFirst();
    if (!user || !category) {
      throw new Error('Запустіть npm run db:seed перед тестами');
    }
    userId = user.id;

    const product = await prisma.product.create({
      data: {
        sku: testSku,
        name: 'Тест FEFO',
        categoryId: category.id,
        unit: 'KG',
        minStock: 0,
      },
    });
    productId = product.id;

    const early = await prisma.stockBatch.create({
      data: {
        productId,
        quantity: 10,
        purchasePrice: 20,
        expiryDate: new Date('2026-06-01T00:00:00Z'),
        receivedAt: new Date('2026-05-01T00:00:00Z'),
      },
    });
    const late = await prisma.stockBatch.create({
      data: {
        productId,
        quantity: 10,
        purchasePrice: 22,
        expiryDate: new Date('2026-07-01T00:00:00Z'),
        receivedAt: new Date('2026-05-02T00:00:00Z'),
      },
    });
    batchEarlyId = early.id;
    batchLateId = late.id;
  });

  afterAll(async () => {
    await prisma.documentLine.deleteMany({ where: { productId } });
    await prisma.document.deleteMany({
      where: { lines: { some: { productId } } },
    });
    await prisma.stockBatch.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it('previewFefoAllocations списує партію з найближчим терміном', async () => {
    const preview = await previewFefoAllocations([{ productId, quantity: 5 }]);
    expect(preview).toHaveLength(1);
    expect(preview[0].allocations[0].batchId).toBe(batchEarlyId);
    expect(preview[0].allocations[0].quantity).toBe(5);
    expect(preview[0].error).toBeUndefined();
  });

  it('previewFefoAllocations охоплює кілька партій', async () => {
    const preview = await previewFefoAllocations([{ productId, quantity: 15 }]);
    expect(preview[0].allocations).toHaveLength(2);
    expect(preview[0].allocations[0].quantity).toBe(10);
    expect(preview[0].allocations[1].quantity).toBe(5);
  });

  it('previewFefoAllocations повідомляє про нестачу залишку', async () => {
    const preview = await previewFefoAllocations([{ productId, quantity: 999 }]);
    expect(preview[0].error).toMatch(/Недостатній/);
  });

  it('postDocument для реалізації застосовує FEFO на складі', async () => {
    await prisma.stockBatch.update({ where: { id: batchEarlyId }, data: { quantity: 10 } });
    await prisma.stockBatch.update({ where: { id: batchLateId }, data: { quantity: 10 } });

    const customer = await prisma.customer.findFirst();
    if (!customer) throw new Error('No customer in seed');

    const doc = await prisma.document.create({
      data: {
        number: `TEST-VN-FEFO-${Date.now()}`,
        type: DocumentType.SHIPMENT,
        customerId: customer.id,
        createdById: userId,
        lines: {
          create: [{ productId, quantity: 8, unitPrice: 50, lineOrder: 0 }],
        },
      },
    });

    await postDocument(doc.id);

    const early = await prisma.stockBatch.findUnique({ where: { id: batchEarlyId } });
    const late = await prisma.stockBatch.findUnique({ where: { id: batchLateId } });
    expect(early?.quantity).toBe(2);
    expect(late?.quantity).toBe(10);
  });
});
