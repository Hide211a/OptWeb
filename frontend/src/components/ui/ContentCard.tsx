import { Box, Typography, alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ink } from '../../theme';

const darkContentSx = {
  '& .MuiTableCell-root': {
    color: alpha('#ecfdf5', 0.88),
    borderColor: alpha('#34d399', 0.08),
  },
  '& .MuiTableCell-head': {
    color: alpha('#ecfdf5', 0.55),
    bgcolor: alpha('#34d399', 0.06),
  },
  '& .MuiTableRow:hover': { bgcolor: alpha('#34d399', 0.06) },
  '& a': { color: '#34d399 !important' },
  '& .MuiTypography-colorTextSecondary': {
    color: `${alpha('#ecfdf5', 0.55)} !important`,
  },
  '& .MuiTypography-root': {
    color: alpha('#ecfdf5', 0.92),
  },
  '& .MuiChip-outlined': {
    borderColor: alpha('#34d399', 0.25),
    color: alpha('#ecfdf5', 0.85),
  },
  '& .MuiButton-outlined': {
    borderColor: alpha('#34d399', 0.32),
    color: '#ecfdf5',
    '&:hover': { borderColor: '#34d399', bgcolor: alpha('#34d399', 0.08) },
  },
  '& .MuiAlert-standardInfo': {
    bgcolor: alpha('#34d399', 0.1),
    color: '#ecfdf5',
    border: `1px solid ${alpha('#34d399', 0.2)}`,
  },
};

export function ContentCard({
  title,
  action,
  children,
  noPadding,
  sx,
  dark = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
  sx?: SxProps<Theme>;
  dark?: boolean;
}) {
  const body = noPadding ? (
    <Box className="table-scroll" sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Box sx={{ '& > .MuiTable-root': { minWidth: 640 } }}>{children}</Box>
    </Box>
  ) : (
    children
  );

  return (
    <Box
      sx={{
        bgcolor: dark ? '#1a3228' : '#fff',
        borderRadius: 3,
        border: '1px solid',
        borderColor: dark ? alpha('#34d399', 0.14) : alpha(ink, 0.08),
        overflow: 'hidden',
        ...sx,
      }}
    >
      {title && (
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: dark ? alpha('#34d399', 0.1) : alpha(ink, 0.06),
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: dark ? '#ecfdf5' : 'text.primary' }}>
            {title}
          </Typography>
          {action}
        </Box>
      )}
      <Box
        sx={{
          p: noPadding ? 0 : 2.5,
          ...(dark && darkContentSx),
        }}
      >
        {body}
      </Box>
    </Box>
  );
}
