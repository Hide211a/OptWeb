import { createTheme, alpha } from '@mui/material/styles';

export const forest = '#047857';
export const forestLight = '#10b981';
export const warm = '#ea580c';
export const ink = '#0f1a14';
export const slate = '#5f6b63';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: forest,
      dark: '#065f46',
      light: forestLight,
      contrastText: '#fff',
    },
    secondary: {
      main: warm,
      dark: '#c2410c',
      light: '#fb923c',
      contrastText: '#fff',
    },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    success: { main: '#16a34a' },
    background: {
      default: '#eef5f1',
      paper: '#ffffff',
    },
    text: {
      primary: ink,
      secondary: slate,
    },
    divider: alpha(ink, 0.08),
  },
  typography: {
    fontFamily: '"Outfit", system-ui, sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.03em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#eef5f1' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          '&:focus-visible': {
            outline: `2px solid ${alpha(forest, 0.35)}`,
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${forest} 0%, ${forestLight} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, #065f46 0%, ${forest} 100%)`,
          },
        },
        outlined: {
          borderColor: alpha(ink, 0.12),
          borderWidth: 1,
          '&:hover': {
            borderColor: forest,
            borderWidth: 1,
            backgroundColor: alpha(forest, 0.04),
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(ink, 0.08)}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#fff',
            '&.Mui-focused fieldset': { borderColor: forest, borderWidth: 2 },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
        filled: { border: 'none' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            color: slate,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            backgroundColor: alpha(forest, 0.04),
            borderBottom: `1px solid ${alpha(ink, 0.08)}`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': { borderBottom: 0 },
          '&:hover': { backgroundColor: alpha(forest, 0.03) },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 3, backgroundColor: forest },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiAppBar: {
      defaultProps: { color: 'default' },
    },
  },
});

export const navTokens = {
  barBg: alpha('#ffffff', 0.92),
  border: alpha(ink, 0.08),
  text: slate,
  muted: alpha(slate, 0.85),
  heading: ink,
  activeText: forest,
  activeBg: alpha(forest, 0.1),
  accent: forest,
  accentLight: forestLight,
  warm,
};

/** @deprecated use navTokens */
export const sidebarTokens = navTokens;
