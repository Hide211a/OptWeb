import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  alpha,
  Chip,
} from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import type { SxProps, Theme } from '@mui/material/styles';
import type { WorkspaceNotification } from '../types';

const severityStyle = {
  error: {
    accent: '#dc2626',
    bg: '#fef2f2',
    icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />,
  },
  warning: {
    accent: '#d97706',
    bg: '#fffbeb',
    icon: <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />,
  },
  info: {
    accent: '#2563eb',
    bg: '#eff6ff',
    icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} />,
  },
} as const;

type NotificationPanelProps = {
  notifications: WorkspaceNotification[];
  onItemClick?: () => void;
  showHeader?: boolean;
  maxHeight?: number;
  sx?: SxProps<Theme>;
};

export function NotificationPanel({
  notifications,
  onItemClick,
  showHeader = true,
  maxHeight = 320,
  sx,
}: NotificationPanelProps) {
  const total = notifications.reduce((s, n) => s + n.count, 0);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 380,
        borderRadius: 3,
        border: '1px solid',
        borderColor: alpha('#047857', 0.12),
        bgcolor: '#fff',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {showHeader && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: alpha('#047857', 0.08),
            background: `linear-gradient(135deg, ${alpha('#047857', 0.06)} 0%, ${alpha('#047857', 0.02)} 100%)`,
          }}
        >
          <NotificationsNoneOutlinedIcon sx={{ fontSize: 20, color: '#047857' }} />
          <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
            Сповіщення
          </Typography>
          {total > 0 && (
            <Chip
              label={total}
              size="small"
              sx={{
                height: 22,
                fontWeight: 800,
                bgcolor: alpha('#047857', 0.12),
                color: '#047857',
              }}
            />
          )}
        </Box>
      )}

      {notifications.length === 0 ? (
        <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
          <CheckCircleOutlineRoundedIcon sx={{ fontSize: 32, color: alpha('#047857', 0.35), mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Немає активних сповіщень
          </Typography>
        </Box>
      ) : (
        <Stack
          sx={{
            maxHeight,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: alpha('#047857', 0.2), borderRadius: 4 },
          }}
        >
          {notifications.map((n, idx) => {
            const style = severityStyle[n.severity];
            return (
              <Box
                key={n.id}
                component={RouterLink}
                to={n.link}
                onClick={onItemClick}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.75,
                  py: 1.25,
                  textDecoration: 'none',
                  color: 'inherit',
                  borderBottom: idx < notifications.length - 1 ? '1px solid' : 'none',
                  borderColor: alpha('#0f172a', 0.06),
                  transition: 'background 0.15s',
                  '&:hover': { bgcolor: alpha(style.accent, 0.04) },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: style.bg,
                    color: style.accent,
                    flexShrink: 0,
                  }}
                >
                  {style.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {n.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {n.message}
                  </Typography>
                </Box>
                <Chip
                  label={n.count}
                  size="small"
                  sx={{
                    height: 22,
                    minWidth: 28,
                    fontWeight: 800,
                    bgcolor: alpha(style.accent, 0.1),
                    color: style.accent,
                  }}
                />
                <ChevronRightRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
