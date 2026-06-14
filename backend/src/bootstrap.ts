import { execSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd: string) {
  console.log(`[bootstrap] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, env: process.env });
}

export function bootstrapProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.startsWith('postgres')) {
    console.error('[bootstrap] WARN: DATABASE_URL is missing or not PostgreSQL.');
    console.error('[bootstrap] Add PostgreSQL plugin → Variables → DATABASE_URL (reference).');
    console.error('[bootstrap] API will start so healthcheck can pass; DB routes will fail until fixed.');
    return;
  }

  try {
    run('node scripts/prepare-schema.mjs');
    run('npx prisma generate');
  } catch (err) {
    console.error('[bootstrap] Prisma client setup failed:', err);
    return;
  }

  console.log('[bootstrap] db push + seed in background…');
  spawn('sh', ['-c', 'npx prisma db push --skip-generate && npx prisma db seed'], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  }).on('exit', (code) => {
    console.log(`[bootstrap] db setup finished (exit ${code ?? 0})`);
  });
}
