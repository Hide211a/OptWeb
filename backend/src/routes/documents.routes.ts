import { Router } from 'express';
import { z } from 'zod';
import { DocumentType, DocumentStatus, WriteOffReason } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { postDocument, unpostDocument, previewFefoAllocations } from '../services/stock.service.js';
import { writeAudit } from '../services/audit.service.js';
import { paramId } from '../lib/params.js';

const router = Router();
router.use(requireAuth);

const lineSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0).optional(),
  actualQuantity: z.number().min(0).optional(),
  productionDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

const docSchema = z.object({
  type: z.nativeEnum(DocumentType),
  date: z.string().datetime().optional(),
  notes: z.string().optional(),
  writeOffReason: z.nativeEnum(WriteOffReason).optional().nullable(),
  supplierId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

async function nextDocNumber(type: DocumentType): Promise<string> {
  const prefix: Record<DocumentType, string> = {
    RECEIPT: 'ПН',
    SHIPMENT: 'ВН',
    INVENTORY: 'ІН',
    WRITE_OFF: 'СП',
  };
  const count = await prisma.document.count({ where: { type } });
  const year = new Date().getFullYear();
  return `${prefix[type]}-${year}-${String(count + 1).padStart(4, '0')}`;
}

const docInclude = {
  lines: { include: { product: { include: { category: true } } }, orderBy: { lineOrder: 'asc' as const } },
  supplier: true,
  customer: true,
  createdBy: { select: { id: true, fullName: true, email: true } },
};

router.get('/', async (req, res, next) => {
  try {
    const type = req.query.type as DocumentType | undefined;
    const status = req.query.status as DocumentStatus | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const docs = await prisma.document.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(search ? { number: { contains: search } } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: docInclude,
      orderBy: { date: 'desc' },
    });
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

router.post('/fefo-preview', requireRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const schema = z.object({
      lines: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number().positive(),
        }),
      ),
    });
    const { lines } = schema.parse(req.body);
    const preview = await previewFefoAllocations(lines);
    res.json(preview);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: paramId(req) },
      include: docInclude,
    });
    if (!doc) throw new AppError('Документ не знайдено', 404);
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const data = docSchema.parse(req.body);
    const number = await nextDocNumber(data.type);

    const doc = await prisma.document.create({
      data: {
        number,
        type: data.type,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes,
        writeOffReason: data.type === DocumentType.WRITE_OFF ? (data.writeOffReason ?? null) : null,
        supplierId: data.supplierId ?? null,
        customerId: data.customerId ?? null,
        createdById: req.user!.id,
        lines: {
          create: data.lines.map((l, i) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            actualQuantity: l.actualQuantity,
            productionDate: l.productionDate ? new Date(l.productionDate) : null,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
            lineOrder: i,
          })),
        },
      },
      include: docInclude,
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'DOCUMENT_CREATE',
      entityType: 'Document',
      entityId: doc.id,
      summary: `Створено ${doc.number}`,
      metadata: { type: doc.type, status: doc.status },
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.document.findUnique({ where: { id: paramId(req) } });
    if (!existing) throw new AppError('Документ не знайдено', 404);
    if (existing.status === DocumentStatus.POSTED) {
      throw new AppError('Проведений документ не редагується', 400);
    }

    const data = docSchema.parse(req.body);
    await prisma.documentLine.deleteMany({ where: { documentId: paramId(req) } });

    const doc = await prisma.document.update({
      where: { id: paramId(req) },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        notes: data.notes,
        writeOffReason: data.type === DocumentType.WRITE_OFF ? (data.writeOffReason ?? null) : null,
        supplierId: data.supplierId ?? null,
        customerId: data.customerId ?? null,
        lines: {
          create: data.lines.map((l, i) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            actualQuantity: l.actualQuantity,
            productionDate: l.productionDate ? new Date(l.productionDate) : null,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
            lineOrder: i,
          })),
        },
      },
      include: docInclude,
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'DOCUMENT_UPDATE',
      entityType: 'Document',
      entityId: doc.id,
      summary: `Оновлено ${doc.number}`,
    });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/post', requireRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = paramId(req);
    await postDocument(id);
    const doc = await prisma.document.findUnique({
      where: { id },
      include: docInclude,
    });
    if (doc) {
      await writeAudit({
        userId: req.user!.id,
        action: 'DOCUMENT_POST',
        entityType: 'Document',
        entityId: doc.id,
        summary: `Проведено ${doc.number}`,
        metadata: { type: doc.type },
      });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/unpost', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const id = paramId(req);
    await unpostDocument(id);
    const doc = await prisma.document.findUnique({
      where: { id },
      include: docInclude,
    });
    if (doc) {
      await writeAudit({
        userId: req.user!.id,
        action: 'DOCUMENT_UNPOST',
        entityType: 'Document',
        entityId: doc.id,
        summary: `Розпроведено ${doc.number}`,
      });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: paramId(req) } });
    if (!doc) throw new AppError('Документ не знайдено', 404);
    if (doc.status === DocumentStatus.POSTED) {
      throw new AppError('Спочатку розпроведіть документ', 400);
    }
    await prisma.document.delete({ where: { id: paramId(req) } });
    await writeAudit({
      userId: req.user!.id,
      action: 'DOCUMENT_DELETE',
      entityType: 'Document',
      entityId: doc.id,
      summary: `Видалено ${doc.number}`,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
