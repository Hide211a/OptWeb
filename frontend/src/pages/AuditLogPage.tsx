import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TableBody, TableCell, TableHead, TableRow, TextField, MenuItem, Box, Chip, Typography,
} from '@mui/material';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { PageLoading } from '../components/ui/PageLoading';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { auditActionLabels, formatDateTime } from '../utils/labels';
import { useAuth } from '../context/AuthContext';
import { mutedColor } from '../utils/themeHelpers';
import { hideOnMobile, hideOnXs } from '../utils/tableResponsive';
import type { AuditAction, AuditLog, Role } from '../types';

export function AuditLogPage() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const [action, setAction] = useState<AuditAction | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit', action, from, to],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '200' };
      if (action) params.action = action;
      if (from) params.from = new Date(from).toISOString();
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        params.to = end.toISOString();
      }
      return (await api.get<AuditLog[]>('/audit', { params })).data;
    },
  });

  const roleColor: Record<Role, 'default' | 'primary' | 'secondary' | 'warning'> = {
    ADMIN: 'secondary',
    MANAGER: 'primary',
    DIRECTOR: 'warning',
  };

  return (
    <>
      <PageHeader
        title="Журнал дій"
        subtitle="Хто і коли змінював документи, товари та налаштування системи"
        dark={isDirector}
      />

      {isDirector && (
        <DirectorViewAlert sx={{ mb: 2 }}>
          Режим перегляду — журнал доступний лише для аналізу.
        </DirectorViewAlert>
      )}

      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          select
          size="small"
          label="Дія"
          value={action}
          onChange={(e) => setAction(e.target.value as AuditAction | '')}
          sx={{ minWidth: { xs: '100%', sm: 220 } }}
        >
          <MenuItem value="">Усі дії</MenuItem>
          {Object.entries(auditActionLabels).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
        <TextField type="date" size="small" label="З" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" size="small" label="По" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>

      <ContentCard noPadding dark={isDirector}>
        {isLoading ? (
          <PageLoading label="Завантаження журналу…" />
        ) : (
          <ScrollableTable minWidth={900} compactMinWidth={320}>
            <TableHead>
              <TableRow>
                <TableCell>Час</TableCell>
                <TableCell sx={hideOnXs}>Користувач</TableCell>
                <TableCell>Дія</TableCell>
                <TableCell>Опис</TableCell>
                <TableCell sx={hideOnMobile}>Сутність</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: mutedColor(isDirector) }}>
                    Записів не знайдено
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: { xs: '0.75rem', sm: 'inherit' } }}>{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell sx={hideOnXs}>
                      <Typography variant="body2" fontWeight={600}>{log.user?.fullName}</Typography>
                      <Chip size="small" label={log.user?.role} color={roleColor[log.user?.role ?? 'MANAGER']} variant="outlined" sx={{ mt: 0.5 }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={auditActionLabels[log.action]} variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: { xs: 140, sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.summary}</TableCell>
                    <TableCell sx={{ color: mutedColor(isDirector), ...hideOnMobile }}>
                      {log.entityType}{log.entityId ? ` · …${log.entityId.slice(-6)}` : ''}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </ScrollableTable>
        )}
      </ContentCard>
    </>
  );
}
