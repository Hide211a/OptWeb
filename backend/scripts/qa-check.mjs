/**
 * Full API QA check — run: node scripts/qa-check.mjs
 * Requires backend on http://localhost:3002
 */
const BASE = 'http://localhost:3002/api';

const accounts = {
  admin: { email: 'admin@optsklad.ua', password: 'demo123' },
  manager: { email: 'manager@optsklad.ua', password: 'demo123' },
  director: { email: 'director@optsklad.ua', password: 'demo123' },
};

const results = [];

async function login(role) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts[role]),
  });
  if (!res.ok) throw new Error(`Login ${role} failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

async function req(method, path, token, body, expectStatus) {
  const opts = {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  const statuses = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  const ok = statuses.includes(res.status);
  results.push({
    ok,
    method,
    path: path.replace(BASE, ''),
    status: res.status,
    expect: statuses.join('|'),
    error: ok ? null : (data?.error ?? text?.slice?.(0, 120)),
  });
  return { res, data, ok };
}

function section(name) {
  results.push({ section: name });
}

async function main() {
  // ── Health ──
  section('Health');
  await req('GET', '/health', null, null, 200);

  // ── Auth ──
  section('Auth');
  await req('POST', '/auth/login', null, { email: 'bad@test.com', password: 'wrong' }, 401);
  const tokens = {};
  for (const role of ['admin', 'manager', 'director']) {
    tokens[role] = await login(role);
    results.push({ ok: true, method: 'POST', path: `/auth/login (${role})`, status: 200, expect: '200' });
  }
  await req('GET', '/auth/me', tokens.manager, null, 200);
  await req('POST', '/auth/change-password', tokens.director, { currentPassword: 'demo123', newPassword: 'demo123' }, [200, 400]);

  // ── Products ──
  section('Products');
  for (const role of ['admin', 'manager', 'director']) {
    const { data } = await req('GET', '/products', tokens[role], null, 200);
    if (role === 'admin' && (!Array.isArray(data) || data.length === 0)) {
      results.push({ ok: false, method: 'GET', path: '/products (seed check)', status: 0, expect: 'data', error: 'empty products' });
    }
  }
  const { data: products } = await req('GET', '/products?storageZone=COLD', tokens.admin, null, 200);
  if (products?.length > 0) {
    await req('GET', `/products/${products[0].id}`, tokens.manager, null, 200);
  }
  await req('POST', '/products', tokens.manager, { sku: 'X', name: 'X', categoryId: 'x', unit: 'KG' }, 403);
  await req('POST', '/products', tokens.director, { sku: 'X', name: 'X', categoryId: 'x', unit: 'KG' }, 403);

  // ── Directories ──
  section('Directories');
  await req('GET', '/directories/categories', tokens.manager, null, 200);
  await req('GET', '/directories/suppliers', tokens.director, null, 200);
  const { data: customers } = await req('GET', '/directories/customers', tokens.manager, null, 200);
  if (customers?.[0]) {
    await req('GET', `/directories/customers/${customers[0].id}`, tokens.director, null, 200);
    await req('GET', `/directories/customers/${customers[0].id}/prices`, tokens.manager, null, 200);
  }
  await req('POST', '/directories/categories', tokens.manager, { name: 'TestCat' }, 403);

  // ── Stock ──
  section('Stock');
  await req('GET', '/stock', tokens.manager, null, 200);
  await req('GET', '/stock?lowOnly=true', tokens.director, null, 200);
  await req('GET', '/stock?expiringOnly=true', tokens.admin, null, 200);
  await req('GET', '/stock?zone=COLD', tokens.manager, null, 200);
  await req('GET', '/stock/batches', tokens.director, null, 200);
  await req('GET', '/stock/batches?expiredOnly=true', tokens.manager, null, 200);
  await req('GET', '/stock/batches?expiringDays=7', tokens.admin, null, 200);
  await req('GET', '/stock/batches?zone=DRY', tokens.manager, null, 200);

  // ── Documents ──
  section('Documents');
  await req('GET', '/documents', tokens.director, null, 200);
  await req('GET', '/documents?status=DRAFT', tokens.manager, null, 200);
  await req('GET', '/documents?search=ПН', tokens.admin, null, 200);
  const { data: docs } = await req('GET', '/documents', tokens.manager, null, 200);
  const draft = docs?.find((d) => d.status === 'DRAFT');
  const posted = docs?.find((d) => d.status === 'POSTED');
  if (draft) await req('GET', `/documents/${draft.id}`, tokens.director, null, 200);
  if (posted) await req('GET', `/documents/${posted.id}`, tokens.admin, null, 200);
  await req('POST', '/documents', tokens.director, { type: 'RECEIPT', lines: [] }, 403);
  await req('POST', '/documents/fefo-preview', tokens.manager, { type: 'SHIPMENT', lines: [] }, [200, 400]);

  // ── Dashboard ──
  section('Dashboard');
  await req('GET', '/dashboard', tokens.director, null, 200);
  await req('GET', '/dashboard', tokens.admin, null, 200);
  await req('GET', '/dashboard', tokens.manager, null, 403);

  // ── Reports ──
  section('Reports');
  await req('GET', '/reports/stock', tokens.director, null, 200);
  await req('GET', '/reports/movement', tokens.admin, null, 200);
  await req('GET', '/reports/top-customers', tokens.director, null, 200);
  await req('GET', '/reports/expiry?expiringDays=7', tokens.admin, null, 200);
  await req('GET', '/reports/stock', tokens.manager, null, 403);

  // ── Workspace ──
  section('Workspace');
  await req('GET', '/workspace/manager', tokens.manager, null, 200);
  await req('GET', '/workspace/manager', tokens.admin, null, 200);
  await req('GET', '/workspace/manager', tokens.director, null, 403);
  await req('GET', '/workspace/admin', tokens.admin, null, 200);
  await req('GET', '/workspace/admin', tokens.manager, null, 403);
  await req('GET', '/workspace/notifications', tokens.manager, null, 200);
  const { data: ws } = await req('GET', '/workspace/manager', tokens.manager, null, 200);
  if (!ws?.notifications || !Array.isArray(ws.notifications)) {
    results.push({ ok: false, method: 'GET', path: '/workspace/manager (notifications)', status: 0, expect: 'array', error: 'missing notifications' });
  }

  // ── Users ──
  section('Users');
  await req('GET', '/users', tokens.admin, null, 200);
  await req('GET', '/users', tokens.manager, null, 403);
  await req('GET', '/users', tokens.director, null, 403);

  // ── Audit ──
  section('Audit');
  await req('GET', '/audit', tokens.admin, null, 200);
  await req('GET', '/audit', tokens.director, null, 200);
  await req('GET', '/audit?limit=10', tokens.admin, null, 200);
  await req('GET', '/audit', tokens.manager, null, 403);

  // ── Summary ──
  const tests = results.filter((r) => !r.section);
  const passed = tests.filter((r) => r.ok).length;
  const failed = tests.filter((r) => !r.ok);

  console.log('\n=== ОПТСКЛАД API QA REPORT ===\n');
  let currentSection = '';
  for (const r of results) {
    if (r.section) {
      currentSection = r.section;
      console.log(`\n── ${currentSection} ──`);
      continue;
    }
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.method} ${r.path} → ${r.status} (expect ${r.expect})${r.error ? ` | ${r.error}` : ''}`);
  }
  console.log(`\n══════════════════════════════`);
  console.log(`PASSED: ${passed}/${tests.length}`);
  if (failed.length) {
    console.log(`FAILED: ${failed.length}`);
    process.exit(1);
  }
  console.log('ALL API CHECKS PASSED');
}

main().catch((e) => {
  console.error('QA script error:', e.message);
  process.exit(1);
});
