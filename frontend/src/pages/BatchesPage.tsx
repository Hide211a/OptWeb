import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Box,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  alpha,
} from '@mui/material';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { PageLoading } from '../components/ui/PageLoading';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { useAuth } from '../context/AuthContext';
import { directorTokens } from '../theme/directorTheme';
import { forest } from '../theme';
import { unitLabels, formatDate, storageZoneLabels } from '../utils/labels';
import { expiryStatusColor, expiryStatusLabel, formatDaysLeft } from '../utils/expiry';
import { hideOnMobile, hideOnXs } from '../utils/tableResponsive';
import type { BatchRow, Category, ExpiryStatus, StorageZone } from '../types';

export function BatchesPage() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryId, setCategoryId] = useState('');
  const [zone, setZone] = useState<StorageZone | ''>('');
  const expiringOnly = searchParams.get('expiringOnly') === 'true';
  const expiredOnly = searchParams.get('expiredOnly') === 'true';

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/directories/categories')).data,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['batches', categoryId, expiringOnly, expiredOnly, zone],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (categoryId) params.categoryId = categoryId;
      if (zone) params.zone = zone;
      if (expiredOnly) params.expiredOnly = 'true';
      else if (expiringOnly) params.expiringDays = '7';
      return (await api.get<BatchRow[]>('/stock/batches', { params })).data;
    },
  });

  const setFilter = (key: 'expiringOnly' | 'expiredOnly', value: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'expiringOnly') {
      if (value) {
        next.set('expiringOnly', 'true');
        next.delete('expiredOnly');
      } else {
        next.delete('expiringOnly');
      }
    } else {
      if (value) {
        next.set('expiredOnly', 'true');
        next.delete('expiringOnly');
      } else {
        next.delete('expiredOnly');
      }
    }
    setSearchParams(next, { replace: true });
  };

  const stats = rows.reduce(
    (acc, r) => {
      acc[r.status as ExpiryStatus] = (acc[r.status as ExpiryStatus] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<ExpiryStatus, number>>,
  );

  const mutedText = isDirector ? alpha(directorTokens.text, 0.5) : 'text.secondary';

  return (
    <>
      <PageHeader
        title="Партії на складі"
        subtitle="Партійний облік продовольчих товарів — терміни придатності та порядок FEFO (спочатку найближчий термін)"
        crumbs={[{ label: 'Склад', to: '/stock' }, { label: 'Партії' }]}
        dark={isDirector}
      />

      {isDirector ? (
        <DirectorViewAlert>
          Контроль партій і термінів придатності — режим перегляду для керівника.
        </DirectorViewAlert>
      ) : (
        <Box
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 3,
            bgcolor: alpha(forest, 0.06),
            border: `1px solid ${alpha(forest, 0.12)}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Кожна партія має термін придатності. При реалізації система автоматично списує за принципом FEFO.
          </Typography>
        </Box>
      )}

      <Box display="flex" flexWrap="wrap" gap={1.5} mb={2}>
        <Chip label={`Усього: ${rows.length}`} variant="outlined" />
        {(stats.warning ?? 0) > 0 && (
          <Chip label={`Скоро термін: ${stats.warning}`} color="warning" size="small" />
        )}
        {(stats.expired ?? 0) > 0 && (
          <Chip label={`Прострочено: ${stats.expired}`} color="error" size="small" />
        )}
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        <TextField
          select
          size="small"
          label="Категорія"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Усі категорії</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Зона складу" value={zone} onChange={(e) => setZone(e.target.value as StorageZone | '')} sx={{ minWidth: 180 }}>
          <MenuItem value="">Усі зони</MenuItem>
          {(['DRY', 'COLD', 'FROZEN'] as StorageZone[]).map((z) => (
            <MenuItem key={z} value={z}>{storageZoneLabels[z]}</MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Switch
              checked={expiringOnly}
              onChange={(e) => setFilter('expiringOnly', e.target.checked)}
            />
          }
          label="Скоро закінчується (7 днів)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={expiredOnly}
              onChange={(e) => setFilter('expiredOnly', e.target.checked)}
            />
          }
          label="Лише прострочені"
        />
      </Box>

      <ContentCard noPadding dark={isDirector}>
        {isLoading ? (
          <PageLoading label="Завантаження партій…" />
        ) : rows.length === 0 ? (
          <Typography sx={{ color: mutedText }} p={3} textAlign="center">
            Партій не знайдено за обраними фільтрами.
          </Typography>
        ) : (
          <ScrollableTable minWidth={900} compactMinWidth={340}>
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell sx={hideOnXs}>Категорія</TableCell>
                <TableCell align="right">Кількість</TableCell>
                <TableCell>Термін</TableCell>
                <TableCell sx={hideOnXs}>Залишилось</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell sx={hideOnMobile}>Зона</TableCell>
                <TableCell sx={hideOnMobile}>Отримано</TableCell>
                <TableCell align="right" sx={hideOnMobile}>Закупка</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    bgcolor:
                      row.status === 'expired'
                        ? alpha('#dc2626', isDirector ? 0.12 : 0.06)
                        : row.status === 'warning'
                          ? alpha('#d97706', isDirector ? 0.14 : 0.08)
                          : undefined,
                  }}
                >
                  <TableCell>
                    <Typography fontWeight={600}>{row.product.name}</Typography>
                    <Typography variant="caption" sx={{ color: mutedText }}>
                      {row.product.sku}
                    </Typography>
                  </TableCell>
                  <TableCell sx={hideOnXs}>{row.product.category.name}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {row.quantity} {unitLabels[row.product.unit]}
                  </TableCell>
                  <TableCell>{formatDate(row.expiryDate)}</TableCell>
                  <TableCell sx={hideOnXs}>{formatDaysLeft(row.daysLeft)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={expiryStatusLabel(row.status)}
                      color={expiryStatusColor(row.status)}
                    />
                  </TableCell>
                  <TableCell sx={hideOnMobile}>{storageZoneLabels[row.storageZone ?? 'DRY']}</TableCell>
                  <TableCell sx={hideOnMobile}>{formatDate(row.receivedAt)}</TableCell>
                  <TableCell align="right" sx={hideOnMobile}>
                    {row.purchasePrice != null ? `${row.purchasePrice.toFixed(2)} ₴` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollableTable>
        )}
      </ContentCard>
    </>
  );
}
