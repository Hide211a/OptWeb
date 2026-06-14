import 'dotenv/config';
import { bootstrapProduction } from './bootstrap.js';
import { app } from './app.js';

console.log('[start] OptSklad API booting…');
bootstrapProduction();

const PORT = Number(process.env.PORT) || 3002;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[start] API listening on ${HOST}:${PORT}`);
  console.log(`[start] health: /api/health (PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV ?? 'unset'})`);
});
