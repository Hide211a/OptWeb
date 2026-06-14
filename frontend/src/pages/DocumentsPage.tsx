import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TableBody, TableCell, TableHead, TableRow, Button, Chip,
  TextField, MenuItem, Box, IconButton, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageLoading } from '../components/ui/PageLoading';
import { docTypeLabels, docStatusLabels, formatDateTime } from '../utils/labels';
import { useAuth } from '../context/AuthContext';
import { docLinkSx, mutedColor } from '../utils/themeHelpers';
import { hideOnMobile, hideOnXs } from '../utils/tableResponsive';
import { invalidateAfterStockChange } from '../utils/invalidateStock';
import type { Document, DocumentType, DocumentStatus } from '../types';

export function DocumentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, setType] = useState<DocumentType | ''>((searchParams.get('type') as DocumentType) || '');
  const [status, setStatus] = useState<DocumentStatus | ''>((searchParams.get('status') as DocumentStatus) || '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') ?? '');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (status) p.set('status', status);
    if (search) p.set('search', search);
    if (dateFrom) p.set('from', dateFrom);
    if (dateTo) p.set('to', dateTo);
    setSearchParams(p, { replace: true });
  }, [type, status, search, dateFrom, dateTo, setSearchParams]);

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isDirector = user?.role === 'DIRECTOR';

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', type, status, search, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      if (dateFrom) params.from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.to = end.toISOString();
      }
      return (await api.get<Document[]>('/documents', { params })).data;
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      setDeleteId(null);
      invalidateAfterStockChange(qc);
    },
  });

  return (
    <>
      <PageHeader
        title="Документи"
        subtitle={
          isDirector
            ? 'Перегляд документів — режим лише для читання'
            : 'Надходження, реалізація, інвентаризація, списання'
        }
        action={
          canManage && (
            <Button variant="contained" component={Link} to="/documents/new" startIcon={<AddIcon />}>
              Створити
            </Button>
          )
        }
        dark={isDirector}
      />
      {isDirector && (
        <DirectorViewAlert>
          Керівник може переглядати та друкувати документи. Зміни та проведення недоступні.
        </DirectorViewAlert>
      )}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          label="Номер"
          placeholder="ПН-2026…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 140 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
        />
        <TextField select size="small" label="Тип" value={type} onChange={(e) => setType(e.target.value as DocumentType | '')} sx={{ minWidth: { xs: 'calc(50% - 8px)', sm: 160 } }}>
          <MenuItem value="">Усі</MenuItem>
          {Object.entries(docTypeLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Статус" value={status} onChange={(e) => setStatus(e.target.value as DocumentStatus | '')} sx={{ minWidth: { xs: 'calc(50% - 8px)', sm: 140 } }}>
          <MenuItem value="">Усі</MenuItem>
          {Object.entries(docStatusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
        <TextField
          type="date"
          size="small"
          label="З"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          size="small"
          label="По"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button size="small" variant={status === 'DRAFT' ? 'contained' : 'outlined'} onClick={() => setStatus(status === 'DRAFT' ? '' : 'DRAFT')}>
          Лише чернетки
        </Button>
        {(search || dateFrom || dateTo || type || status) && (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setSearch('');
              setDateFrom('');
              setDateTo('');
              setType('');
              setStatus('');
            }}
          >
            Скинути
          </Button>
        )}
      </Box>
      <ContentCard noPadding dark={isDirector}>
        {isLoading ? (
          <PageLoading />
        ) : (
        <ScrollableTable minWidth={760} compactMinWidth={300}>
          <TableHead>
            <TableRow>
              <TableCell>Номер</TableCell>
              <TableCell sx={hideOnXs}>Тип</TableCell>
              <TableCell sx={hideOnMobile}>Контрагент</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell sx={hideOnXs}>Дата</TableCell>
              <TableCell align="right">{isDirector ? 'Перегляд' : 'Дії'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: mutedColor(isDirector) }}>
                  Документів не знайдено
                </TableCell>
              </TableRow>
            ) : (
              docs.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell sx={docLinkSx(isDirector)}>
                    {d.number}
                    <Typography variant="caption" display="block" sx={{ display: { xs: 'block', sm: 'none' }, color: mutedColor(isDirector) }}>
                      {docTypeLabels[d.type]}
                    </Typography>
                  </TableCell>
                  <TableCell sx={hideOnXs}>{docTypeLabels[d.type]}</TableCell>
                  <TableCell sx={hideOnMobile}>{d.supplier?.name ?? d.customer?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Chip label={docStatusLabels[d.status]} size="small" color={d.status === 'POSTED' ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ color: mutedColor(isDirector), ...hideOnXs }}>{formatDateTime(d.date)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" component={Link} to={`/documents/${d.id}`}>Відкрити</Button>
                    {canManage && d.status === 'DRAFT' && (
                      <>
                        <Tooltip title="Редагувати">
                          <IconButton size="small" component={Link} to={`/documents/${d.id}/edit`}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Видалити">
                          <IconButton size="small" color="error" onClick={() => setDeleteId(d.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </ScrollableTable>
        )}
      </ContentCard>

      <ConfirmDialog
        open={!!deleteId}
        title="Видалити чернетку?"
        message="Документ буде видалено безповоротно."
        confirmLabel="Видалити"
        confirmColor="error"
        loading={remove.isPending}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </>
  );
}
