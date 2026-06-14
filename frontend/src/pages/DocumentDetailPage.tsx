import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TableBody, TableCell, TableHead, TableRow, Button, Chip, Alert, Stack, Typography, Box,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { docTypeLabels, docStatusLabels, unitLabels, formatDateTime, formatDate, writeOffReasonLabels } from '../utils/labels';
import { useAuth } from '../context/AuthContext';
import { invalidateAfterStockChange } from '../utils/invalidateStock';
import { mutedColor, skuSx } from '../utils/themeHelpers';
import type { Document, FefoLinePreview } from '../types';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmPost, setConfirmPost] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => (await api.get<Document>(`/documents/${id}`)).data,
    enabled: !!id,
  });

  const showFefo =
    doc?.status === 'DRAFT' && (doc.type === 'SHIPMENT' || doc.type === 'WRITE_OFF');
  const fefoPayload =
    doc?.lines
      .filter((l) => l.productId && l.quantity > 0)
      .map((l) => ({ productId: l.productId, quantity: l.quantity })) ?? [];

  const { data: fefoPreview = [] } = useQuery({
    queryKey: ['fefo-preview', id, fefoPayload],
    queryFn: async () =>
      (await api.post<FefoLinePreview[]>('/documents/fefo-preview', { lines: fefoPayload })).data,
    enabled: !!showFefo && fefoPayload.length > 0,
  });

  const post = useMutation({
    mutationFn: () => api.post(`/documents/${id}/post`),
    onSuccess: () => {
      setConfirmPost(false);
      qc.invalidateQueries({ queryKey: ['document', id] });
      invalidateAfterStockChange(qc);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/documents/${id}`),
    onSuccess: () => {
      invalidateAfterStockChange(qc);
      navigate('/documents');
    },
  });

  const unpost = useMutation({
    mutationFn: () => api.post(`/documents/${id}/unpost`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', id] });
      invalidateAfterStockChange(qc);
    },
  });

  const isDirector = user?.role === 'DIRECTOR';

  if (isLoading || !doc) {
    return <Typography sx={{ color: mutedColor(isDirector) }}>Завантаження…</Typography>;
  }

  const canManage = doc.status === 'DRAFT' && (user?.role === 'ADMIN' || user?.role === 'MANAGER');

  return (
    <>
      <div className="document-print-header">
        <h1>ОптСклад — {doc.number}</h1>
        <p>
          {docTypeLabels[doc.type]} · {docStatusLabels[doc.status]} · {formatDateTime(doc.date)}
        </p>
      </div>

      <PageHeader
        title={doc.number}
        subtitle={docTypeLabels[doc.type]}
        crumbs={[{ label: 'Документи', to: '/documents' }, { label: doc.number }]}
        dark={isDirector}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" className="no-print">
            {canManage && (
              <>
                <Button variant="outlined" component={Link} to={`/documents/${id}/edit`} startIcon={<EditOutlinedIcon />}>
                  Редагувати
                </Button>
                <Button variant="contained" onClick={() => setConfirmPost(true)} disabled={post.isPending}>
                  Провести
                </Button>
                <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmDelete(true)}>
                  Видалити
                </Button>
              </>
            )}
            {doc.status === 'POSTED' && user?.role === 'ADMIN' && (
              <Button variant="outlined" color="warning" onClick={() => unpost.mutate()} disabled={unpost.isPending}>
                Розпровести
              </Button>
            )}
            <Button variant="outlined" onClick={() => window.print()}>Друк</Button>
          </Stack>
        }
      />

      {isDirector && (
        <DirectorViewAlert className="no-print">
          Режим перегляду — документ доступний лише для аналізу та друку.
        </DirectorViewAlert>
      )}

      {(post.error || remove.error || unpost.error) && (
        <Alert severity="error" sx={{ mb: 2 }} className="no-print">
          {(post.error ?? remove.error ?? unpost.error) instanceof Error
            ? (post.error ?? remove.error ?? unpost.error)!.message
            : 'Помилка'}
        </Alert>
      )}

      <Box className="document-print-root">
      <ContentCard sx={{ mb: 2 }} dark={isDirector}>
        <Stack spacing={1.5}>
          <BoxRow label="Статус" dark={isDirector}>
            <Chip
              label={docStatusLabels[doc.status]}
              size="small"
              color={doc.status === 'POSTED' ? 'success' : 'default'}
            />
          </BoxRow>
          <BoxRow label="Дата" value={formatDateTime(doc.date)} dark={isDirector} />
          {doc.supplier && <BoxRow label="Постачальник" value={doc.supplier.name} dark={isDirector} />}
          {doc.customer && <BoxRow label="Клієнт" value={doc.customer.name} dark={isDirector} />}
          {doc.writeOffReason && (
            <BoxRow label="Причина списання" value={writeOffReasonLabels[doc.writeOffReason]} dark={isDirector} />
          )}
          {doc.notes && <BoxRow label="Примітка" value={doc.notes} dark={isDirector} />}
          {doc.createdBy && <BoxRow label="Автор" value={doc.createdBy.fullName} dark={isDirector} />}
          {doc.type === 'INVENTORY' && doc.status === 'POSTED' && (
            <Alert severity="warning" sx={{ mt: 1 }} className="no-print">
              Інвентаризацію не можна розпровести. Для коригування створіть новий документ інвентаризації або списання.
            </Alert>
          )}
          {doc.type === 'SHIPMENT' && doc.status === 'DRAFT' && (
            <Alert severity="info" sx={{ mt: 1 }}>
              При проведенні застосовується FEFO — спочатку партії з найближчим терміном придатності.
            </Alert>
          )}
        </Stack>
      </ContentCard>

      {showFefo && fefoPreview.length > 0 && (
        <ContentCard title="План списання FEFO" sx={{ mb: 2 }} dark={isDirector}>
          <ScrollableTable minWidth={520}>
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell align="right">Кількість</TableCell>
                <TableCell>Буде списано з партій</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fefoPreview.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.productName}</TableCell>
                  <TableCell align="right">
                    {row.requestedQty} {unitLabels[row.unit]}
                  </TableCell>
                  <TableCell>
                    {row.allocations.map((a) => (
                      <Typography key={a.batchId} variant="body2" color="text.secondary" display="block">
                        {a.quantity} {unitLabels[row.unit]} · термін {formatDate(a.expiryDate)}
                      </Typography>
                    ))}
                    {row.error && (
                      <Typography variant="body2" color="error">{row.error}</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollableTable>
        </ContentCard>
      )}

      <ContentCard title="Рядки товарів" noPadding dark={isDirector}>
        <ScrollableTable minWidth={doc.type === 'RECEIPT' ? 680 : 600}>
          <TableHead>
            <TableRow>
              <TableCell>Товар</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Кількість</TableCell>
              <TableCell align="right">Ціна</TableCell>
              <TableCell align="right">Сума</TableCell>
              {doc.type === 'RECEIPT' && <TableCell>Термін придатності</TableCell>}
              {doc.status === 'POSTED' && (doc.type === 'SHIPMENT' || doc.type === 'WRITE_OFF') && (
                <TableCell>Партія</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {doc.lines.map((l) => (
              <TableRow key={l.id ?? l.productId}>
                <TableCell sx={{ fontWeight: 600 }}>{l.product?.name}</TableCell>
                <TableCell sx={skuSx(isDirector)}>{l.product?.sku}</TableCell>
                <TableCell align="right">
                  {l.quantity} {l.product && unitLabels[l.product.unit]}
                </TableCell>
                <TableCell align="right">{l.unitPrice ?? '—'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {((l.unitPrice ?? 0) * l.quantity).toFixed(2)}
                </TableCell>
                {doc.type === 'RECEIPT' && (
                  <TableCell>{l.expiryDate ? formatDate(l.expiryDate) : '—'}</TableCell>
                )}
                {doc.status === 'POSTED' && (doc.type === 'SHIPMENT' || doc.type === 'WRITE_OFF') && (
                  <TableCell>
                    {l.batchId ? (
                      <Chip size="small" label={`…${l.batchId.slice(-6)}`} variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">кілька партій</Typography>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </ScrollableTable>
      </ContentCard>
      </Box>

      <Button
        className="no-print"
        sx={{ mt: 2 }}
        component={Link}
        to={user?.role === 'MANAGER' ? '/workspace' : user?.role === 'DIRECTOR' ? '/dashboard' : '/documents'}
      >
        ← Назад
      </Button>

      <ConfirmDialog
        open={confirmPost}
        title="Провести документ?"
        message={`Документ ${doc.number} оновить залишки на складі. Цю дію не скасує менеджер — лише адміністратор (розпроведення).`}
        confirmLabel="Провести"
        loading={post.isPending}
        onConfirm={() => post.mutate()}
        onClose={() => setConfirmPost(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Видалити чернетку?"
        message={`Документ ${doc.number} буде видалено безповоротно.`}
        confirmLabel="Видалити"
        confirmColor="error"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

function BoxRow({ label, value, children, dark = false }: { label: string; value?: string; children?: React.ReactNode; dark?: boolean }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
      <Typography variant="body2" sx={{ minWidth: { sm: 120 }, fontWeight: 600, color: mutedColor(dark) }}>
        {label}
      </Typography>
      {children ?? <Typography variant="body2">{value}</Typography>}
    </Stack>
  );
}
