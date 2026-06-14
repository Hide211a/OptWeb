import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Grid, TableBody, TableCell, TableHead, TableRow, Chip, Button, Typography, Stack,
} from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/labels';
import { formatUah } from '../utils/csv';
import { docLinkSx, mutedColor } from '../utils/themeHelpers';
import { CustomerPriceList } from '../components/CustomerPriceList';
import type { Customer } from '../types';

type CustomerDetail = {
  customer: Customer;
  stats: {
    shipmentCount: number;
    totalQty: number;
    totalRevenue: number;
    lastShipmentAt: string | null;
  };
  shipments: Array<{
    id: string;
    number: string;
    postedAt: string | null;
    lineCount: number;
    totalQty: number;
    totalSum: number;
    createdBy: string;
  }>;
};

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get<CustomerDetail>(`/directories/customers/${id}`)).data,
    enabled: !!id,
  });

  if (isLoading || !data) {
    return (
      <Typography sx={{ color: mutedColor(isDirector) }}>
        Завантаження картки клієнта…
      </Typography>
    );
  }

  const { customer, stats, shipments } = data;

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle="Картка оптового клієнта — аналітика реалізації"
        crumbs={[
          { label: 'Клієнти', to: '/customers' },
          { label: customer.name },
        ]}
        dark={isDirector}
      />

      {isDirector && (
        <DirectorViewAlert>Картка клієнта — режим перегляду для керівника.</DirectorViewAlert>
      )}

      <ContentCard sx={{ mb: 2.5 }} dark={isDirector}>
        <Stack direction="row" flexWrap="wrap" gap={2}>
          <Chip label={customer.edrpou ? `ЄДРПОУ ${customer.edrpou}` : 'ЄДРПОУ не вказано'} variant="outlined" />
          {customer.phone && <Chip label={customer.phone} variant="outlined" />}
          {customer.email && <Chip label={customer.email} variant="outlined" />}
          {customer.address && <Chip label={customer.address} variant="outlined" />}
        </Stack>
      </ContentCard>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Реалізацій"
            value={stats.shipmentCount}
            icon={<LocalShippingOutlinedIcon />}
            accent="forest"
            dark={isDirector}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Оборот"
            value={formatUah(stats.totalRevenue)}
            hint="проведені відвантаження"
            icon={<PaymentsOutlinedIcon />}
            accent="teal"
            dark={isDirector}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Остання реалізація"
            value={stats.lastShipmentAt ? formatDateTime(stats.lastShipmentAt) : '—'}
            icon={<HistoryOutlinedIcon />}
            accent="gold"
            dark={isDirector}
          />
        </Grid>
      </Grid>

      <CustomerPriceList customerId={customer.id} canEdit={canManage} dark={isDirector} />

      <ContentCard
        title="Історія реалізації"
        action={
          canManage ? (
            <Button
              variant="contained"
              size="small"
              component={Link}
              to={`/documents/new?type=SHIPMENT&customerId=${customer.id}`}
            >
              Нова реалізація
            </Button>
          ) : undefined
        }
        noPadding
        dark={isDirector}
      >
        {shipments.length === 0 ? (
          <Typography sx={{ color: mutedColor(isDirector) }} p={3} textAlign="center">
            Ще немає проведених відвантажень для цього клієнта.
          </Typography>
        ) : (
          <ScrollableTable minWidth={720} compactMinWidth={320}>
            <TableHead>
              <TableRow>
                <TableCell>Номер</TableCell>
                <TableCell>Дата</TableCell>
                <TableCell align="right">Рядків</TableCell>
                <TableCell align="right">Кількість</TableCell>
                <TableCell align="right">Сума</TableCell>
                <TableCell>Менеджер</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shipments.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography
                      component={Link}
                      to={`/documents/${s.id}`}
                      sx={docLinkSx(isDirector)}
                    >
                      {s.number}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDateTime(s.postedAt)}</TableCell>
                  <TableCell align="right">{s.lineCount}</TableCell>
                  <TableCell align="right">{s.totalQty}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatUah(s.totalSum)}</TableCell>
                  <TableCell sx={{ color: mutedColor(isDirector) }}>{s.createdBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollableTable>
        )}
      </ContentCard>

      <Button component={Link} to="/customers" sx={{ mt: 2 }}>
        ← До списку клієнтів
      </Button>
    </>
  );
}
