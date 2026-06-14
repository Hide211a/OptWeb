import { execSync, spawn } from 'node:child_process';

function run(cmd) {
  console.log(`[start] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

const isProd = process.env.NODE_ENV === 'production';
const dbUrl = process.env.DATABASE_URL ?? '';

if (isProd && !dbUrl.startsWith('postgres')) {
  console.error('[start] ERROR: DATABASE_URL must point to PostgreSQL in production.');
  console.error('[start] Add PostgreSQL plugin and link DATABASE_URL in Railway Variables.');
  process.exit(1);
}

try {
  run('node scripts/prepare-schema.mjs');
  run('npx prisma generate');
} catch (err) {
  console.error('[start] Prisma client setup failed:', err?.message ?? err);
  process.exit(1);
}

console.log('[start] launching API (DB migrate runs in background)…');
const server = spawn('node', ['dist/index.js'], { stdio: 'inherit', env: process.env });

server.on('error', (err) => {
  console.error('[start] Server failed to start:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code ?? 1);
});

const dbSetup = spawn(
  'sh',
  ['-c', 'npx prisma db push --skip-generate && npx prisma db seed'],
  { stdio: 'inherit', env: process.env },
);

dbSetup.on('exit', (code) => {
  console.log(`[start] db setup finished (exit ${code ?? 0})`);
});
