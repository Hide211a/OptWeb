import type { QueryClient } from '@tanstack/react-query';

/** Після зміни документів / залишків — оновити всі залежні екрани */
export function invalidateAfterStockChange(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: ['documents'] });
  qc.invalidateQueries({ queryKey: ['stock'] });
  qc.invalidateQueries({ queryKey: ['products'] });
  qc.invalidateQueries({ queryKey: ['report-stock'] });
  qc.invalidateQueries({ queryKey: ['report-movement'] });
  qc.invalidateQueries({ queryKey: ['report-top'] });
  qc.invalidateQueries({ queryKey: ['workspace-manager'] });
  qc.invalidateQueries({ queryKey: ['workspace-admin'] });
}
