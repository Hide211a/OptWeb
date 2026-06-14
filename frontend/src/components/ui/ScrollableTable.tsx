import { Table, TableContainer, useMediaQuery, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

export function ScrollableTable({
  children,
  minWidth = 560,
  compactMinWidth,
  sx,
}: {
  children: ReactNode;
  minWidth?: number;
  /** Narrower minWidth below md breakpoint (900px) */
  compactMinWidth?: number;
  sx?: SxProps<Theme>;
}) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));

  const tableMin = isCompact && compactMinWidth != null ? compactMinWidth : minWidth;

  return (
    <TableContainer
      className="table-scroll"
      sx={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        ...sx,
      }}
    >
      <Table size="small" sx={{ minWidth: tableMin }}>
        {children}
      </Table>
    </TableContainer>
  );
}
