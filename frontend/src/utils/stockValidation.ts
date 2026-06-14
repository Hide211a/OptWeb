import type { Product } from '../types';

export function checkLineStock(
  productId: string,
  quantity: number,
  products: Product[],
  docType: string,
): string | null {
  if (docType !== 'SHIPMENT' && docType !== 'WRITE_OFF') return null;
  const p = products.find((x) => x.id === productId);
  if (!p) return null;
  const stock = p.stock ?? 0;
  if (quantity > stock) {
    return `Недостатньо на складі: є ${stock}, потрібно ${quantity}`;
  }
  return null;
}
