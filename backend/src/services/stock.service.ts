import { DocumentType, DocumentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

const MS_PER_DAY = 86_400_000;

export async function getProductStock(productId: string): Promise<number> {
  const agg = await prisma.stockBatch.aggregate({
    where: { productId, quantity: { gt: 0 } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function getBatchesForFefo(productId: string) {
  return prisma.stockBatch.findMany({
    where: { productId, quantity: { gt: 0 } },
    orderBy: [
      { expiryDate: 'asc' },
      { receivedAt: 'asc' },
    ],
  });
}

export type FefoAllocationPreview = {
  batchId: string;
  quantity: number;
  expiryDate: Date | null;
  receivedAt: Date;
};

export type FefoLinePreview = {
  productId: string;
  productName: string;
  unit: string;
  requestedQty: number;
  allocations: FefoAllocationPreview[];
  error?: string;
};

export async function previewFefoAllocations(
  lines: { productId: string; quantity: number }[],
): Promise<FefoLinePreview[]> {
  const validLines = lines.filter((l) => l.productId && l.quantity > 0);
  if (validLines.length === 0) return [];

  const productIds = [...new Set(validLines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const allBatches = await prisma.stockBatch.findMany({
    where: { productId: { in: productIds }, quantity: { gt: 0 } },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
  });

  const virtualQty = new Map(allBatches.map((b) => [b.id, b.quantity]));
  const results: FefoLinePreview[] = [];

  for (const line of validLines) {
    const product = productMap.get(line.productId);
    if (!product) continue;

    let remaining = line.quantity;
    const allocations: FefoAllocationPreview[] = [];
    const productBatches = allBatches.filter((b) => b.productId === line.productId);

    for (const batch of productBatches) {
      if (remaining <= 0) break;
      const available = virtualQty.get(batch.id) ?? 0;
      if (available <= 0) continue;
      const take = Math.min(available, remaining);
      virtualQty.set(batch.id, available - take);
      allocations.push({
        batchId: batch.id,
        quantity: take,
        expiryDate: batch.expiryDate,
        receivedAt: batch.receivedAt,
      });
      remaining -= take;
    }

    results.push({
      productId: line.productId,
      productName: product.name,
      unit: product.unit,
      requestedQty: line.quantity,
      allocations,
      error: remaining > 0.0001 ? 'Недостатній залишок на складі' : undefined,
    });
  }

  return results;
}

async function deductFefo(
  tx: Prisma.TransactionClient,
  productId: string,
  needed: number,
): Promise<{ batchId: string; quantity: number }[]> {
  const batches = await tx.stockBatch.findMany({
    where: { productId, quantity: { gt: 0 } },
    orderBy: [
      { expiryDate: 'asc' },
      { receivedAt: 'asc' },
    ],
  });

  let remaining = needed;
  const allocations: { batchId: string; quantity: number }[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    await tx.stockBatch.update({
      where: { id: batch.id },
      data: { quantity: batch.quantity - take },
    });
    allocations.push({ batchId: batch.id, quantity: take });
    remaining -= take;
  }

  if (remaining > 0.0001) {
    throw new AppError('Недостатній залишок на складі', 400);
  }

  return allocations;
}

export async function postDocument(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      lines: { include: { product: true }, orderBy: { lineOrder: 'asc' } },
    },
  });

  if (!doc) throw new AppError('Документ не знайдено', 404);
  if (doc.status === DocumentStatus.POSTED) {
    throw new AppError('Документ уже проведено', 400);
  }
  if (doc.lines.length === 0) {
    throw new AppError('Додайте хоча б один рядок', 400);
  }

  if (doc.type === DocumentType.RECEIPT && !doc.supplierId) {
    throw new AppError('Оберіть постачальника', 400);
  }
  if (doc.type === DocumentType.SHIPMENT && !doc.customerId) {
    throw new AppError('Оберіть клієнта', 400);
  }

  await prisma.$transaction(async (tx) => {
    switch (doc.type) {
      case DocumentType.RECEIPT: {
        for (const line of doc.lines) {
          const shelfDays = line.product.shelfLifeDays;
          const expiryDate = line.expiryDate
            ? new Date(line.expiryDate)
            : shelfDays
              ? new Date(doc.date.getTime() + shelfDays * MS_PER_DAY)
              : null;

          await tx.stockBatch.create({
            data: {
              productId: line.productId,
              quantity: line.quantity,
              purchasePrice: line.unitPrice ?? undefined,
              productionDate: line.productionDate ?? undefined,
              expiryDate: expiryDate ?? undefined,
              storageZone: line.product.storageZone,
              receivedAt: doc.date,
              receiptDocumentId: doc.id,
            },
          });
        }
        break;
      }

      case DocumentType.SHIPMENT:
      case DocumentType.WRITE_OFF: {
        for (const line of doc.lines) {
          const allocations = await deductFefo(tx, line.productId, line.quantity);
          if (allocations.length === 1) {
            await tx.documentLine.update({
              where: { id: line.id },
              data: { batchId: allocations[0].batchId },
            });
          }
        }
        break;
      }

      case DocumentType.INVENTORY: {
        for (const line of doc.lines) {
          const actual = line.actualQuantity ?? line.quantity;
          const current = await tx.stockBatch.aggregate({
            where: { productId: line.productId, quantity: { gt: 0 } },
            _sum: { quantity: true },
          });
          const currentQty = current._sum.quantity ?? 0;
          const diff = actual - currentQty;

          if (diff > 0.0001) {
            await tx.stockBatch.create({
              data: {
                productId: line.productId,
                quantity: diff,
                storageZone: line.product.storageZone,
                receivedAt: doc.date,
                receiptDocumentId: doc.id,
              },
            });
          } else if (diff < -0.0001) {
            await deductFefo(tx, line.productId, -diff);
          }
        }
        break;
      }
    }

    await tx.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.POSTED, postedAt: new Date() },
    });
  });
}

export async function unpostDocument(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { lines: true },
  });

  if (!doc) throw new AppError('Документ не знайдено', 404);
  if (doc.status !== DocumentStatus.POSTED) {
    throw new AppError('Документ не проведено', 400);
  }

  await prisma.$transaction(async (tx) => {
    switch (doc.type) {
      case DocumentType.RECEIPT: {
        await tx.stockBatch.deleteMany({ where: { receiptDocumentId: doc.id } });
        break;
      }
      case DocumentType.SHIPMENT:
      case DocumentType.WRITE_OFF: {
        for (const line of doc.lines) {
          if (line.batchId) {
            await tx.stockBatch.update({
              where: { id: line.batchId },
              data: { quantity: { increment: line.quantity } },
            });
          } else {
            const batches = await tx.stockBatch.findMany({
              where: { productId: line.productId },
              orderBy: { receivedAt: 'desc' },
              take: 1,
            });
            if (batches[0]) {
              await tx.stockBatch.update({
                where: { id: batches[0].id },
                data: { quantity: { increment: line.quantity } },
              });
            } else {
              await tx.stockBatch.create({
                data: {
                  productId: line.productId,
                  quantity: line.quantity,
                  receivedAt: doc.date,
                },
              });
            }
          }
        }
        break;
      }
      case DocumentType.INVENTORY: {
        throw new AppError('Розпроведення інвентаризації не підтримується', 400);
      }
    }

    await tx.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.DRAFT, postedAt: null },
    });
  });
}
