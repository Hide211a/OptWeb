import type { SxProps, Theme } from '@mui/material/styles';

/** Hide table column on phone (< 600px) */
export const hideOnXs: SxProps<Theme> = { display: { xs: 'none', sm: 'table-cell' } };

/** Hide table column on phone and small tablet (< 900px) */
export const hideOnMobile: SxProps<Theme> = { display: { xs: 'none', md: 'table-cell' } };

/** Responsive minWidth for ScrollableTable */
export function tableMinWidth(full: number, compact = Math.min(full, 360)) {
  return { xs: compact, sm: Math.min(full, full * 0.75), md: full } as const;
}
