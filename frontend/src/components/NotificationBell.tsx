import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  Button,
  alpha,
} from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import api from '../api/client';
import { NotificationPanel } from './NotificationPanel';
import type { WorkspaceNotification } from '../types';

export function NotificationBell() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  const { data } = useQuery({
    queryKey: ['workspace-notifications'],
    queryFn: async () =>
      (await api.get<{ notifications: WorkspaceNotification[]; total: number }>('/workspace/notifications')).data,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Сповіщення"
        sx={{
          color: 'inherit',
          bgcolor: open ? alpha('#047857', 0.1) : 'transparent',
          '&:hover': { bgcolor: alpha('#047857', 0.08) },
        }}
      >
        <Badge
          badgeContent={total}
          color="error"
          max={99}
          invisible={total === 0}
          sx={{ '& .MuiBadge-badge': { fontWeight: 800, fontSize: '0.65rem' } }}
        >
          <NotificationsNoneOutlinedIcon sx={{ fontSize: 22 }} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: 3,
              boxShadow: '0 16px 48px rgba(15, 23, 42, 0.14)',
              border: `1px solid ${alpha('#047857', 0.1)}`,
              overflow: 'visible',
            },
          },
        }}
      >
        <NotificationPanel
          notifications={notifications}
          onItemClick={() => setAnchor(null)}
          sx={{ maxWidth: 360, boxShadow: 'none', border: 'none' }}
        />
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderTop: '1px solid',
            borderColor: alpha('#0f172a', 0.06),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Оновлюється автоматично
          </Typography>
          <Button
            size="small"
            component={RouterLink}
            to="/workspace"
            onClick={() => setAnchor(null)}
            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
          >
            Робочий стіл
          </Button>
        </Box>
      </Popover>
    </>
  );
}
