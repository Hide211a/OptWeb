import { PrismaClient, Role, Unit, DocumentType, DocumentStatus, StorageZone } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  'Молочні продукти',
  'Бакалія',
  'Напої',
  'М\'ясні вироби',
  'Овочі та фрукти',
  'Заморозка',
];

const products: {
  sku: string;
  name: string;
  category: string;
  unit: Unit;
  minStock: number;
  shelfLifeDays?: number;
}[] = [
  { sku: 'MLK-001', name: 'Молоко 2.5% 1л', category: 'Молочні продукти', unit: 'L', minStock: 50, shelfLifeDays: 5 },
  { sku: 'MLK-002', name: 'Кефір 1л', category: 'Молочні продукти', unit: 'L', minStock: 30, shelfLifeDays: 7 },
  { sku: 'MLK-003', name: 'Сметана 20% 400г', category: 'Молочні продукти', unit: 'PACK', minStock: 40, shelfLifeDays: 10 },
  { sku: 'BKL-001', name: 'Борошно пшеничне 1кг', category: 'Бакалія', unit: 'KG', minStock: 100 },
  { sku: 'BKL-002', name: 'Цукор 1кг', category: 'Бакалія', unit: 'KG', minStock: 80 },
  { sku: 'BKL-003', name: 'Олія соняшникова 1л', category: 'Бакалія', unit: 'L', minStock: 60 },
  { sku: 'BKL-004', name: 'Гречка 1кг', category: 'Бакалія', unit: 'KG', minStock: 70 },
  { sku: 'NAP-001', name: 'Вода мінеральна 1.5л', category: 'Напої', unit: 'PCS', minStock: 120 },
  { sku: 'NAP-002', name: 'Сік яблучний 1л', category: 'Напої', unit: 'L', minStock: 40, shelfLifeDays: 180 },
  { sku: 'MTS-001', name: 'Ковбаса варена 500г', category: 'М\'ясні вироби', unit: 'KG', minStock: 25, shelfLifeDays: 14 },
  { sku: 'MTS-002', name: 'Куряче філе охол.', category: 'М\'ясні вироби', unit: 'KG', minStock: 30, shelfLifeDays: 5 },
  { sku: 'OVO-001', name: 'Картопля', category: 'Овочі та фрукти', unit: 'KG', minStock: 200, shelfLifeDays: 30 },
  { sku: 'OVO-002', name: 'Яблука', category: 'Овочі та фрукти', unit: 'KG', minStock: 80, shelfLifeDays: 21 },
  { sku: 'ZAM-001', name: 'Овочева суміш замор.', category: 'Заморозка', unit: 'PACK', minStock: 50, shelfLifeDays: 365 },
  { sku: 'ZAM-002', name: 'Пельмені 1кг', category: 'Заморозка', unit: 'PACK', minStock: 40, shelfLifeDays: 180 },
];

function zoneForCategory(category: string): StorageZone {
  if (category === 'Заморозка') return StorageZone.FROZEN;
  if (category === 'Молочні продукти' || category === "М'ясні вироби") return StorageZone.COLD;
  return StorageZone.DRY;
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.customerPrice.deleteMany();
  await prisma.documentLine.deleteMany();
  await prisma.document.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('demo123', 10);

  const [admin, manager, director] = await Promise.all([
    prisma.user.create({
      data: { email: 'admin@optsklad.ua', passwordHash: hash, fullName: 'Олена Адмін', role: Role.ADMIN },
    }),
    prisma.user.create({
      data: { email: 'manager@optsklad.ua', passwordHash: hash, fullName: 'Ігор Менеджер', role: Role.MANAGER },
    }),
    prisma.user.create({
      data: { email: 'director@optsklad.ua', passwordHash: hash, fullName: 'Марія Директор', role: Role.DIRECTOR },
    }),
  ]);

  const catMap = new Map<string, string>();
  for (const name of categories) {
    const c = await prisma.category.create({ data: { name } });
    catMap.set(name, c.id);
  }

  const productMap = new Map<string, string>();
  for (const p of products) {
    const prod = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        categoryId: catMap.get(p.category)!,
        unit: p.unit,
        minStock: p.minStock,
        shelfLifeDays: p.shelfLifeDays ?? null,
        storageZone: zoneForCategory(p.category),
      },
    });
    productMap.set(p.sku, prod.id);
  }

  const [supplier1, supplier2] = await Promise.all([
    prisma.supplier.create({
      data: { name: 'ТОВ «Молочний край»', phone: '+380501111111', address: 'м. Київ' },
    }),
    prisma.supplier.create({
      data: { name: 'ПрАТ «Бакалія-Плюс»', phone: '+380502222222', address: 'м. Львів' },
    }),
  ]);

  const [customer1, customer2, customer3] = await Promise.all([
    prisma.customer.create({
      data: { name: 'Магазин «Свіжий ранок»', phone: '+380631111111', address: 'м. Київ, вул. Хрещатик 1' },
    }),
    prisma.customer.create({
      data: { name: 'Кафе «Смак»', phone: '+380632222222', address: 'м. Київ, вул. Басейна 5' },
    }),
    prisma.customer.create({
      data: { name: 'Ресторан «Гостинність»', edrpou: '12345678', phone: '+380673333333' },
    }),
  ]);

  // Posted receipt
  const receipt = await prisma.document.create({
    data: {
      number: 'ПН-2026-0001',
      type: DocumentType.RECEIPT,
      status: DocumentStatus.POSTED,
      date: new Date(),
      postedAt: new Date(),
      supplierId: supplier1.id,
      createdById: manager.id,
      lines: {
        create: [
          { productId: productMap.get('MLK-001')!, quantity: 200, unitPrice: 28, lineOrder: 0 },
          { productId: productMap.get('MLK-002')!, quantity: 100, unitPrice: 26, lineOrder: 1 },
          { productId: productMap.get('MTS-002')!, quantity: 50, unitPrice: 145, lineOrder: 2 },
        ],
      },
    },
    include: { lines: true },
  });

  for (const line of receipt.lines) {
    const product = await prisma.product.findUnique({ where: { id: line.productId } });
    const expiry = product?.shelfLifeDays
      ? new Date(Date.now() + product.shelfLifeDays * 86400000)
      : null;
    await prisma.stockBatch.create({
      data: {
        productId: line.productId,
        quantity: line.quantity,
        purchasePrice: line.unitPrice ?? undefined,
        expiryDate: expiry ?? undefined,
        storageZone: product?.storageZone ?? StorageZone.DRY,
        receiptDocumentId: receipt.id,
      },
    });
  }

  const receipt2 = await prisma.document.create({
    data: {
      number: 'ПН-2026-0002',
      type: DocumentType.RECEIPT,
      status: DocumentStatus.POSTED,
      date: new Date(Date.now() - 86400000 * 3),
      postedAt: new Date(Date.now() - 86400000 * 3),
      supplierId: supplier2.id,
      createdById: manager.id,
      lines: {
        create: [
          { productId: productMap.get('BKL-001')!, quantity: 500, unitPrice: 18, lineOrder: 0 },
          { productId: productMap.get('BKL-003')!, quantity: 150, unitPrice: 42, lineOrder: 1 },
          { productId: productMap.get('NAP-001')!, quantity: 300, unitPrice: 12, lineOrder: 2 },
        ],
      },
    },
    include: { lines: true },
  });

  for (const line of receipt2.lines) {
    const product = await prisma.product.findUnique({ where: { id: line.productId } });
    const expiry = product?.shelfLifeDays
      ? new Date(Date.now() - 86400000 * 3 + (product.shelfLifeDays ?? 0) * 86400000)
      : null;
    await prisma.stockBatch.create({
      data: {
        productId: line.productId,
        quantity: line.quantity,
        purchasePrice: line.unitPrice ?? undefined,
        expiryDate: expiry ?? undefined,
        storageZone: product?.storageZone ?? StorageZone.DRY,
        receivedAt: new Date(Date.now() - 86400000 * 3),
        receiptDocumentId: receipt2.id,
      },
    });
  }

  // Draft shipment
  await prisma.document.create({
    data: {
      number: 'ВН-2026-0001',
      type: DocumentType.SHIPMENT,
      status: DocumentStatus.DRAFT,
      customerId: customer1.id,
      createdById: manager.id,
      notes: 'Замовлення на п\'ятницю',
      lines: {
        create: [
          { productId: productMap.get('MLK-001')!, quantity: 40, unitPrice: 35, lineOrder: 0 },
          { productId: productMap.get('BKL-001')!, quantity: 100, unitPrice: 24, lineOrder: 1 },
        ],
      },
    },
  });

  // Posted shipment
  const shipment = await prisma.document.create({
    data: {
      number: 'ВН-2026-0002',
      type: DocumentType.SHIPMENT,
      status: DocumentStatus.POSTED,
      date: new Date(Date.now() - 86400000),
      postedAt: new Date(Date.now() - 86400000),
      customerId: customer2.id,
      createdById: manager.id,
      lines: {
        create: [
          { productId: productMap.get('MLK-001')!, quantity: 30, unitPrice: 36, lineOrder: 0 },
        ],
      },
    },
    include: { lines: true },
  });

  const batches = await prisma.stockBatch.findMany({
    where: { productId: productMap.get('MLK-001')!, quantity: { gt: 0 } },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
  });
  let remaining = 30;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    await prisma.stockBatch.update({
      where: { id: batch.id },
      data: { quantity: batch.quantity - take },
    });
    await prisma.documentLine.update({
      where: { id: shipment.lines[0].id },
      data: { batchId: batch.id },
    });
    remaining -= take;
  }

  // Партії з простроченим терміном (для демо списання на захисті)
  const receiptExpired = await prisma.document.create({
    data: {
      number: 'ПН-2026-0003',
      type: DocumentType.RECEIPT,
      status: DocumentStatus.POSTED,
      date: new Date(Date.now() - 86400000 * 12),
      postedAt: new Date(Date.now() - 86400000 * 12),
      supplierId: supplier1.id,
      createdById: manager.id,
      notes: 'Стара поставка — термін минув',
      lines: {
        create: [
          { productId: productMap.get('MLK-002')!, quantity: 25, unitPrice: 24, lineOrder: 0 },
          { productId: productMap.get('MTS-002')!, quantity: 15, unitPrice: 140, lineOrder: 1 },
        ],
      },
    },
    include: { lines: true },
  });

  const expiredBatchMeta = [
    { lineIndex: 0, daysAgo: 3 },
    { lineIndex: 1, daysAgo: 2 },
  ] as const;

  for (const meta of expiredBatchMeta) {
    const line = receiptExpired.lines[meta.lineIndex];
    await prisma.stockBatch.create({
      data: {
        productId: line.productId,
        quantity: line.quantity,
        purchasePrice: line.unitPrice ?? undefined,
        expiryDate: new Date(Date.now() - 86400000 * meta.daysAgo),
        storageZone: (await prisma.product.findUnique({ where: { id: line.productId } }))?.storageZone ?? StorageZone.COLD,
        receivedAt: new Date(Date.now() - 86400000 * 12),
        receiptDocumentId: receiptExpired.id,
      },
    });
  }

  // Партія «термін ≤ 7 днів» — для робочого столу менеджера
  await prisma.stockBatch.create({
    data: {
      productId: productMap.get('MLK-003')!,
      quantity: 35,
      purchasePrice: 32,
      expiryDate: new Date(Date.now() + 86400000 * 4),
      storageZone: StorageZone.COLD,
      receivedAt: new Date(Date.now() - 86400000 * 6),
      receiptDocumentId: receipt.id,
    },
  });

  // Прайс-лист B2B для «Свіжий ранок»
  const priceList = [
    { sku: 'MLK-001', price: 35 },
    { sku: 'MLK-002', price: 33 },
    { sku: 'BKL-001', price: 24 },
    { sku: 'BKL-003', price: 48 },
    { sku: 'NAP-001', price: 15 },
  ];
  for (const item of priceList) {
    const productId = productMap.get(item.sku);
    if (!productId) continue;
    await prisma.customerPrice.create({
      data: { customerId: customer1.id, productId, unitPrice: item.price },
    });
  }

  // Початкові записи журналу дій
  await prisma.auditLog.createMany({
    data: [
      {
        userId: manager.id,
        action: 'DOCUMENT_POST',
        entityType: 'Document',
        entityId: receipt.id,
        summary: `Проведено ${receipt.number}`,
      },
      {
        userId: admin.id,
        action: 'USER_CREATE',
        entityType: 'User',
        entityId: manager.id,
        summary: 'Ініціалізація демо-даних',
      },
    ],
  });

  console.log('Seed OK');
  console.log('Admin:    admin@optsklad.ua / demo123');
  console.log('Manager:  manager@optsklad.ua / demo123');
  console.log('Director: director@optsklad.ua / demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
