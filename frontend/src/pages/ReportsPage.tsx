import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Tabs, Tab, TableBody, TableCell, TableHead, TableRow, TextField, Button, Box, Typography, Chip,
} from '@mui/material';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { docTypeLabels, formatDateTime, formatDate, unitLabels } from '../utils/labels';
import { expiryStatusColor, expiryStatusLabel, formatDaysLeft } from '../utils/expiry';
import { downloadCsv, formatUah } from '../utils/csv';
import { exportTablePdf } from '../utils/pdf';
import { useAuth } from '../context/AuthContext';
import { mutedColor, skuSx } from '../utils/themeHelpers';
import type { ExpiryStatus, Unit } from '../types';

type ExpiryRow = {
  id: string;
  productName: string;
  sku: string;
  category: string;
  unit: Unit;
  quantity: number;
  expiryDate: string | null;
  daysLeft: number | null;
  status: ExpiryStatus;
  value: number;
};

type ExpiryReport = {
  summary: {
    expiredCount: number;
    expiringCount: number;
    totalQty: number;
    valueAtRisk: number;
    expiringDays: number;
  };
  rows: ExpiryRow[];
};

export function ReportsPage() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const [tab, setTab] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expiringDays, setExpiringDays] = useState('7');

  const params = { ...(from && { from: new Date(from).toISOString() }), ...(to && { to: new Date(to).toISOString() }) };

  const { data: stock = [] } = useQuery({
    queryKey: ['report-stock'],
    queryFn: async () => (await api.get('/reports/stock')).data,
  });

  const { data: movement = [] } = useQuery({
    queryKey: ['report-movement', from, to],
    queryFn: async () => (await api.get('/reports/movement', { params })).data,
    enabled: tab === 2,
  });

  const { data: topCustomers = [] } = useQuery({
    queryKey: ['report-top', from, to],
    queryFn: async () => (await api.get('/reports/top-customers', { params })).data,
    enabled: tab === 3,
  });

  const { data: expiryReport } = useQuery({
    queryKey: ['report-expiry', expiringDays],
    queryFn: async () =>
      (await api.get<ExpiryReport>('/reports/expiry', {
        params: { expiringDays: expiringDays || '7' },
      })).data,
    enabled: tab === 1,
  });

  const topCsvRows = topCustomers.map((r: { name: string; shipments: number; totalQty: number; totalSum: number }) => ({
    Клієнт: r.name,
    Відвантажень: r.shipments,
    Кількість: r.totalQty,
    'Сума (грн)': r.totalSum.toFixed(2),
  }));

  const expiryCsvRows = (expiryReport?.rows ?? []).map((r) => ({
    SKU: r.sku,
    Товар: r.productName,
    Категорія: r.category,
    Кількість: r.quantity,
    'Термін придатності': formatDate(r.expiryDate),
    Статус: expiryStatusLabel(r.status),
    'Оцінка (грн)': r.value.toFixed(2),
  }));

  return (
    <>
      <PageHeader
        title="Звіти та аналітика"
        subtitle="Залишки, ризики прострочення, рух товарів, топ B2B-клієнтів"
        dark={isDirector}
      />

      {isDirector && (
        <DirectorViewAlert sx={{ mb: 2 }}>
          Режим перегляду та експорту. Зміни в системі недоступні для ролі керівника.
        </DirectorViewAlert>
      )}

      {(tab === 2 || tab === 3) && (
        <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
          <TextField
            type="date"
            size="small"
            label="З"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label="По"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="caption" sx={{ alignSelf: 'center', color: mutedColor(isDirector) }}>
            {tab === 2 ? 'Рух: за замовч. 30 днів' : 'Топ клієнтів: за замовч. 90 днів'}
          </Typography>
        </Box>
      )}

      {tab === 1 && (
        <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
          <TextField
            type="number"
            size="small"
            label="Днів до терміну"
            value={expiringDays}
            onChange={(e) => setExpiringDays(e.target.value)}
            sx={{ width: 160 }}
          />
          <Typography variant="caption" sx={{ color: mutedColor(isDirector) }}>
            Показує прострочені та партії, що закінчуються протягом N днів
          </Typography>
        </Box>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Залишки" />
        <Tab label="Прострочення" />
        <Tab label="Рух товарів" />
        <Tab label="Топ клієнтів" />
      </Tabs>

      {tab === 0 && (
        <ContentCard
          title="Звіт по залишках"
          action={
            <Box display="flex" gap={1}>
              <Button size="small" variant="outlined" onClick={() => downloadCsv('zalyshky.csv', stock)} disabled={!stock.length}>
                CSV
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!stock.length}
                onClick={() =>
                  exportTablePdf({
                    title: 'Звіт по залишках',
                    filename: 'zalyshky.pdf',
                    columns: [
                      { header: 'SKU', key: 'sku' },
                      { header: 'Назва', key: 'name' },
                      { header: 'Категорія', key: 'category' },
                      { header: 'Кількість', key: 'quantity', align: 'right' },
                      { header: 'Оцінка', key: 'value', align: 'right' },
                    ],
                    rows: stock.map((r: { sku: string; name: string; category: string; quantity: number; value: number }) => ({
                      sku: r.sku,
                      name: r.name,
                      category: r.category,
                      quantity: r.quantity,
                      value: r.value.toFixed(2),
                    })),
                  })
                }
              >
                PDF
              </Button>
            </Box>
          }
          noPadding
          dark={isDirector}
        >
          <ScrollableTable minWidth={640} compactMinWidth={320}>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Назва</TableCell>
                <TableCell>Категорія</TableCell>
                <TableCell align="right">Кількість</TableCell>
                <TableCell align="right">Оцінка (грн)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stock.map((r: { sku: string; name: string; category: string; quantity: number; value: number }) => (
                <TableRow key={r.sku}>
                  <TableCell sx={skuSx(isDirector)}>{r.sku}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell align="right">{r.quantity}</TableCell>
                  <TableCell align="right">{r.value.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollableTable>
        </ContentCard>
      )}

      {tab === 1 && (
        <>
          {expiryReport && (
            <Box display="flex" flexWrap="wrap" gap={1.5} mb={2}>
              <Chip label={`Прострочено: ${expiryReport.summary.expiredCount}`} color="error" size="small" />
              <Chip label={`Скоро термін: ${expiryReport.summary.expiringCount}`} color="warning" size="small" />
              <Chip label={`Кількість: ${expiryReport.summary.totalQty}`} variant="outlined" size="small" />
              <Chip label={`Ризик: ${formatUah(expiryReport.summary.valueAtRisk)}`} variant="outlined" size="small" />
            </Box>
          )}
          <ContentCard
            title="Ризики по терміну придатності"
            action={
              <Box display="flex" gap={1}>
                <Button size="small" variant="outlined" onClick={() => downloadCsv('prostrochennya.csv', expiryCsvRows)} disabled={!expiryReport?.rows.length}>
                  CSV
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!expiryReport?.rows.length}
                  onClick={() =>
                    exportTablePdf({
                      title: 'Ризики по терміну придатності',
                      subtitle: `Прострочено: ${expiryReport?.summary.expiredCount ?? 0}, скоро термін: ${expiryReport?.summary.expiringCount ?? 0}`,
                      filename: 'prostrochennya.pdf',
                      columns: [
                        { header: 'SKU', key: 'sku' },
                        { header: 'Товар', key: 'name' },
                        { header: 'К-сть', key: 'qty', align: 'right' },
                        { header: 'Термін', key: 'expiry' },
                        { header: 'Статус', key: 'status' },
                        { header: 'Оцінка', key: 'value', align: 'right' },
                      ],
                      rows: (expiryReport?.rows ?? []).map((r) => ({
                        sku: r.sku,
                        name: r.productName,
                        qty: `${r.quantity} ${unitLabels[r.unit]}`,
                        expiry: formatDate(r.expiryDate),
                        status: expiryStatusLabel(r.status),
                        value: r.value.toFixed(2),
                      })),
                    })
                  }
                >
                  PDF
                </Button>
              </Box>
            }
            noPadding
            dark={isDirector}
          >
            <ScrollableTable minWidth={640} compactMinWidth={320}>
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell>Категорія</TableCell>
                  <TableCell align="right">К-сть</TableCell>
                  <TableCell>Термін</TableCell>
                  <TableCell>Залишилось</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Оцінка</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(expiryReport?.rows ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: mutedColor(isDirector) }}>
                      Критичних партій не знайдено
                    </TableCell>
                  </TableRow>
                ) : (
                  expiryReport?.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Typography fontWeight={600}>{r.productName}</Typography>
                    <Typography variant="caption" sx={skuSx(isDirector)}>{r.sku}</Typography>
                      </TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell align="right">{r.quantity} {unitLabels[r.unit]}</TableCell>
                      <TableCell>{formatDate(r.expiryDate)}</TableCell>
                      <TableCell>{formatDaysLeft(r.daysLeft)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={expiryStatusLabel(r.status)} color={expiryStatusColor(r.status)} />
                      </TableCell>
                      <TableCell align="right">{formatUah(r.value)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </ScrollableTable>
          </ContentCard>
        </>
      )}

      {tab === 2 && (
        <ContentCard
          title="Рух товарів"
          action={
            <Box display="flex" gap={1}>
              <Button size="small" variant="outlined" onClick={() => downloadCsv('rukh.csv', movement)} disabled={!movement.length}>
                CSV
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!movement.length}
                onClick={() =>
                  exportTablePdf({
                    title: 'Рух товарів',
                    subtitle: from || to ? `Період: ${from || '…'} — ${to || '…'}` : undefined,
                    filename: 'rukh.pdf',
                    columns: [
                      { header: 'Дата', key: 'date' },
                      { header: 'Документ', key: 'doc' },
                      { header: 'Тип', key: 'type' },
                      { header: 'Товар', key: 'product' },
                      { header: 'К-сть', key: 'qty', align: 'right' },
                      { header: 'Контрагент', key: 'counterparty' },
                    ],
                    rows: movement.map(
                      (r: {
                        date: string;
                        documentNumber: string;
                        type: string;
                        product: string;
                        quantity: number;
                        counterparty: string;
                      }) => ({
                        date: formatDateTime(r.date),
                        doc: r.documentNumber,
                        type: docTypeLabels[r.type as keyof typeof docTypeLabels],
                        product: r.product,
                        qty: r.quantity,
                        counterparty: r.counterparty,
                      }),
                    ),
                  })
                }
              >
                PDF
              </Button>
            </Box>
          }
          noPadding
          dark={isDirector}
        >
          <ScrollableTable minWidth={640} compactMinWidth={320}>
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Документ</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Товар</TableCell>
                <TableCell align="right">К-сть</TableCell>
                <TableCell>Контрагент</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movement.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: mutedColor(isDirector) }}>
                    Немає даних за обраний період
                  </TableCell>
                </TableRow>
              ) : (
                movement.map(
                  (
                    r: {
                      date: string;
                      documentNumber: string;
                      type: string;
                      product: string;
                      quantity: number;
                      counterparty: string;
                    },
                    i: number,
                  ) => (
                    <TableRow key={i}>
                      <TableCell>{formatDateTime(r.date)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.documentNumber}</TableCell>
                      <TableCell>{docTypeLabels[r.type as keyof typeof docTypeLabels]}</TableCell>
                      <TableCell>{r.product}</TableCell>
                      <TableCell align="right">{r.quantity}</TableCell>
                      <TableCell>{r.counterparty}</TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </ScrollableTable>
        </ContentCard>
      )}

      {tab === 3 && (
        <ContentCard
          title="Топ оптових клієнтів"
          action={
            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => downloadCsv('top-kliyenty.csv', topCsvRows)}
                disabled={!topCustomers.length}
              >
                CSV
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!topCustomers.length}
                onClick={() =>
                  exportTablePdf({
                    title: 'Топ оптових клієнтів',
                    subtitle: from || to ? `Період: ${from || '…'} — ${to || '…'}` : undefined,
                    filename: 'top-kliyenty.pdf',
                    columns: [
                      { header: 'Клієнт', key: 'name' },
                      { header: 'Відвантажень', key: 'shipments', align: 'right' },
                      { header: 'Кількість', key: 'qty', align: 'right' },
                      { header: 'Сума (грн)', key: 'sum', align: 'right' },
                    ],
                    rows: topCustomers.map((r: { name: string; shipments: number; totalQty: number; totalSum: number }) => ({
                      name: r.name,
                      shipments: r.shipments,
                      qty: r.totalQty,
                      sum: r.totalSum.toFixed(2),
                    })),
                  })
                }
              >
                PDF
              </Button>
            </Box>
          }
          noPadding
          dark={isDirector}
        >
          <ScrollableTable minWidth={640} compactMinWidth={320}>
            <TableHead>
              <TableRow>
                <TableCell>Клієнт</TableCell>
                <TableCell align="right">Відвантажень</TableCell>
                <TableCell align="right">Кількість</TableCell>
                <TableCell align="right">Сума (грн)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: mutedColor(isDirector) }}>
                    Немає відвантажень за період
                  </TableCell>
                </TableRow>
              ) : (
                topCustomers.map((r: { name: string; shipments: number; totalQty: number; totalSum: number }) => (
                  <TableRow key={r.name}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                    <TableCell align="right">{r.shipments}</TableCell>
                    <TableCell align="right">{r.totalQty}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{r.totalSum.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </ScrollableTable>
        </ContentCard>
      )}
    </>
  );
}
