# ОптСклад — архітектура

## Тема диплому

**Система аналітики та реалізації продовольчих товарів в оптовій торгівлі**

## Призначення

Внутрішня web-система оптової бази продовольчих товарів: партійний облік, реалізація B2B-клієнтам, FEFO, аналітика для керівника.

## Відмінність від retail WMS (магазин техніки)

| Аспект | Retail (iShop) | ОптСклад |
|--------|----------------|----------|
| Одиниці | шт + IMEI | кг / л / уп + **партії** |
| Облік | StockBalance, серійники | **StockBatch** + термін придatності |
| Продаж | EXPENSE + резерв | **SHIPMENT** + **FEFO** |
| Клієнт | текст buyerName | сутність **Customer** + картка |
| Аналітика | залишки по брендах | **прострочення**, топ клієнтів, графік реалізації |

## Ключові сутності (Prisma)

- **Product** — товар з `shelfLifeDays`, одиницею виміру
- **StockBatch** — партія з `expiryDate`, `quantity`, `purchasePrice`
- **Customer** — оптовий клієнт (B2B)
- **Document** — надходження / реалізація / інвентаризація / списання
- **DocumentLine** — рядок; після FEFO може мати `batchId`

## Алгоритм FEFO

При проведенні **Реалізації** або **Списання**:

1. Для кожного рядка беруться партії товару з `quantity > 0`
2. Сортування: `expiryDate ASC`, потім `receivedAt ASC`
3. Списання йде з найраніших партій до покриття кількості
4. API `POST /api/documents/fefo-preview` показує план до проведення

Покрито unit-тестами: `backend/src/services/stock.service.test.ts`

## Ролі

| Роль | Фокус |
|------|--------|
| MANAGER | робочий стіл, документи, партії |
| DIRECTOR | аналітика, звіти (read-only) |
| ADMIN | довідники, користувачі, розпроведення |

## Стек

- Frontend: React 19, TypeScript, Vite, MUI, TanStack Query
- Backend: Node.js, Express, Prisma
- БД локально: SQLite · production: PostgreSQL (Railway)

## API (основне)

| Endpoint | Опис |
|----------|------|
| `GET /api/stock/batches` | партії з термінами |
| `POST /api/documents/fefo-preview` | preview FEFO |
| `GET /api/directories/customers/:id` | картка клієнта |
| `GET /api/reports/expiry` | звіт прострочення |
| `GET /api/dashboard` | KPI + графік + топ клієнтів |

## Деплой

- **Backend:** Railway (`backend/railway.toml`, `npm run start:prod`)
- **Frontend:** Vercel (`frontend/vercel.json`, `VITE_API_URL`)
