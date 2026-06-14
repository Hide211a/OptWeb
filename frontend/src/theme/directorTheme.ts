import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';

export const directorTokens = {
  bg: '#0b1410',
  bgGradient: 'linear-gradient(165deg, #0b1410 0%, #0f1f18 45%, #132820 100%)',
  surface: '#152820',
  surfaceElevated: '#1a3228',
  border: alpha('#34d399', 0.14),
  text: '#ecfdf5',
  textMuted: alpha('#ecfdf5', 0.62),
  accent: '#34d399',
  accentWarm: '#fbbf24',
  headerBg: alpha('#0b1410', 0.94),
  navActiveBg: alpha('#34d399', 0.14),
};

export const directorAlertSx = {
  bgcolor: alpha('#34d399', 0.08),
  color: '#ecfdf5',
  border: `1px solid ${alpha('#34d399', 0.2)}`,
  '& .MuiAlert-icon': { color: '#34d399' },
};

export const directorNavTokens = {
  barBg: directorTokens.headerBg,
  border: directorTokens.border,
  text: directorTokens.textMuted,
  muted: alpha('#ecfdf5', 0.5),
  heading: directorTokens.text,
  activeText: directorTokens.accent,
  activeBg: directorTokens.navActiveBg,
  accent: directorTokens.accent,
  accentLight: '#6ee7b7',
  warm: directorTokens.accentWarm,
};

/** Глобальні стилі для сторінок керівника (темний фон) */
export const directorPageSx: SxProps<Theme> = {
  color: directorTokens.text,
  '& .MuiInputLabel-root': { color: directorTokens.textMuted },
  '& .MuiInputLabel-root.Mui-focused': { color: directorTokens.accent },
  '& .MuiOutlinedInput-root': {
    color: '#0f1a14',
    bgcolor: '#fff',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: alpha('#34d399', 0.2),
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: alpha('#34d399', 0.4),
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: directorTokens.accent,
  },
  '& .MuiFormControlLabel-label': { color: alpha(directorTokens.text, 0.82) },
  '& .MuiCheckbox-root': {
    color: alpha(directorTokens.accent, 0.5),
    '&.Mui-checked': { color: directorTokens.accent },
  },
  '& .MuiSwitch-root .MuiSwitch-track': { bgcolor: alpha('#ecfdf5', 0.18) },
  '& .MuiSwitch-root .Mui-checked + .MuiSwitch-track': { bgcolor: alpha(directorTokens.accent, 0.45) },
  '& .MuiTab-root': { color: alpha(directorTokens.text, 0.55) },
  '& .MuiTab-root.Mui-selected': { color: directorTokens.accent },
  '& .MuiTabs-indicator': { bgcolor: directorTokens.accent },
  '& .MuiStepLabel-label': { color: alpha(directorTokens.text, 0.5) },
  '& .MuiStepLabel-label.Mui-active': { color: directorTokens.text, fontWeight: 600 },
  '& .MuiStepLabel-label.Mui-completed': { color: directorTokens.accent },
  '& .MuiStepIcon-root': { color: alpha(directorTokens.text, 0.28) },
  '& .MuiStepIcon-root.Mui-active': { color: directorTokens.accent },
  '& .MuiStepIcon-root.Mui-completed': { color: directorTokens.accent },
  '& .MuiButton-outlined': {
    borderColor: alpha(directorTokens.accent, 0.32),
    color: directorTokens.text,
    '&:hover': {
      borderColor: directorTokens.accent,
      bgcolor: alpha(directorTokens.accent, 0.08),
    },
  },
  '& .MuiButton-text': { color: alpha(directorTokens.text, 0.78) },
  '& .MuiChip-outlined': {
    borderColor: alpha(directorTokens.accent, 0.28),
    color: alpha(directorTokens.text, 0.9),
  },
  '& .MuiTableCell-head': {
    color: `${alpha(directorTokens.text, 0.55)} !important`,
    bgcolor: `${alpha(directorTokens.accent, 0.06)} !important`,
  },
  '& .MuiTableCell-root': {
    color: alpha(directorTokens.text, 0.9),
    borderColor: alpha(directorTokens.accent, 0.08),
  },
  '& .MuiAlert-standardError': {
    bgcolor: alpha('#dc2626', 0.12),
    color: '#fecaca',
    border: `1px solid ${alpha('#dc2626', 0.25)}`,
  },
  '& .MuiAlert-standardWarning': {
    bgcolor: alpha('#d97706', 0.12),
    color: '#fde68a',
    border: `1px solid ${alpha('#d97706', 0.25)}`,
  },
};
