import { Box, CircularProgress, Typography } from '@mui/material';

export function PageLoading({ label = 'Завантаження…' }: { label?: string }) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
      <CircularProgress size={36} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
