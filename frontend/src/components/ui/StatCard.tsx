import { Box, Typography, alpha } from '@mui/material';
import type { ReactNode } from 'react';

const accents = {
  forest: { main: '#047857', glow: 'rgba(4, 120, 87, 0.14)' },
  coral: { main: '#ea580c', glow: 'rgba(234, 88, 12, 0.14)' },
  teal: { main: '#0d9488', glow: 'rgba(13, 148, 136, 0.14)' },
  gold: { main: '#d97706', glow: 'rgba(217, 119, 6, 0.14)' },
  violet: { main: '#7c3aed', glow: 'rgba(124, 58, 237, 0.14)' },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'forest',
  dark = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  accent?: keyof typeof accents;
  dark?: boolean;
}) {
  const c = accents[accent];
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: dark ? '#1a3228' : '#fff',
        border: '1px solid',
        borderColor: dark ? alpha('#34d399', 0.16) : alpha('#0f1a14', 0.08),
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: dark ? `0 12px 32px ${alpha('#000', 0.35)}` : `0 12px 32px ${c.glow}`,
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: c.glow,
        }}
      />
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" position="relative">
        <Box>
          <Typography variant="body2" sx={{ color: dark ? alpha('#ecfdf5', 0.65) : 'text.secondary' }} fontWeight={600} mb={0.5}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ color: dark ? '#ecfdf5' : 'text.primary' }}>
            {value}
          </Typography>
          {hint ? (
            <Typography variant="caption" sx={{ color: dark ? alpha('#ecfdf5', 0.45) : 'text.secondary' }} display="block" mt={0.5}>
              {hint}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: c.glow,
            color: c.main,
          }}
        >
          {icon}
        </Box>
      </Box>
    </Box>
  );
}
