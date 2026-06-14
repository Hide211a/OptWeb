/** Нормалізація KPI — сумісність зі старим API до перезапуску backend */
export type DashboardKpi = {
  products?: number;
  customers?: number;
  postedToday?: number;
  postedTodayShipments?: number;
  draftCount?: number;
  shipmentsQtyMonth?: number;
  shipmentsQtyToday?: number;
  revenueMonthUah?: number;
  revenueTodayUah?: number;
  writeOffQtyMonth?: number;
  writeOffCountMonth?: number;
  lowStockCount?: number;
  /** @deprecated старе поле — лише кількість, без грн */
  shipmentsThisMonth?: number;
};

export function normalizeDashboardKpi(raw?: DashboardKpi | null): DashboardKpi | undefined {
  if (!raw) return undefined;
  const shipmentsQtyMonth = raw.shipmentsQtyMonth ?? raw.shipmentsThisMonth;
  return {
    ...raw,
    draftCount: raw.draftCount ?? 0,
    shipmentsQtyMonth,
    shipmentsQtyToday: raw.shipmentsQtyToday ?? raw.shipmentsThisMonth,
  };
}

/** Старий backend: є кількість відвантажень, але немає сум у грн */
export function isStaleDashboardApi(kpi?: DashboardKpi | null): boolean {
  if (!kpi) return false;
  const hasQty = (kpi.shipmentsQtyMonth ?? kpi.shipmentsThisMonth ?? 0) > 0;
  const hasRevenue =
    kpi.revenueMonthUah != null || kpi.revenueTodayUah != null;
  return hasQty && !hasRevenue;
}
