import { useState } from 'react';
import {
  Outlet,
  useNavigate,
  useLocation,
  Link as RouterLink,
} from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Avatar,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from '../components/NotificationBell';
import { roleLabels } from '../utils/labels';
import { navTokens } from '../theme';
import { directorNavTokens, directorPageSx } from '../theme/directorTheme';
import type { Role } from '../types';

type NavTokens = typeof navTokens;

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: Role[];
  /** У випадаючому меню «Ще» (для ролей з довгою навігацією) */
  overflow?: boolean;
};

const nav: NavItem[] = [
  { label: 'Робочий стіл', path: '/workspace', icon: <WorkOutlineOutlinedIcon fontSize="small" />, roles: ['MANAGER'] },
  { label: 'Аналітика', path: '/dashboard', icon: <DashboardOutlinedIcon fontSize="small" />, roles: ['DIRECTOR', 'ADMIN'], overflow: true },
  { label: 'Партії', path: '/batches', icon: <LayersOutlinedIcon fontSize="small" />, roles: ['ADMIN', 'MANAGER', 'DIRECTOR'] },
  { label: 'Залишки', path: '/stock', icon: <InventoryOutlinedIcon fontSize="small" />, roles: ['ADMIN', 'MANAGER', 'DIRECTOR'] },
  { label: 'Клієнти', path: '/customers', icon: <GroupsOutlinedIcon fontSize="small" />, roles: ['ADMIN', 'MANAGER', 'DIRECTOR'] },
  { label: 'Документи', path: '/documents', icon: <ReceiptLongOutlinedIcon fontSize="small" />, roles: ['ADMIN', 'MANAGER', 'DIRECTOR'] },
  { label: 'Товари', path: '/products', icon: <CategoryOutlinedIcon fontSize="small" />, roles: ['ADMIN', 'MANAGER', 'DIRECTOR'] },
  { label: 'Звіти', path: '/reports', icon: <InsightsOutlinedIcon fontSize="small" />, roles: ['DIRECTOR', 'ADMIN'], overflow: true },
  { label: 'Журнал', path: '/audit', icon: <HistoryOutlinedIcon fontSize="small" />, roles: ['DIRECTOR', 'ADMIN'], overflow: true },
  { label: 'Довідники', path: '/directories', icon: <FolderOpenOutlinedIcon fontSize="small" />, roles: ['ADMIN'], overflow: true },
  { label: 'Адмін', path: '/admin', icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />, roles: ['ADMIN'], overflow: true },
  { label: 'Команда', path: '/users', icon: <GroupOutlinedIcon fontSize="small" />, roles: ['ADMIN'], overflow: true },
];

const roleColors: Record<Role, string> = {
  ADMIN: '#7c3aed',
  MANAGER: '#059669',
  DIRECTOR: '#d97706',
};

function userInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function NavPill({
  item,
  active,
  tokens,
  compact,
}: {
  item: NavItem;
  active: boolean;
  tokens: NavTokens;
  compact?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 0.5 : 0.75,
        px: compact ? 1.25 : 1.5,
        py: compact ? 0.65 : 0.75,
        borderRadius: 999,
        fontWeight: active ? 700 : 600,
        fontSize: compact ? '0.75rem' : '0.8125rem',
        whiteSpace: 'nowrap',
        color: active ? tokens.activeText : tokens.text,
        bgcolor: active ? tokens.activeBg : 'transparent',
        border: '1px solid',
        borderColor: active ? alpha(tokens.accent, 0.35) : 'transparent',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: active ? tokens.activeBg : alpha(tokens.accent, 0.08),
          color: tokens.activeText,
        },
      }}
    >
      {item.icon}
      {item.label}
    </Box>
  );
}

function NavLinks({
  items,
  overflowItems = [],
  pathname,
  onNavigate,
  vertical,
  tokens = navTokens,
}: {
  items: NavItem[];
  overflowItems?: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  vertical?: boolean;
  tokens?: NavTokens;
}) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const overflowActive = overflowItems.some(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  const renderItem = (item: NavItem, compact?: boolean) => {
    const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
    const content = <NavPill item={item} active={active} tokens={tokens} compact={compact} />;

    if (vertical) {
      return (
        <ListItemButton
          key={item.path}
          component={RouterLink}
          to={item.path}
          selected={active}
          onClick={onNavigate}
          sx={{ borderRadius: 2, mx: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: active ? tokens.accent : 'inherit' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 500 }} />
        </ListItemButton>
      );
    }

    return (
      <RouterLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
        {content}
      </RouterLink>
    );
  };

  if (vertical) {
    return (
      <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1 }}>
        {[...items, ...overflowItems].map((item) => renderItem(item))}
      </Box>
    );
  }

  return (
    <Box
      component="nav"
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0.5,
        flexWrap: 'nowrap',
        minWidth: 0,
      }}
    >
      {items.map((item) => renderItem(item, overflowItems.length > 0))}
      {overflowItems.length > 0 && (
        <>
          <Button
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            endIcon={<MoreHorizOutlinedIcon sx={{ fontSize: '18px !important' }} />}
            sx={{
              borderRadius: 999,
              px: 1.5,
              py: 0.65,
              minWidth: 0,
              fontWeight: overflowActive ? 700 : 600,
              fontSize: '0.75rem',
              color: overflowActive ? tokens.activeText : tokens.text,
              bgcolor: overflowActive ? tokens.activeBg : 'transparent',
              border: '1px solid',
              borderColor: overflowActive ? alpha(tokens.accent, 0.35) : 'transparent',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: overflowActive ? tokens.activeBg : alpha(tokens.accent, 0.08),
              },
            }}
          >
            Ще
          </Button>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 200,
                  borderRadius: 2,
                  boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
                },
              },
            }}
          >
            {overflowItems.map((item) => {
              const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <MenuItem
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  selected={active}
                  onClick={() => setMenuAnchor(null)}
                  sx={{ gap: 1.5, fontWeight: active ? 700 : 500, fontSize: '0.875rem' }}
                >
                  <Box sx={{ color: active ? tokens.accent : 'text.secondary', display: 'flex' }}>
                    {item.icon}
                  </Box>
                  {item.label}
                </MenuItem>
              );
            })}
          </Menu>
        </>
      )}
    </Box>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const items = nav.filter((n) => user && n.roles.includes(user.role));
  const mainNavItems = items.filter((n) => !n.overflow);
  const overflowNavItems = items.filter((n) => n.overflow);
  const isDirector = user?.role === 'DIRECTOR';
  const isManagerWorkspace =
    user?.role === 'MANAGER' &&
    (location.pathname === '/workspace' || location.pathname.startsWith('/workspace/'));
  const tokens = isDirector ? directorNavTokens : navTokens;
  const mainSurfaceClass = isDirector
    ? 'director-main-surface'
    : isManagerWorkspace
      ? 'manager-workspace-surface'
      : 'app-main-surface';

  const currentPage =
    items.find(
      (i) =>
        location.pathname === i.path ||
        location.pathname.startsWith(`${i.path}/`),
    )?.label ?? 'ОптСклад';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDirector ? directorNavTokens.barBg : 'background.default',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: tokens.barBg,
          color: tokens.text,
          borderBottom: `1px solid ${tokens.border}`,
          backdropFilter: 'blur(16px)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1.5, sm: 2, md: 3 }, gap: 1.5 }}>
          {isMobile && (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ color: tokens.text }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              textDecoration: 'none',
              color: 'inherit',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${tokens.accent} 0%, ${tokens.accentLight} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 6px 20px ${alpha(tokens.accent, 0.35)}`,
              }}
            >
              <StorefrontOutlinedIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'block', xl: 'none' } }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.1, color: tokens.heading }}>
                ОптСклад
              </Typography>
            </Box>
            <Box sx={{ display: { xs: 'none', xl: 'block' } }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.1, color: tokens.heading }}>
                ОптСклад
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: tokens.muted, fontWeight: 500 }}>
                аналітика · реалізація · FEFO
              </Typography>
            </Box>
          </Box>

          {!isMobile && (
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0, mx: 0.5 }}>
              <NavLinks
                items={mainNavItems}
                overflowItems={overflowNavItems}
                pathname={location.pathname}
                tokens={tokens}
              />
            </Box>
          )}

          <Box sx={{ flex: isMobile ? 1 : undefined, minWidth: 0 }}>
            {isMobile && (
              <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.95rem', color: tokens.heading }}>
                {currentPage}
              </Typography>
            )}
          </Box>

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              {(user.role === 'MANAGER' || user.role === 'ADMIN') && <NotificationBell />}
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: alpha(roleColors[user.role], 0.15),
                  color: roleColors[user.role],
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: { xs: 'none', sm: 'flex' },
                }}
              >
                {userInitials(user.fullName)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: '0.8rem', fontWeight: 700, color: tokens.heading, lineHeight: 1.2 }}>
                  {user.fullName}
                </Typography>
                <Typography noWrap sx={{ fontSize: '0.68rem', color: roleColors[user.role], fontWeight: 600 }}>
                  {roleLabels[user.role]}
                </Typography>
              </Box>
              <Button
                size="small"
                color="inherit"
                component={RouterLink}
                to="/profile"
                sx={{
                  color: tokens.muted,
                  fontWeight: 600,
                  minWidth: 0,
                  px: { xs: 1, sm: 1.5 },
                  display: { xs: 'none', md: 'inline-flex' },
                }}
                startIcon={<PersonOutlinedIcon sx={{ fontSize: 18 }} />}
              >
                Профіль
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                sx={{
                  color: tokens.muted,
                  fontWeight: 600,
                  minWidth: 0,
                  px: { xs: 1, sm: 1.5 },
                }}
                startIcon={<LogoutOutlinedIcon sx={{ fontSize: 18 }} />}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Вийти
                </Box>
              </Button>
            </Box>
          )}
        </Toolbar>

        {!isMobile && (
          <Box
            sx={{
              height: 3,
              background: `linear-gradient(90deg, ${tokens.accent} 0%, ${tokens.accentLight} 50%, ${tokens.warm} 100%)`,
            }}
          />
        )}
      </AppBar>

      <Drawer
        anchor="top"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: tokens.barBg,
            color: tokens.text,
            borderBottom: `1px solid ${tokens.border}`,
            maxHeight: '85vh',
          },
        }}
      >
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="subtitle2" sx={{ color: tokens.muted, mb: 1, px: 1 }}>
            Навігація
          </Typography>
          <NavLinks
            items={mainNavItems}
            overflowItems={overflowNavItems}
            pathname={location.pathname}
            vertical
            tokens={tokens}
            onNavigate={() => setMobileOpen(false)}
          />
          <Divider sx={{ my: 1.5, borderColor: tokens.border }} />
          <ListItemButton
            component={RouterLink}
            to="/profile"
            onClick={() => setMobileOpen(false)}
            sx={{ borderRadius: 2, mx: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <PersonOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Профіль" />
          </ListItemButton>
          <Divider sx={{ my: 1.5, borderColor: tokens.border }} />
          {user && (
            <Typography variant="caption" sx={{ px: 2, color: tokens.muted }}>
              {user.fullName} · {roleLabels[user.role]}
            </Typography>
          )}
        </Box>
      </Drawer>

      <Box component="main" className={mainSurfaceClass} sx={{ flex: 1 }}>
        <Container
          maxWidth="xl"
          sx={{
            py: { xs: 2, md: 3 },
            px: { xs: 2, md: 3 },
            ...(isDirector ? directorPageSx : {}),
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
