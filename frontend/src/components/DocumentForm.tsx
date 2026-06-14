import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  TextField, MenuItem, Button, TableBody, TableCell, TableHead, TableRow,
  IconButton, Alert, Box, Typography, Chip, Stack, Stepper, Step, StepLabel, Paper, Grid, alpha,
  useMediaQuery, useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined';
import api from '../api/client';
import { PageHeader } from './PageHeader';
import { ContentCard } from './ui/ContentCard';
import { ScrollableTable } from './ui/ScrollableTable';
import { docTypeLabels, unitLabels, formatDate, writeOffReasonLabels } from '../utils/labels';
import { formatDaysLeft, expiryStatusLabel, expiryStatusColor } from '../utils/expiry';
import { checkLineStock } from '../utils/stockValidation';
import { formatUah } from '../utils/csv';
import type {
  Document, DocumentType, Product, Supplier, Customer, FefoLinePreview, WriteOffReason, BatchRow,
} from '../types';

const MANUAL_BATCH = '__manual__';

type Line = {
  productId: string;
  quantity: number;
  unitPrice: number;
  actualQuantity?: number;
  expiredBatchId?: string;
  expiryDate?: string;
  productionDate?: string;
};

function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function suggestExpiryForProduct(productId: string, products: Product[]): string {
  const p = products.find((x) => x.id === productId);
  if (!p?.shelfLifeDays) return '';
  const d = new Date();
  d.setDate(d.getDate() + p.shelfLifeDays);
  return d.toISOString().slice(0, 10);
}

const validTypes: DocumentType[] = ['RECEIPT', 'SHIPMENT', 'INVENTORY', 'WRITE_OFF'];
const wizardSteps = ['Тип документа', 'Контрагент', 'Товари', 'Підтвердження'];

const typeCards: { type: DocumentType; icon: React.ReactNode; hint: string }[] = [
  { type: 'RECEIPT', icon: <InventoryOutlinedIcon />, hint: 'Створює нові партії на складі' },
  { type: 'SHIPMENT', icon: <LocalShippingOutlinedIcon />, hint: 'Відвантаження оптовому клієнту (FEFO)' },
  { type: 'INVENTORY', icon: <FactCheckOutlinedIcon />, hint: 'Фактичні залишки vs облік (без розпроведення)' },
  { type: 'WRITE_OFF', icon: <RemoveShoppingCartOutlinedIcon />, hint: 'Списання прострочення або браку' },
];

export function DocumentForm({ documentId }: { documentId?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!documentId;
  const initialType = (searchParams.get('type') as DocumentType) || 'RECEIPT';
  const initialCustomerId = searchParams.get('customerId') ?? '';

  const [step, setStep] = useState(initialCustomerId ? 1 : 0);
  const [type, setType] = useState<DocumentType>(
    validTypes.includes(initialType) ? initialType : 'RECEIPT',
  );
  const [supplierId, setSupplierId] = useState('');
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [writeOffReason, setWriteOffReason] = useState<WriteOffReason | ''>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!isEdit);
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const compactStepLabels = ['Тип', 'Контрагент', 'Товари', 'Готово'];

  const { data: existing } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => (await api.get<Document>(`/documents/${documentId}`)).data,
    enabled: isEdit,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<Product[]>('/products', { params: { activeOnly: true } })).data,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get<Supplier[]>('/directories/suppliers')).data,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get<Customer[]>('/directories/customers')).data,
  });
  const { data: expiredBatches = [] } = useQuery({
    queryKey: ['batches-expired'],
    queryFn: async () =>
      (await api.get<BatchRow[]>('/stock/batches', { params: { expiredOnly: 'true' } })).data,
    enabled: type === 'WRITE_OFF',
  });
  const activeSuppliers = suppliers.filter((s) => s.isActive !== false);
  const activeCustomers = customers.filter((c) => c.isActive !== false);

  const { data: customerPrices = [] } = useQuery({
    queryKey: ['customer-prices', customerId],
    queryFn: async () =>
      (await api.get<Array<{ productId: string; unitPrice: number }>>(
        `/directories/customers/${customerId}/prices`,
      )).data,
    enabled: type === 'SHIPMENT' && !!customerId,
  });

  const priceByProduct = useMemo(
    () => new Map(customerPrices.map((p) => [p.productId, p.unitPrice])),
    [customerPrices],
  );

  useEffect(() => {
    if (!existing || loaded) return;
    if (existing.status === 'POSTED') {
      navigate(`/documents/${documentId}`);
      return;
    }
    setType(existing.type);
    setSupplierId(existing.supplierId ?? '');
    setCustomerId(existing.customerId ?? '');
    setWriteOffReason(existing.writeOffReason ?? '');
    setNotes(existing.notes ?? '');
    setLines(
      existing.lines.length > 0
        ? existing.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice ?? 0,
            actualQuantity: l.actualQuantity ?? l.quantity,
            expiryDate: toDateInputValue(l.expiryDate),
            productionDate: toDateInputValue(l.productionDate),
          }))
        : [{ productId: '', quantity: 1, unitPrice: 0 }],
    );
    setLoaded(true);
  }, [existing, loaded, navigate, documentId]);

  const buildPayload = () => ({
    type,
    notes: notes || undefined,
    writeOffReason: type === 'WRITE_OFF' ? writeOffReason || null : null,
    supplierId: type === 'RECEIPT' ? supplierId : null,
    customerId: type === 'SHIPMENT' ? customerId : null,
    lines: lines
      .filter((l) => l.productId && l.quantity > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: type === 'SHIPMENT' ? l.unitPrice : l.unitPrice || undefined,
        actualQuantity: type === 'INVENTORY' ? l.actualQuantity ?? l.quantity : undefined,
        expiryDate:
          type === 'RECEIPT' && l.expiryDate
            ? new Date(`${l.expiryDate}T12:00:00`).toISOString()
            : undefined,
        productionDate:
          type === 'RECEIPT' && l.productionDate
            ? new Date(`${l.productionDate}T12:00:00`).toISOString()
            : undefined,
      })),
  });

  const validateStep = (currentStep: number): string | null => {
    if (!isEdit && currentStep === 1) {
      if (type === 'RECEIPT' && !supplierId) return 'Оберіть постачальника (крок 2)';
      if (type === 'SHIPMENT' && !customerId) return 'Оберіть оптового клієнта (крок 2)';
      if (type === 'WRITE_OFF' && !writeOffReason) return 'Оберіть причину списання (крок 2)';
    }
    if (!isEdit && currentStep === 2) {
      const payload = buildPayload();
      if (payload.lines.length === 0) return 'Додайте хоча б один рядок товару';
      if (type === 'WRITE_OFF') {
        for (const line of lines) {
          if (!line.productId) return 'Оберіть прострочену партію або товар';
          const batch = expiredBatches.find((b) => b.id === line.expiredBatchId);
          if (batch && line.quantity > batch.quantity + 0.0001) {
            return `Кількість «${batch.product.name}» не може перевищувати ${batch.quantity} у простроченій партії`;
          }
        }
      }
      if (type === 'SHIPMENT' && payload.lines.some((l) => !l.unitPrice || l.unitPrice <= 0)) {
        return 'У реалізації вкажіть ціну продажу (грн) у кожному рядку';
      }
    }
    return null;
  };

  const validateAll = (): string | null => {
    if (type === 'RECEIPT' && !supplierId) return 'Оберіть постачальника';
    if (type === 'SHIPMENT' && !customerId) return 'Оберіть оптового клієнта';
    if (type === 'WRITE_OFF' && !writeOffReason) return 'Оберіть причину списання';
    const payload = buildPayload();
    if (payload.lines.length === 0) return 'Додайте хоча б один рядок товару';
    if (type === 'SHIPMENT' && payload.lines.some((l) => !l.unitPrice || l.unitPrice <= 0)) {
      return 'У реалізації вкажіть ціну продажу (грн) у кожному рядку';
    }
    return null;
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const stepErr = validateAll();
      if (stepErr) throw new Error(stepErr);
      if (payload.lines.length === 0) throw new Error('Додайте хоча б один рядок');
      if (isEdit) return (await api.put(`/documents/${documentId}`, payload)).data;
      return (await api.post('/documents', payload)).data;
    },
    onSuccess: (doc: Document) => navigate(`/documents/${doc.id}`),
    onError: (e) => setError(e instanceof Error ? e.message : 'Помилка'),
  });

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const batchLabel = (b: BatchRow) =>
    `${b.product.name} · ${b.quantity} ${unitLabels[b.product.unit]} · ${formatDaysLeft(b.daysLeft)}`;

  const selectExpiredBatch = (lineIndex: number, batchId: string) => {
    if (batchId === MANUAL_BATCH) {
      updateLine(lineIndex, { expiredBatchId: MANUAL_BATCH, productId: '', quantity: 1, unitPrice: 0 });
      setError('');
      return;
    }
    if (!batchId) {
      updateLine(lineIndex, { expiredBatchId: '', productId: '', quantity: 1, unitPrice: 0 });
      return;
    }
    const batch = expiredBatches.find((b) => b.id === batchId);
    if (!batch) return;
    if (lines.some((l, idx) => idx !== lineIndex && l.expiredBatchId === batchId)) {
      setError('Цю прострочену партію вже додано до списання');
      return;
    }
    updateLine(lineIndex, {
      expiredBatchId: batchId,
      productId: batch.product.id,
      quantity: batch.quantity,
      unitPrice: batch.purchasePrice ?? 0,
    });
    setError('');
  };

  const addExpiredLine = (batch: BatchRow) => {
    if (lines.some((l) => l.expiredBatchId === batch.id)) {
      setError('Цю партію вже є в списку списання');
      return;
    }
    const newLine: Line = {
      productId: batch.product.id,
      quantity: batch.quantity,
      unitPrice: batch.purchasePrice ?? 0,
      expiredBatchId: batch.id,
    };
    const hasEmpty = lines.length === 1 && !lines[0].productId && !lines[0].expiredBatchId;
    setLines(hasEmpty ? [newLine] : [...lines, newLine]);
    setError('');
  };

  const stockWarnings = lines
    .map((l, i) => ({ i, msg: checkLineStock(l.productId, l.quantity, products, type) }))
    .filter((x) => x.msg);

  const showFefo = type === 'SHIPMENT' || type === 'WRITE_OFF';
  const fefoPayload = lines
    .filter((l) => l.productId && l.quantity > 0)
    .map((l) => ({ productId: l.productId, quantity: l.quantity }));

  const { data: fefoPreview = [] } = useQuery({
    queryKey: ['fefo-preview', type, fefoPayload],
    queryFn: async () =>
      (await api.post<FefoLinePreview[]>('/documents/fefo-preview', { lines: fefoPayload })).data,
    enabled: showFefo && fefoPayload.length > 0,
  });

  const totalSum = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * (l.unitPrice ?? 0), 0),
    [lines],
  );

  const skipsCounterpartyStep = type === 'INVENTORY';

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    let next = step + 1;
    if (step === 0 && skipsCounterpartyStep) next = 2;
    setStep(Math.min(next, wizardSteps.length - 1));
  };

  const goBack = () => {
    setError('');
    let prev = step - 1;
    if (step === 2 && skipsCounterpartyStep) prev = 0;
    setStep(Math.max(prev, 0));
  };

  if (isEdit && !loaded) {
    return <Typography color="text.secondary">Завантаження документа…</Typography>;
  }

  const linesTable = (
    <ScrollableTable minWidth={720} compactMinWidth={360}>
      <TableHead>
        <TableRow>
          <TableCell>Товар</TableCell>
          <TableCell>На складі</TableCell>
          <TableCell>{type === 'INVENTORY' ? 'Фактична к-сть' : 'Кількість'}</TableCell>
          <TableCell>{type === 'RECEIPT' ? 'Закупівельна ціна' : 'Ціна'}</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line, i) => {
          const p = products.find((x) => x.id === line.productId);
          const warn = checkLineStock(line.productId, line.quantity, products, type);
          return (
            <TableRow key={i}>
              <TableCell>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={line.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const patch: Partial<Line> = { productId };
                    if (type === 'RECEIPT' && !line.expiryDate) {
                      patch.expiryDate = suggestExpiryForProduct(productId, products);
                    }
                    if (type === 'SHIPMENT' && priceByProduct.has(productId)) {
                      patch.unitPrice = priceByProduct.get(productId)!;
                    }
                    updateLine(i, patch);
                  }}
                >
                  {products.map((pr) => (
                    <MenuItem key={pr.id} value={pr.id}>{pr.name} ({pr.sku})</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                {p ? (
                  <Chip label={`${p.stock ?? 0} ${unitLabels[p.unit]}`} size="small" color={warn ? 'error' : 'default'} variant="outlined" />
                ) : '—'}
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={type === 'INVENTORY' ? (line.actualQuantity ?? line.quantity) : line.quantity}
                  onChange={(e) => updateLine(i, type === 'INVENTORY'
                    ? { actualQuantity: Number(e.target.value), quantity: Number(e.target.value) }
                    : { quantity: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <TextField type="number" size="small" value={line.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} disabled={lines.length <= 1}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </ScrollableTable>
  );

  const receiptLinesTable = (
    <ScrollableTable minWidth={900} compactMinWidth={400}>
      <TableHead>
        <TableRow>
          <TableCell>Товар</TableCell>
          <TableCell>Кількість</TableCell>
          <TableCell>Закупівельна ціна</TableCell>
          <TableCell>Термін придатності</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line, i) => {
          const p = products.find((x) => x.id === line.productId);
          const suggested = p?.shelfLifeDays
            ? `за замовч.: +${p.shelfLifeDays} дн. від дати документа`
            : 'без терміну — можна не вказувати';
          return (
            <TableRow key={i}>
              <TableCell>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={line.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    updateLine(i, {
                      productId,
                      expiryDate: suggestExpiryForProduct(productId, products),
                    });
                  }}
                >
                  {products.map((pr) => (
                    <MenuItem key={pr.id} value={pr.id}>{pr.name} ({pr.sku})</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={line.expiryDate ?? ''}
                  onChange={(e) => updateLine(i, { expiryDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText={suggested}
                />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} disabled={lines.length <= 1}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </ScrollableTable>
  );

  const writeOffLinesTable = (
    <ScrollableTable minWidth={860} compactMinWidth={400}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ minWidth: 220 }}>Прострочена партія</TableCell>
          <TableCell>Товар</TableCell>
          <TableCell>У партії</TableCell>
          <TableCell>До списання</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line, i) => {
          const batch = expiredBatches.find((b) => b.id === line.expiredBatchId);
          const isManual = line.expiredBatchId === MANUAL_BATCH || (!line.expiredBatchId && !batch);
          const p = products.find((x) => x.id === line.productId);
          const maxQty = batch?.quantity;
          const warn = checkLineStock(line.productId, line.quantity, products, type);
          const qtyOverBatch = maxQty != null && line.quantity > maxQty + 0.0001;

          return (
            <TableRow key={i}>
              <TableCell>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={line.expiredBatchId === MANUAL_BATCH ? MANUAL_BATCH : (line.expiredBatchId ?? '')}
                  onChange={(e) => selectExpiredBatch(i, e.target.value)}
                  helperText="Оберіть зі списку прострочених"
                >
                  <MenuItem value="">— Оберіть партію —</MenuItem>
                  {expiredBatches.map((b) => (
                    <MenuItem
                      key={b.id}
                      value={b.id}
                      disabled={lines.some((l, idx) => idx !== i && l.expiredBatchId === b.id)}
                    >
                      {batchLabel(b)}
                    </MenuItem>
                  ))}
                  <MenuItem value={MANUAL_BATCH}>Інший товар (вручну)</MenuItem>
                </TextField>
              </TableCell>
              <TableCell>
                {isManual ? (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={line.productId}
                    onChange={(e) => updateLine(i, { productId: e.target.value })}
                  >
                    {products.map((pr) => (
                      <MenuItem key={pr.id} value={pr.id}>{pr.name} ({pr.sku})</MenuItem>
                    ))}
                  </TextField>
                ) : batch ? (
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{batch.product.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{batch.product.sku}</Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">Оберіть партію зліва</Typography>
                )}
              </TableCell>
              <TableCell>
                {batch ? (
                  <Stack spacing={0.5}>
                    <Chip
                      label={`${batch.quantity} ${unitLabels[batch.product.unit]}`}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      термін {formatDate(batch.expiryDate)}
                    </Typography>
                  </Stack>
                ) : p ? (
                  <Chip
                    label={`${p.stock ?? 0} ${unitLabels[p.unit]}`}
                    size="small"
                    color={warn ? 'error' : 'default'}
                    variant="outlined"
                  />
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={line.quantity}
                  error={qtyOverBatch}
                  helperText={qtyOverBatch && maxQty != null ? `Макс. ${maxQty}` : undefined}
                  onChange={(e) => {
                    const qty = Number(e.target.value);
                    updateLine(i, { quantity: qty });
                  }}
                  inputProps={maxQty != null ? { min: 0.01, max: maxQty, step: 0.01 } : { min: 0.01, step: 0.01 }}
                />
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={lines.length <= 1}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </ScrollableTable>
  );

  const expiredBatchesPanel = type === 'WRITE_OFF' && (
    <ContentCard title="Прострочено на складі" sx={{ mb: 2 }}>
      {expiredBatches.length === 0 ? (
        <Typography variant="body2" color="text.secondary" py={1}>
          Зараз немає прострочених партій. Можна списати інший товар вручну в таблиці нижче.
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Натисніть «Додати», щоб перенести прострочену партію в списання — товар і кількість підставляться автоматично.
          </Typography>
          <ScrollableTable minWidth={640} compactMinWidth={340}>
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell align="right">Кількість</TableCell>
                <TableCell>Термін</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {expiredBatches.map((b) => {
                const added = lines.some((l) => l.expiredBatchId === b.id);
                return (
                  <TableRow key={b.id} sx={{ bgcolor: added ? alpha('#dc2626', 0.04) : undefined }}>
                    <TableCell>
                      <Typography fontWeight={600}>{b.product.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{b.product.sku}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {b.quantity} {unitLabels[b.product.unit]}
                    </TableCell>
                    <TableCell>{formatDate(b.expiryDate)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={expiryStatusLabel(b.status)} color={expiryStatusColor(b.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant={added ? 'outlined' : 'contained'} disabled={added} onClick={() => addExpiredLine(b)}>
                        {added ? 'Додано' : 'Додати'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </ScrollableTable>
        </>
      )}
    </ContentCard>
  );

  const activeLinesTable = type === 'WRITE_OFF' ? writeOffLinesTable : type === 'RECEIPT' ? receiptLinesTable : linesTable;

  const fefoBlock = showFefo && fefoPayload.length > 0 && (
    <ContentCard title="План списання FEFO" sx={{ mb: 2 }}>
      {fefoPreview.some((p) => p.error) && (
        <Alert severity="error" sx={{ mb: 2 }}>Недостатньо залишку для одного або кількох рядків.</Alert>
      )}
      <ScrollableTable minWidth={560} compactMinWidth={320}>
        <TableHead>
          <TableRow>
            <TableCell>Товар</TableCell>
            <TableCell align="right">Потрібно</TableCell>
            <TableCell>Партії (FEFO)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fefoPreview.map((row) => (
            <TableRow key={row.productId}>
              <TableCell sx={{ fontWeight: 600 }}>{row.productName}</TableCell>
              <TableCell align="right">{row.requestedQty} {unitLabels[row.unit]}</TableCell>
              <TableCell>
                {row.allocations.map((a) => (
                  <Typography key={a.batchId} variant="body2" color="text.secondary" display="block">
                    {a.quantity} {unitLabels[row.unit]} · термін {formatDate(a.expiryDate)}
                  </Typography>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ScrollableTable>
    </ContentCard>
  );

  return (
    <>
      <PageHeader
        title={isEdit ? `Редагування ${existing?.number ?? ''}` : 'Майстер створення документа'}
        subtitle={isEdit ? 'Чернетка — зміни зберігаються без проведення' : docTypeLabels[type]}
        crumbs={[
          { label: 'Документи', to: '/documents' },
          { label: isEdit ? existing?.number ?? 'Редагування' : 'Створення' },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {stockWarnings.length > 0 && (type === 'SHIPMENT' || type === 'WRITE_OFF') && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Перевірте залишки: {stockWarnings.map((w) => w.msg).join('; ')}
        </Alert>
      )}

      {!isEdit && (
        <Stepper
          activeStep={step}
          orientation={isCompact ? 'vertical' : 'horizontal'}
          alternativeLabel={!isCompact}
          sx={{ mb: 3 }}
        >
          {wizardSteps.map((label, i) => (
            <Step key={label}><StepLabel>{isCompact ? compactStepLabels[i] : label}</StepLabel></Step>
          ))}
        </Stepper>
      )}

      {isEdit ? (
        <>
          <ContentCard title="Заголовок документа" sx={{ mb: 2 }}>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <TextField select label="Тип" value={type} disabled sx={{ minWidth: 200 }}>
                {Object.entries(docTypeLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              {type === 'RECEIPT' && (
                <TextField select label="Постачальник" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} sx={{ minWidth: 260 }} required>
                  {activeSuppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </TextField>
              )}
              {type === 'SHIPMENT' && (
                <TextField select label="Клієнт" value={customerId} onChange={(e) => setCustomerId(e.target.value)} sx={{ minWidth: 260 }} required>
                  {activeCustomers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
              )}
              {type === 'WRITE_OFF' && (
                <TextField select label="Причина списання" value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value as WriteOffReason)} sx={{ minWidth: 260 }} required>
                  {Object.entries(writeOffReasonLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
              )}
              <TextField label="Примітка" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
            </Box>
          </ContentCard>
          {fefoBlock}
          {type === 'WRITE_OFF' && expiredBatchesPanel}
          {type === 'SHIPMENT' && customerId && priceByProduct.size > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Ціни підставлені з прайс-листу клієнта ({priceByProduct.size} позицій). Можна змінити вручну.
            </Alert>
          )}
          <ContentCard title={type === 'WRITE_OFF' ? 'Що списати' : 'Рядки товарів'}>
            {activeLinesTable}
            <Box mt={2} display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => setLines((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0, expiredBatchId: '' }])}
              >
                + Рядок
              </Button>
              <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>Зберегти зміни</Button>
              <Button variant="text" onClick={() => navigate(`/documents/${documentId}`)}>Скасувати</Button>
            </Box>
          </ContentCard>
        </>
      ) : (
        <>
          {step === 0 && (
            <Grid container spacing={2}>
              {typeCards.map((card) => (
                <Grid item xs={12} sm={6} key={card.type}>
                  <Paper
                    onClick={() => {
                      setType(card.type);
                      setError('');
                    }}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: type === card.type ? 'primary.main' : 'divider',
                      bgcolor: type === card.type ? alpha('#047857', 0.08) : 'background.paper',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: 'primary.light' },
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ color: 'primary.main' }}>{card.icon}</Box>
                      <Box>
                        <Typography fontWeight={800}>{docTypeLabels[card.type]}</Typography>
                        <Typography variant="body2" color="text.secondary">{card.hint}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {step === 1 && (
            <ContentCard title={type === 'INVENTORY' ? 'Деталі' : 'Контрагент та деталі'}>
              <Stack spacing={2} maxWidth={480}>
                {type === 'INVENTORY' && (
                  <Typography variant="body2" color="text.secondary">
                    Для інвентаризації постачальник або клієнт не потрібні. Після проведення документ не розпроводиться — лише нове коригування.
                  </Typography>
                )}
                {type === 'RECEIPT' && (
                  <TextField select label="Постачальник" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                    {activeSuppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </TextField>
                )}
                {type === 'SHIPMENT' && (
                  <TextField select label="Оптовий клієнт" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                    {activeCustomers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </TextField>
                )}
                {type === 'WRITE_OFF' && (
                  <TextField select label="Причина списання" value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value as WriteOffReason)} required>
                    {Object.entries(writeOffReasonLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </TextField>
                )}
                <TextField label="Примітка" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
              </Stack>
            </ContentCard>
          )}

          {step === 2 && (
            <>
              {type === 'WRITE_OFF' && expiredBatchesPanel}
              <ContentCard title={type === 'WRITE_OFF' ? 'Що списати' : 'Рядки товарів'}>
                {type === 'SHIPMENT' && customerId && priceByProduct.size > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Ціни підставлені з прайс-листу клієнта ({priceByProduct.size} позицій). Можна змінити вручну.
                </Alert>
              )}
              {activeLinesTable}
                <Button
                  sx={{ mt: 2 }}
                  variant="outlined"
                  onClick={() => setLines((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0, expiredBatchId: '' }])}
                >
                  + Додати рядок
                </Button>
              </ContentCard>
            </>
          )}

          {step === 3 && (
            <>
              <ContentCard title="Підсумок" sx={{ mb: 2 }}>
                <Stack spacing={1}>
                  <Typography><strong>Тип:</strong> {docTypeLabels[type]}</Typography>
                  {type === 'RECEIPT' && <Typography><strong>Постачальник:</strong> {activeSuppliers.find((s) => s.id === supplierId)?.name ?? '—'}</Typography>}
                  {type === 'SHIPMENT' && <Typography><strong>Клієнт:</strong> {activeCustomers.find((c) => c.id === customerId)?.name ?? '—'}</Typography>}
                  {type === 'WRITE_OFF' && writeOffReason && <Typography><strong>Причина:</strong> {writeOffReasonLabels[writeOffReason]}</Typography>}
                  <Typography><strong>Рядків:</strong> {buildPayload().lines.length}</Typography>
                  {type === 'SHIPMENT' && <Typography><strong>Сума:</strong> {formatUah(totalSum)}</Typography>}
                </Stack>
              </ContentCard>
              {fefoBlock}
            </>
          )}

          <Box mt={3} display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Button disabled={step === 0} onClick={goBack}>Назад</Button>
            <Stack direction="row" spacing={1}>
              <Button variant="text" onClick={() => navigate('/documents')}>Скасувати</Button>
              {step < wizardSteps.length - 1 ? (
                <Button variant="contained" onClick={goNext}>Далі</Button>
              ) : (
                <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
                  Зберегти чернетку
                </Button>
              )}
            </Stack>
          </Box>
        </>
      )}
    </>
  );
}
