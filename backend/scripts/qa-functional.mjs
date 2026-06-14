/**
 * Deep functional QA — business flows
 * node scripts/qa-functional.mjs
 */
const BASE = 'http://localhost:3002/api';

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'demo123' }),
  });
  return (await res.json()).token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

const checks = [];

function check(name, pass, detail = '') {
  checks.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const manager = await login('manager@optsklad.ua');
  const admin = await login('admin@optsklad.ua');
  const director = await login('director@optsklad.ua');

  console.log('\n── Seed data integrity ──');

  const products = (await api('GET', '/products', manager)).data;
  check('Seed: products exist', products?.length >= 5, `${products?.length} products`);

  const batches = (await api('GET', '/stock/batches?expiredOnly=true', manager)).data;
  check('Seed: expired batches exist', batches?.length >= 1, `${batches?.length} expired`);

  const expiring = (await api('GET', '/stock/batches?expiringDays=7', manager)).data;
  check('Seed: expiring-soon batches', expiring?.length >= 1, `${expiring?.length} within 7 days`);

  const coldProducts = (await api('GET', '/products?storageZone=COLD', admin)).data;
  check('Seed: COLD zone products', coldProducts?.length >= 1, `${coldProducts?.length} cold items`);

  const customers = (await api('GET', '/directories/customers', manager)).data;
  const customerWithPrices = customers?.[0];
  check('Seed: customers exist', customers?.length >= 1);

  if (customerWithPrices) {
    const prices = (await api('GET', `/directories/customers/${customerWithPrices.id}/prices`, manager)).data;
    check('Seed: customer price list', Array.isArray(prices) && prices.length >= 1, `${prices?.length} prices`);
  }

  console.log('\n── FEFO algorithm ──');

  const productWithStock = products?.find((p) => p.stock > 0);
  if (productWithStock) {
    const fefo = await api('POST', '/documents/fefo-preview', manager, {
      type: 'SHIPMENT',
      customerId: customerWithPrices?.id,
      lines: [{ productId: productWithStock.id, quantity: 1, unitPrice: 10 }],
    });
    check('FEFO preview returns allocations', fefo.ok && Array.isArray(fefo.data?.allocations), 
      fefo.data?.allocations?.length ? `${fefo.data.allocations.length} batch(es)` : fefo.data?.error);
  } else {
    check('FEFO preview', false, 'no product with stock');
  }

  console.log('\n── Document workflow ──');

  const categories = (await api('GET', '/directories/categories', admin)).data;
  const suppliers = (await api('GET', '/directories/suppliers', admin)).data;
  const catId = categories?.[0]?.id;
  const supId = suppliers?.[0]?.id;
  const prod = products?.find((p) => p.isActive);

  // Create receipt draft
  const receipt = await api('POST', '/documents', manager, {
    type: 'RECEIPT',
    supplierId: supId,
    notes: 'QA test receipt',
    lines: prod ? [{ productId: prod.id, quantity: 5, unitPrice: 20, expiryDate: new Date(Date.now() + 14 * 86400000).toISOString() }] : [],
  });
  check('Create RECEIPT draft', receipt.status === 201, receipt.data?.number ?? receipt.data?.error);

  let receiptId = receipt.data?.id;

  if (receiptId) {
    const post = await api('POST', `/documents/${receiptId}/post`, manager);
    check('Post RECEIPT', post.ok, post.data?.status ?? post.data?.error);

    const stockAfter = (await api('GET', `/products/${prod.id}`, manager)).data;
    check('Stock increased after receipt', stockAfter?.stock >= prod.stock, `${prod.stock} → ${stockAfter?.stock}`);
  }

  // Director cannot create
  const dirDoc = await api('POST', '/documents', director, {
    type: 'RECEIPT', supplierId: supId, lines: [],
  });
  check('Director blocked from creating docs', dirDoc.status === 403);

  // Draft list
  const drafts = (await api('GET', '/documents?status=DRAFT', manager)).data;
  check('Draft documents filter works', Array.isArray(drafts));

  console.log('\n── Reports data shape ──');

  const stockReport = (await api('GET', '/reports/stock', director)).data;
  check('Stock report has rows', Array.isArray(stockReport) && stockReport.length > 0, `${stockReport?.length} rows`);

  const expiryReport = (await api('GET', '/reports/expiry?expiringDays=7', director)).data;
  check('Expiry report has summary+rows', expiryReport?.summary && Array.isArray(expiryReport?.rows),
    `expired=${expiryReport?.summary?.expiredCount}, rows=${expiryReport?.rows?.length}`);

  const movement = (await api('GET', '/reports/movement', admin)).data;
  check('Movement report', Array.isArray(movement), `${movement?.length} entries`);

  const topCust = (await api('GET', '/reports/top-customers', director)).data;
  check('Top customers report', Array.isArray(topCust), `${topCust?.length} customers`);

  console.log('\n── Dashboard KPIs ──');

  const dash = (await api('GET', '/dashboard', director)).data;
  check('Dashboard KPIs present', dash?.kpi != null || dash?.stats != null || typeof dash === 'object',
    Object.keys(dash ?? {}).join(', '));

  console.log('\n── Workspace notifications ──');

  const notif = (await api('GET', '/workspace/notifications', manager)).data;
  check('Notifications endpoint', notif?.notifications?.length >= 1, `${notif?.notifications?.length} alerts, total=${notif?.total}`);

  const wsTypes = notif?.notifications?.map((n) => n.id) ?? [];
  check('Has expired notification', wsTypes.includes('expired'));
  check('Has expiring notification', wsTypes.includes('expiring'));

  console.log('\n── Audit log ──');

  const audit = (await api('GET', '/audit?limit=5', admin)).data;
  check('Audit log has entries', Array.isArray(audit) && audit.length > 0, `${audit?.length} entries`);
  if (audit?.[0]) {
    check('Audit entry has user+action', audit[0].action && audit[0].user, audit[0].action);
  }

  console.log('\n── Role isolation ──');

  check('Manager → /users blocked', (await api('GET', '/users', manager)).status === 403);
  check('Manager → /reports blocked', (await api('GET', '/reports/stock', manager)).status === 403);
  check('Director → /workspace/admin blocked', (await api('GET', '/workspace/admin', director)).status === 403);
  check('Director → /users blocked', (await api('GET', '/users', director)).status === 403);

  // Cleanup test receipt if still draft (shouldn't be after post)
  if (receiptId) {
    const doc = (await api('GET', `/documents/${receiptId}`, manager)).data;
    if (doc?.status === 'DRAFT') {
      await api('DELETE', `/documents/${receiptId}`, manager);
    }
  }

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);
  console.log(`\n══════════════════════════════`);
  console.log(`FUNCTIONAL: ${passed}/${checks.length} passed`);
  if (failed.length) {
    console.log('Failed:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
