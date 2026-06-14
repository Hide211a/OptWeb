import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Grid, Button, Typography, Box, alpha } from '@mui/material';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ContentCard } from '../components/ui/ContentCard';
import { ink } from '../theme';

const accentColors = {
  violet: '#7c3aed',
  teal: '#0d9488',
  coral: '#ea580c',
  gold: '#d97706',
  forest: '#047857',
} as const;

const links: {
  title: string;
  desc: string;
  to: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { title: 'Команда', desc: 'Користувачі та ролі', to: '/users', icon: <GroupOutlinedIcon />, color: accentColors.violet },
  { title: 'Довідники', desc: 'Категорії, постачальники, клієнти', to: '/directories', icon: <FolderOpenOutlinedIcon />, color: accentColors.teal },
  { title: 'Товари', desc: 'Довідник продовольчих позицій', to: '/products', icon: <Inventory2OutlinedIcon />, color: accentColors.coral },
  { title: 'Документи', desc: 'Операції та розпроведення', to: '/documents', icon: <ArticleOutlinedIcon />, color: accentColors.gold },
  { title: 'Огляд', desc: 'KPI та ризики складу', to: '/dashboard', icon: <DashboardOutlinedIcon />, color: accentColors.forest },
  { title: 'Звіти', desc: 'Залишки, рух, експорт', to: '/reports', icon: <AssessmentOutlinedIcon />, color: accentColors.teal },
];

export function AdminPanelPage() {
  const { data } = useQuery({
    queryKey: ['workspace-admin'],
    queryFn: async () => (await api.get('/workspace/admin')).data,
  });

  return (
    <>
      <PageHeader
        title="Панель адміністратора"
        subtitle="Налаштування системи, довідники та контроль доступу"
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        <StatCard label="Користувачів" value={data?.users ?? '—'} icon={<GroupOutlinedIcon />} accent="violet" />
        <StatCard label="Товарів" value={data?.products ?? '—'} icon={<Inventory2OutlinedIcon />} accent="coral" />
        <StatCard label="Категорій" value={data?.categories ?? '—'} icon={<FolderOpenOutlinedIcon />} accent="teal" />
        <StatCard label="Постачальників" value={data?.suppliers ?? '—'} icon={<FolderOpenOutlinedIcon />} accent="gold" />
        <StatCard label="Клієнтів" value={data?.customers ?? '—'} icon={<GroupOutlinedIcon />} accent="forest" />
      </Box>

      {data?.inactiveProducts > 0 && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
          Неактивних товарів: {data.inactiveProducts} —{' '}
          <Button component={Link} to="/products?inactiveOnly=true" size="small">
            переглянути
          </Button>
        </Typography>
      )}

      <ContentCard title="Розділи системи">
        <Grid container spacing={2}>
          {links.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.to}>
              <Box
                component={Link}
                to={item.to}
                sx={{
                  display: 'block',
                  p: 2.5,
                  borderRadius: 3,
                  textDecoration: 'none',
                  color: 'inherit',
                  bgcolor: alpha('#047857', 0.03),
                  border: '1px solid',
                  borderColor: alpha(ink, 0.08),
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: item.color,
                    boxShadow: `0 8px 24px ${alpha(item.color, 0.15)}`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: alpha(item.color, 0.12),
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                  }}
                >
                  {item.icon}
                </Box>
                <Typography fontWeight={700}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {item.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </ContentCard>
    </>
  );
}
