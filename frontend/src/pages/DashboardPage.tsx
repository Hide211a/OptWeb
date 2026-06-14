import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Grid, TableBody, TableCell, TableHead, TableRow, Chip, Box, Alert, Button, Typography, alpha } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { docTypeLabels, docStatusLabels, formatDate, formatDateTime } from '../utils/labels';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { SimpleBarChart } from '../components/ui/SimpleBarChart';
import { formatUah } from '../utils/csv';
import { normalizeDashboardKpi, isStaleDashboardApi } from '../utils/dashboardKpi';
import { useAuth } from '../context/AuthContext';
import type { Document } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';

  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
    refetchOnWindowFocus: true,
  });

  const kpi = normalizeDashboardKpi(data?.kpi);
  const staleApi = isStaleDashboardApi(data?.kpi);

  const chartData = (data?.shipmentsTrend ?? []).map(
    (p: { date: string; revenue: number }) => ({
      label: new Date(p.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
      value: p.revenue,
    }),
  );

  const topCustomers = data?.topCustomers ?? [];

  return (
    <>
      <PageHeader
        title={isDirector ? 'Панель керівника' : 'Огляд складу'}
        subtitle={
          isDirector
            ? 'Аналітика та контроль — без зміни даних (режим перегляду)'
            : 'Ключові показники, ризики по залишках та термінах придатності'
        }
        dark={isDirector}
      />

      {isDirector && (
        <DirectorViewAlert>
          Ви переглядаєте дані в режимі керівника. Створення та проведення документів доступне менеджеру складу.
        </DirectorViewAlert>
      )}

      {staleApi && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Сервер API застарілий — суми в гривнях недоступні. У терміналі в папці{' '}
          <strong>backend</strong> виконайте: <code>npm run build</code> і <code>npm run dev</code>, потім оновіть сторінку (F5).
        </Alert>
      )}

      {isDirector && kpi && ((kpi.shipmentsQtyMonth ?? 0) > 0 || (kpi.shipmentsQtyToday ?? 0) > 0) && !kpi.revenueMonthUah && !kpi.revenueTodayUah && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          У проведених реалізаціях не вказано ціну продажу в рядках — сума в гривнях буде 0. Додайте поле «Ціна» перед проведенням.
        </Alert>
      )}

      {isDirector ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
            gap: 2.5,
            mb: 3,
          }}
        >
          <StatCard label="Чернеток" value={kpi?.draftCount ?? 0} icon={<EditNoteOutlinedIcon />} accent="gold" dark />
          <StatCard
            label="Реалізація сьогодні"
            value={formatUah(kpi?.revenueTodayUah)}
            hint="проведені відвантаження"
            icon={<TrendingUpOutlinedIcon />}
            accent="coral"
            dark
          />
          <StatCard
            label="Реалізація за місяць"
            value={formatUah(kpi?.revenueMonthUah)}
            hint="з 1-го числа"
            icon={<TrendingUpOutlinedIcon />}
            accent="violet"
            dark
          />
          <StatCard
            label="Відвантажено (міс.)"
            value={kpi?.shipmentsQtyMonth != null ? Number(kpi.shipmentsQtyMonth).toFixed(0) : '—'}
            icon={<TrendingUpOutlinedIcon />}
            accent="teal"
            dark
          />
          <StatCard
            label="Списано (міс.)"
            value={kpi?.writeOffQtyMonth != null ? Number(kpi.writeOffQtyMonth).toFixed(0) : '—'}
            icon={<RemoveShoppingCartOutlinedIcon />}
            accent="gold"
            dark
          />
          <StatCard
            label="Проведено сьогодні"
            value={
              kpi?.postedTodayShipments != null && kpi.postedTodayShipments !== kpi.postedToday
                ? `${kpi.postedToday} (${kpi.postedTodayShipments} реал.)`
                : (kpi?.postedToday ?? 0)
            }
            hint="усі типи документів"
            icon={<TaskAltOutlinedIcon />}
            accent="coral"
            dark
          />
        </Box>
      ) : (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard label="Активних товарів" value={kpi?.products ?? '—'} icon={<Inventory2OutlinedIcon />} accent="coral" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard label="Оптових клієнтів" value={kpi?.customers ?? '—'} icon={<GroupsOutlinedIcon />} accent="teal" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              label="Реалізація сьогодні"
              value={formatUah(kpi?.revenueTodayUah)}
              hint="відвантаження"
              icon={<TrendingUpOutlinedIcon />}
              accent="coral"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              label="Реалізація за місяць"
              value={formatUah(kpi?.revenueMonthUah)}
              hint="з 1-го числа"
              icon={<TrendingUpOutlinedIcon />}
              accent="violet"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              label="Проведено сьогодні"
              value={kpi?.postedToday ?? '—'}
              hint="усі типи"
              icon={<TaskAltOutlinedIcon />}
              accent="gold"
            />
          </Grid>
        </Grid>
      )}

      {isDirector && (data?.draftPreview?.length ?? 0) > 0 && (
        <ContentCard
          title="Чернетки — очікують проведення"
          action={
            <Button size="small" component={Link} to="/documents?status=DRAFT">
              Усі чернетки
            </Button>
          }
          sx={{ mb: 2.5 }}
          dark
          noPadding
        >
          <ScrollableTable minWidth={560} compactMinWidth={320}>
            <TableHead>
              <TableRow>
                <TableCell>Номер</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Контрагент</TableCell>
                <TableCell>Статус</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.draftPreview as Document[]).map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell>
                    <Box
                      component={Link}
                      to={`/documents/${d.id}`}
                      sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399', textDecoration: 'none' }}
                    >
                      {d.number}
                    </Box>
                  </TableCell>
                  <TableCell>{docTypeLabels[d.type]}</TableCell>
                  <TableCell>{d.supplier?.name ?? d.customer?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Chip label={docStatusLabels[d.status]} size="small" variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollableTable>
        </ContentCard>
      )}

      {isDirector && (
        <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
          <Grid item xs={12} lg={7}>
            <ContentCard title="Реалізація за 14 днів (грн)" dark>
              <SimpleBarChart data={chartData} valueFormatter={(v) => formatUah(v)} height={200} dark />
            </ContentCard>
          </Grid>
          <Grid item xs={12} lg={5}>
            <ContentCard
              title="Топ клієнтів (місяць)"
              action={
                <Button size="small" component={Link} to="/customers">
                  Усі клієнти
                </Button>
              }
              dark
            >
              <ScrollableTable minWidth={560} compactMinWidth={320}>
                <TableHead>
                  <TableRow>
                    <TableCell>Клієнт</TableCell>
                    <TableCell align="right">Сума</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} sx={{ color: alpha('#ecfdf5', 0.45), py: 3, textAlign: 'center' }}>
                        Ще немає реалізацій цього місяця
                      </TableCell>
                    </TableRow>
                  ) : (
                    topCustomers.map((c: { id: string; name: string; totalSum: number; shipments: number }) => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Box
                            component={Link}
                            to={`/customers/${c.id}`}
                            sx={{ fontWeight: 700, color: '#34d399', textDecoration: 'none' }}
                          >
                            {c.name}
                          </Box>
                          <Typography variant="caption" sx={{ color: alpha('#ecfdf5', 0.45) }} display="block">
                            {c.shipments} відвант.
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatUah(c.totalSum)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </ScrollableTable>
            </ContentCard>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <ContentCard title="Низький залишок" dark={isDirector}>
            <ScrollableTable minWidth={560} compactMinWidth={320}>
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell align="right">Залишок</TableCell>
                  <TableCell align="right">Мін.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.lowStock ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ color: isDirector ? alpha('#ecfdf5', 0.45) : 'text.secondary', py: 3, textAlign: 'center' }}>
                      Усе в нормі
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.lowStock ?? []).map((row: { product: { name: string }; stock: number; minStock: number }) => (
                    <TableRow key={row.product.name}>
                      <TableCell sx={{ fontWeight: 600 }}>{row.product.name}</TableCell>
                      <TableCell align="right">
                        <Chip label={row.stock} color="error" size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{row.minStock}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </ScrollableTable>
          </ContentCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <ContentCard title="Термін ≤ 7 днів" dark={isDirector}>
            <ScrollableTable minWidth={560} compactMinWidth={320}>
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell align="right">К-сть</TableCell>
                  <TableCell>Термін</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.expiringSoon ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ color: isDirector ? alpha('#ecfdf5', 0.45) : 'text.secondary', py: 3, textAlign: 'center' }}>
                      Немає критичних партій
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.expiringSoon ?? []).map((b: { id: string; product: { name: string }; quantity: number; expiryDate: string }) => (
                    <TableRow key={b.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{b.product.name}</TableCell>
                      <TableCell align="right">{b.quantity}</TableCell>
                      <TableCell>
                        <Chip label={formatDate(b.expiryDate)} size="small" color="warning" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </ScrollableTable>
          </ContentCard>
        </Grid>

        <Grid item xs={12}>
          <ContentCard title="Останні проведені операції" noPadding dark={isDirector}>
            <ScrollableTable minWidth={560} compactMinWidth={320}>
              <TableHead>
                <TableRow>
                  <TableCell>Номер</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Контрагент</TableCell>
                  <TableCell>Автор</TableCell>
                  <TableCell>Дата</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.recentDocs ?? []).map((d: Document) => (
                  <TableRow key={d.id} hover>
                    <TableCell>
                      <Box
                        component={Link}
                        to={`/documents/${d.id}`}
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: isDirector ? '#34d399' : 'primary.main',
                          textDecoration: 'none',
                        }}
                      >
                        {d.number}
                      </Box>
                    </TableCell>
                    <TableCell>{docTypeLabels[d.type]}</TableCell>
                    <TableCell>{d.supplier?.name ?? d.customer?.name ?? '—'}</TableCell>
                    <TableCell sx={{ color: isDirector ? alpha('#ecfdf5', 0.45) : 'text.secondary' }}>{d.createdBy?.fullName ?? '—'}</TableCell>
                    <TableCell sx={{ color: isDirector ? alpha('#ecfdf5', 0.45) : 'text.secondary' }}>{formatDateTime(d.postedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ScrollableTable>
          </ContentCard>
        </Grid>
      </Grid>
    </>
  );
}
