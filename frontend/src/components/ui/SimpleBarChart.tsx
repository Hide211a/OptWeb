import { Box, Typography, alpha } from '@mui/material';

export type BarChartPoint = {
  label: string;
  value: number;
};

export function SimpleBarChart({
  data,
  valueFormatter = (v) => String(v),
  height = 180,
  dark = false,
}: {
  data: BarChartPoint[];
  valueFormatter?: (value: number) => string;
  height?: number;
  dark?: boolean;
}) {
  if (data.length === 0) {
    return (
      <Typography
        sx={{ color: dark ? alpha('#ecfdf5', 0.5) : 'text.secondary' }}
        textAlign="center"
        py={4}
      >
        Немає даних для графіка
      </Typography>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.5, sm: 1 }, height, pt: 2, overflowX: 'auto', pb: 0.5 }}>
      {data.map((point) => {
        const pct = Math.max((point.value / max) * 100, point.value > 0 ? 8 : 0);
        return (
          <Box
            key={point.label}
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <Typography
              variant="caption"
              noWrap
              sx={{ maxWidth: '100%', color: dark ? alpha('#ecfdf5', 0.55) : 'text.secondary', fontWeight: 700 }}
            >
              {point.value > 0 ? valueFormatter(point.value) : '—'}
            </Typography>
            <Box
              sx={{
                width: '100%',
                maxWidth: 48,
                height: `${pct}%`,
                minHeight: point.value > 0 ? 8 : 2,
                borderRadius: '10px 10px 4px 4px',
                background: point.value > 0
                  ? `linear-gradient(180deg, #10b981 0%, ${alpha('#047857', 0.85)} 100%)`
                  : alpha('#047857', 0.12),
                transition: 'height 0.3s ease',
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: { xs: '0.58rem', sm: '0.65rem' },
                textAlign: 'center',
                color: dark ? alpha('#ecfdf5', 0.45) : 'text.secondary',
                lineHeight: 1.2,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {point.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
