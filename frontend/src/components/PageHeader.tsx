import { Box, Typography, Breadcrumbs, Link, alpha } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export function PageHeader({
  title,
  subtitle,
  action,
  crumbs,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  crumbs?: { label: string; to?: string }[];
  dark?: boolean;
}) {
  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box>
        {crumbs && crumbs.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNextIcon sx={{ fontSize: 16 }} />}
            sx={{ mb: 1, '& .MuiBreadcrumbs-li': { fontSize: '0.8rem' } }}
          >
            {crumbs.map((c) =>
              c.to ? (
                <Link
                  key={c.label}
                  component={RouterLink}
                  to={c.to}
                  underline="hover"
                  sx={{
                    color: dark ? alpha('#ecfdf5', 0.55) : 'text.secondary',
                    fontWeight: 500,
                    '&:hover': { color: dark ? '#34d399' : 'primary.main' },
                  }}
                >
                  {c.label}
                </Link>
              ) : (
                <Typography key={c.label} sx={{ color: dark ? '#ecfdf5' : 'text.primary' }} fontWeight={600} fontSize="0.8rem">
                  {c.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: dark ? '#ecfdf5' : 'text.primary',
            position: 'relative',
            '&::after': {
              content: '""',
              display: 'block',
              width: 48,
              height: 4,
              borderRadius: 2,
              bgcolor: dark ? '#34d399' : 'primary.main',
              mt: 1,
            },
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ color: dark ? alpha('#ecfdf5', 0.6) : 'text.secondary', mt: 1.5, maxWidth: 520 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {action}
        </Box>
      )}
    </Box>
  );
}
