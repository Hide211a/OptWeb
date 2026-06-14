# Алгоритм FEFO в ОптСклад

**FEFO** (First Expired, First Out) — списання з партій з найближчим терміном придатності. Використовується при **реалізації** та **списанні** продовольчих товарів.

## Вхідні дані

- `productId` — товар
- `quantity` — потрібна кількість для списання
- Партії з `quantity > 0`, відсортовані:
  1. `expiryDate ASC` (найраніший термін першим; `NULL` — в кінці)
  2. `receivedAt ASC` (при однаковому терміні — старіша партія першою)

## Псевдокод

```
FUNCTION allocateFefo(productId, requestedQty):
  batches ← GET batches WHERE productId AND quantity > 0
            ORDER BY expiryDate ASC, receivedAt ASC

  remaining ← requestedQty
  allocations ← []

  FOR EACH batch IN batches:
    IF remaining ≤ 0: BREAK
    take ← MIN(batch.quantity, remaining)
    allocations.APPEND({ batchId: batch.id, quantity: take })
    remaining ← remaining - take

  IF remaining > 0:
    RETURN ERROR "Недостатньо залишку"

  RETURN allocations
```

## Приклад

| Партія | Термін придатності | Кількість |
|--------|-------------------|-----------|
| B1 | 01.06.2026 | 10 кг |
| B2 | 15.06.2026 | 10 кг |

Запит: **списати 15 кг** → B1: 10 кг + B2: 5 кг.

## Реалізація в проєкті

| Файл | Призначення |
|------|-------------|
| `backend/src/services/stock.service.ts` | `previewFefoAllocations`, `deductFefo`, `postDocument` |
| `POST /api/documents/fefo-preview` | Preview до проведення |
| `frontend/src/components/DocumentForm.tsx` | Крок 4 майстра — план FEFO |
| `backend/src/services/stock.service.test.ts` | Unit-тести |

## Надходження та термін

При **надходженні** менеджер може вказати **термін придатності** на рядку документа. Якщо не вказано — система розраховує з `shelfLifeDays` товару від дати документа.

## Обмеження поточної версії

- Один рядок документа після проведення зберігає `batchId` лише якщо списання з **однієї** партії; при кількох партіях — позначка «кілька партій».
- Інвентаризацію **не можна розпровести** (коригування лише новим документом).
