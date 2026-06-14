import { alpha } from '@mui/material/styles';
import { directorTokens } from '../theme/directorTheme';
import { forest } from '../theme';

export function mutedColor(dark: boolean) {
  return dark ? alpha(directorTokens.text, 0.55) : 'text.secondary';
}

export function docLinkSx(dark: boolean) {
  return {
    fontFamily: 'monospace',
    fontWeight: 700,
    color: dark ? directorTokens.accent : forest,
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline' },
  };
}

export function skuSx(dark = false) {
  return {
    fontFamily: 'monospace',
    fontWeight: 600,
    fontSize: '0.8125rem',
    color: dark ? alpha(directorTokens.text, 0.7) : 'text.secondary',
  };
}
