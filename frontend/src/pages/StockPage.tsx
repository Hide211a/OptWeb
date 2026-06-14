import { Link } from 'react-router-dom';
import { Fragment, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TableBody, TableCell, TableHead, TableRow, Chip, Box,
  TextField, MenuItem, FormControlLabel, Checkbox, Collapse, Typography, Button, alpha,
} from '@mui/material';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { unitLabels, formatDate, storageZoneLabels } from '../utils/labels';
import { skuSx } from '../utils/themeHelpers';
import type { StockRow, Category, StorageZone } from '../types';

export function StockPage() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const [searchParams] = useSearchParams();
  const [categoryId, setCategoryId] = useState('');
  const [lowOnly, setLowOnly] = useState(searchParams.get('lowOnly') === 'true');
  const [expiringOnly, setExpiringOnly] = useState(searchParams.get('expiringOnly') === 'true');
  const [zone, setZone] = useState<StorageZone | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLowOnly(searchParams.get('lowOnly') === 'true');
    setExpiringOnly(searchParams.get('expiringOnly') === 'true');
  }, [searchParams]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/directories/categories')).data,
  });

  const { data: rows = [] } = useQuery({
    queryKey: ['stock', categoryId, lowOnly, expiringOnly, zone],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (categoryId) params.categoryId = categoryId;
      if (lowOnly) params.lowOnly = 'true';
      if (expiringOnly) params.expiringOnly = 'true';
      if (zone) params.zone = zone;
      return (await api.get<StockRow[]>('/stock', { params })).data;
    },
  });

  return (
    <>
      <PageHeader
        title="Залишки на складі"
        subtitle={isDirector ? 'Контроль залишків і партій — перегляд' : 'Загальні залишки та партії (FEFO)'}
        action={
          <Button variant="outlined" component={Link} to="/batches">
            Перегляд партій
          </Button>
        }
        dark={isDirector}
      />
      {isDirector && (
        <DirectorViewAlert>Режим перегляду для керівника.</DirectorViewAlert>
      )}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        <TextField select size="small" label="Категорія" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">Усі</MenuItem>
          {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <FormControlLabel control={<Checkbox checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />} label="Низький залишок" />
        <FormControlLabel control={<Checkbox checked={expiringOnly} onChange={(e) => setExpiringOnly(e.target.checked)} />} label="Закінчується термін" />
        <TextField select size="small" label="Зона" value={zone} onChange={(e) => setZone(e.target.value as StorageZone | '')} sx={{ minWidth: 160 }}>
          <MenuItem value="">Усі</MenuItem>
          {(['DRY', 'COLD', 'FROZEN'] as StorageZone[]).map((z) => (
            <MenuItem key={z} value={z}>{storageZoneLabels[z]}</MenuItem>
          ))}
        </TextField>
      </Box>
      <ContentCard noPadding dark={isDirector}>
        <ScrollableTable minWidth={640} compactMinWidth={320}>
          <TableHead>
            <TableRow>
              <TableCell>Товар</TableCell>
              <TableCell>Категорія</TableCell>
              <TableCell align="right">Залишок</TableCell>
              <TableCell align="right">Мін.</TableCell>
              <TableCell>Партії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <TableCell>
                    <Typography fontWeight={600}>{r.name}</Typography>
                    <Typography variant="caption" sx={skuSx(isDirector)}>{r.sku}</Typography>
                  </TableCell>
                  <TableCell>{r.category.name}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${r.totalStock} ${unitLabels[r.unit]}`}
                      size="small"
                      color={r.isLow ? 'error' : r.hasExpiring ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">{r.minStock}</TableCell>
                  <TableCell>{r.batches.length} парт.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                    <Collapse in={expanded === r.id}>
                      <Box
                        p={2}
                        sx={{
                          bgcolor: isDirector ? alpha('#34d399', 0.06) : alpha('#047857', 0.04),
                          borderTop: '1px solid',
                          borderColor: isDirector ? alpha('#34d399', 0.1) : alpha('#047857', 0.08),
                        }}
                      >
                        <Typography variant="subtitle2" mb={1}>Партії (сортування FEFO)</Typography>
                        <Box className="table-scroll" sx={{ overflowX: 'auto' }}>
                        <ScrollableTable minWidth={420} compactMinWidth={280}>
                          <TableHead>
                            <TableRow>
                              <TableCell align="right">Кількість</TableCell>
                              <TableCell>Термін придатності</TableCell>
                              <TableCell>Отримано</TableCell>
                              <TableCell align="right">Ціна закупки</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {r.batches.map((b) => (
                              <TableRow key={b.id}>
                                <TableCell align="right">{b.quantity}</TableCell>
                                <TableCell>{formatDate(b.expiryDate)}</TableCell>
                                <TableCell>{formatDate(b.receivedAt)}</TableCell>
                                <TableCell align="right">{b.purchasePrice ?? '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </ScrollableTable>
                        </Box>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </ScrollableTable>
      </ContentCard>
    </>
  );
}
