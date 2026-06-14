import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import productsRoutes from './routes/products.routes.js';
import directoriesRoutes from './routes/directories.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import stockRoutes from './routes/stock.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import usersRoutes from './routes/users.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import auditRoutes from './routes/audit.routes.js';
import { isAppError } from './lib/errors.js';
import { requireAuth } from './middleware/auth.js';

export const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin.split(',').map((o) => o.trim()), credentials: true }
      : undefined,
  ),
);
app.use(express.json());

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, status: 'ok', service: 'optsklad-api' }),
);

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/directories', directoriesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (isAppError(err)) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
});
