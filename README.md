# ОптСклад — система аналітики та реалізації продовольчих товарів

Бакалаврський дипломний проєкт: веб-застосунок для **оптової торгівлі продовольчими товарами**.

**Тема:** Система аналітики та реалізації продовольчих товарів в оптовій торгівлі.

## Стек

- **Frontend:** React 19, TypeScript, Vite, MUI, TanStack Query
- **Backend:** Node.js, Express, TypeScript, Prisma, Vitest
- **БД (локально):** SQLite — `backend/prisma/dev.db`
- **БД (production):** PostgreSQL на Railway

## Можливості

- **Партійний облік** з терміном придatності
- **FEFO** при реалізації та списанні (з preview)
- **Оптові клієнти** — картка, історія реалізації, оборот
- **Майстер документів** (4 кроки)
- **Аналітика:** dashboard з графіком, звіт прострочення, топ клієнтів
- Звіти + експорт CSV
- Ролі: ADMIN, MANAGER, DIRECTOR

## Демо-акаунти

| Роль | Email | Пароль |
|------|-------|--------|
| Адміністратор | admin@optsklad.ua | demo123 |
| Менеджер складу | manager@optsklad.ua | demo123 |
| Керівник | director@optsklad.ua | demo123 |

## Запуск локально

### Backend (термінал 1)

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

API: http://localhost:3002

### Frontend (термінал 2)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

UI: http://localhost:5173

### Тести FEFO

```bash
cd backend
npm test
```

## Деплой (production)

| Частина | Платформа |
|---------|-----------|
| Frontend | [Vercel](https://vercel.com) — Root: `frontend` |
| Backend + PostgreSQL | [Railway](https://railway.app) — Root: `backend` |

**Backend (Railway):**

1. New Project → Deploy from GitHub → Root Directory: `backend`
2. Додати PostgreSQL plugin
3. Env: `DATABASE_URL` (з plugin), `JWT_SECRET`, `CORS_ORIGIN` (URL Vercel), `NODE_ENV=production`
4. Healthcheck: `GET /api/health`

**Frontend (Vercel):**

1. Import repo → Root: `frontend`
2. Env: `VITE_API_URL=https://<railway-host>/api`

Детальніше: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [Сценарій захисту](docs/DEFENSE_GUIDE.md) · [Діаграми](docs/DIAGRAMS.md)

## Структура

```
├── backend/     # REST API + Prisma + тести FEFO
├── frontend/    # React SPA
└── docs/        # ARCHITECTURE.md, REQUIREMENTS.md
```

## Сценарій для захисту (7 хв)

1. **manager@optsklad.ua** → Робочий стіл → «Термін ≤ 7 днів»
2. **Партії** — фільтр прострочення, пояснити FEFO
3. **Документи** → Майстер **Реалізації** → крок 4 preview FEFO → Провести
4. **Клієнти** → картка → історія відвантажень
5. **director@optsklad.ua** → Аналітика (графік + топ клієнтів)
6. **Звіти** → вкладка **Прострочення** → експорт CSV

## Відмінність від iShop (TechnoSvit)

ОптСклад — **опт продовольства**: партії, терміни, FEFO, B2B-клієнти.  
iShop — **retail техніки**: IMEI, бренди, резервування. Див. таблицю в `docs/ARCHITECTURE.md`.
