export const SKU_PATTERN = /^[A-Z]{3}-\d{3}$/;

export const CATEGORY_SKU_PREFIX: Record<string, string> = {
  'Молочні продукти': 'MLK',
  'Бакалія': 'BKL',
  'Напої': 'NAP',
  "М'ясні вироби": 'MTS',
  'Овочі та фрукти': 'OVO',
  'Заморозка': 'ZAM',
};

export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

export function validateSku(sku: string, categoryName?: string): string | null {
  const normalized = normalizeSku(sku);
  if (!SKU_PATTERN.test(normalized)) {
    return 'SKU має формат XXX-000 (3 літери та 3 цифри), напр. MLK-001';
  }
  if (categoryName) {
    const prefix = CATEGORY_SKU_PREFIX[categoryName];
    if (prefix && !normalized.startsWith(`${prefix}-`)) {
      return `Для категорії «${categoryName}» код має починатися з ${prefix}-`;
    }
  }
  return null;
}

export function suggestNextSku(prefix: string, existingSkus: string[]): string {
  const nums = existingSkus
    .filter((s) => normalizeSku(s).startsWith(`${prefix}-`))
    .map((s) => parseInt(normalizeSku(s).split('-')[1] ?? '', 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

export function skuHelperText(categoryName?: string): string {
  const prefix = categoryName ? CATEGORY_SKU_PREFIX[categoryName] : undefined;
  if (prefix) return `Формат: ${prefix}-000 (код відповідає категорії)`;
  return 'Формат: XXX-000 (напр. MLK-001)';
}
