import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Button,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Box,
  Typography,
  Stack,
  alpha,
  Badge,
  Divider,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined';
import { NotificationPanel } from '../components/NotificationPanel';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { docTypeLabels, formatDate } from '../utils/labels';
import type { Document, WorkspaceNotification } from '../types';
import { hideOnXs } from '../utils/tableResponsive';

type TaskItem = {
  label: string;
  hint: string;
  to: string;
  icon: React.ReactNode;
  count: number;
  accent: string;
};

export function ManagerWorkspacePage() {
  const { data } = useQuery({
    queryKey: ['workspace-manager'],
    queryFn: async () => (await api.get('/workspace/manager')).data,
  });

  const draftCount = data?.draftCount ?? 0;
  const lowStockCount = data?.lowStock?.length ?? 0;
  const expiringCount = data?.expiringSoon?.length ?? 0;

  const notifications: WorkspaceNotification[] = data?.notifications ?? [];
  const expiredCount = data?.expiredCount ?? 0;

  const taskQueue: TaskItem[] = [
    {
      label: 'Прострочено',
      hint: 'Потребує списання',
      to: '/batches?expiredOnly=true',
      icon: <RemoveShoppingCartOutlinedIcon fontSize="small" />,
      count: expiredCount,
      accent: '#991b1b',
    },
    {
      label: 'Чернетки документів',
      hint: 'Потребують проведення',
      to: '/documents?status=DRAFT',
      icon: <EditOutlinedIcon fontSize="small" />,
      count: draftCount,
      accent: '#ea580c',
    },
    {
      label: 'Низький залишок',
      hint: 'Нижче мінімуму',
      to: '/stock?lowOnly=true',
      icon: <WarningAmberOutlinedIcon fontSize="small" />,
      count: lowStockCount,
      accent: '#d97706',
    },
    {
      label: 'Термін ≤ 7 днів',
      hint: 'Партії під ризиком',
      to: '/batches?expiringOnly=true',
      icon: <ScheduleOutlinedIcon fontSize="small" />,
      count: expiringCount,
      accent: '#dc2626',
    },
  ];

  const quickActions = [
    { label: 'Надходження', to: '/documents/new?type=RECEIPT', icon: <ReceiptLongOutlinedIcon /> },
    { label: 'Реалізація', to: '/documents/new?type=SHIPMENT', icon: <LocalShippingOutlinedIcon /> },
    { label: 'Залишки', to: '/stock', icon: <Inventory2OutlinedIcon /> },
    { label: 'Партії', to: '/batches', icon: <LayersOutlinedIcon /> },
  ];

  return (
    <>
      <PageHeader
        title="Робочий стіл"
        subtitle="Черга задач, ризики по залишках і швидкі дії на сьогодні"
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained" component={Link} to="/documents/new?type=RECEIPT" startIcon={<AddIcon />}>
              Надходження
            </Button>
            <Button variant="outlined" component={Link} to="/documents/new?type=SHIPMENT" startIcon={<AddIcon />}>
              Реалізація
            </Button>
          </Stack>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '280px 1fr' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        {/* Left task queue sidebar */}
        <Box
          sx={{
            position: { lg: 'sticky' },
            top: { lg: 88 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <NotificationPanel notifications={notifications} sx={{ mb: 0 }} />

          <ContentCard title="Черга задач" sx={{ overflow: 'hidden' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5, mt: -0.5 }}>
              Пріоритет на сьогодні
            </Typography>
            <Stack divider={<Divider flexItem />}>
              {taskQueue.map((task) => (
                <Box
                  key={task.label}
                  component={Link}
                  to={task.to}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.25,
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: alpha('#047857', 0.05) },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(task.accent, 0.12),
                      color: task.accent,
                      flexShrink: 0,
                    }}
                  >
                    {task.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {task.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {task.hint}
                    </Typography>
                  </Box>
                  <Badge
                    badgeContent={task.count}
                    color={task.count > 0 ? 'error' : 'default'}
                    sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
                  >
                    <Box sx={{ width: 8 }} />
                  </Badge>
                </Box>
              ))}
            </Stack>
          </ContentCard>

          <ContentCard title="Швидкі дії">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  component={Link}
                  to={action.to}
                  variant="outlined"
                  size="small"
                  startIcon={action.icon}
                  sx={{
                    justifyContent: 'flex-start',
                    borderRadius: 2,
                    py: 1,
                    fontSize: '0.75rem',
                    borderColor: alpha('#047857', 0.2),
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </ContentCard>
        </Box>

        {/* Main workspace column */}
        <Box>
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={4}>
              <StatCard
                label="Чернеток документів"
                value={draftCount}
                icon={<EditOutlinedIcon />}
                accent="coral"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                label="Проведено сьогодні"
                value={data?.postedToday ?? 0}
                icon={<TaskAltOutlinedIcon />}
                accent="teal"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                label="Низький залишок"
                value={lowStockCount}
                icon={<WarningAmberOutlinedIcon />}
                accent="gold"
              />
            </Grid>
          </Grid>

          <ContentCard
            title="Чернетки — потребують проведення"
            action={
              <Button size="small" component={Link} to="/documents?status=DRAFT">
                Усі чернетки
              </Button>
            }
            sx={{ mb: 2.5 }}
          >
            {(data?.drafts ?? []).length === 0 ? (
              <Typography color="text.secondary" py={2} textAlign="center">
                Немає чернеток.{' '}
                <Button component={Link} to="/documents/new" size="small">
                  Створити документ
                </Button>
              </Typography>
            ) : (
              <ScrollableTable minWidth={560} compactMinWidth={280}>
                <TableHead>
                  <TableRow>
                    <TableCell>Номер</TableCell>
                    <TableCell sx={hideOnXs}>Тип</TableCell>
                    <TableCell sx={hideOnXs}>Контрагент</TableCell>
                    <TableCell align="right">Дії</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.drafts as Document[]).map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
                        {d.number}
                      </TableCell>
                      <TableCell sx={hideOnXs}>{docTypeLabels[d.type]}</TableCell>
                      <TableCell sx={hideOnXs}>{d.supplier?.name ?? d.customer?.name ?? '—'}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Button
                            size="small"
                            component={Link}
                            to={`/documents/${d.id}`}
                            sx={{ display: { xs: 'none', sm: 'inline-flex' }, minWidth: 0, px: 1 }}
                          >
                            Відкрити
                          </Button>
                          <IconButton
                            size="small"
                            component={Link}
                            to={`/documents/${d.id}`}
                            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                            aria-label="Відкрити"
                          >
                            <OpenInNewOutlinedIcon fontSize="small" />
                          </IconButton>
                          <Button
                            size="small"
                            component={Link}
                            to={`/documents/${d.id}/edit`}
                            sx={{ display: { xs: 'none', sm: 'inline-flex' }, minWidth: 0, px: 1 }}
                          >
                            Редагувати
                          </Button>
                          <IconButton
                            size="small"
                            component={Link}
                            to={`/documents/${d.id}/edit`}
                            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                            aria-label="Редагувати"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ScrollableTable>
            )}
          </ContentCard>

          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <ContentCard title="Низький залишок">
                {(data?.lowStock ?? []).length === 0 ? (
                  <Typography color="text.secondary" fontSize="0.9rem">
                    Усе в нормі
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {data.lowStock.map(
                      (row: { product: { id: string; name: string }; stock: number; minStock: number }) => (
                        <Box
                          key={row.product.id}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 0.75,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {row.product.name}
                          </Typography>
                          <Chip label={`${row.stock} / ${row.minStock}`} size="small" color="error" variant="outlined" />
                        </Box>
                      ),
                    )}
                  </Stack>
                )}
              </ContentCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <ContentCard title="Термін ≤ 7 днів">
                {(data?.expiringSoon ?? []).length === 0 ? (
                  <Typography color="text.secondary" fontSize="0.9rem">
                    Критичних партій немає
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {data.expiringSoon.map(
                      (b: { id: string; product: { name: string }; quantity: number; expiryDate: string }) => (
                        <Box key={b.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {b.product.name}
                          </Typography>
                          <Chip
                            icon={<ScheduleOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                            label={formatDate(b.expiryDate)}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        </Box>
                      ),
                    )}
                  </Stack>
                )}
              </ContentCard>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
}
