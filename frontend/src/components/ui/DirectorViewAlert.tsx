import { Alert, type AlertProps } from '@mui/material';
import { directorAlertSx } from '../../theme/directorTheme';

export function DirectorViewAlert({ children, sx, ...props }: AlertProps) {
  return (
    <Alert severity="info" sx={{ mb: 2, ...directorAlertSx, ...sx }} {...props}>
      {children}
    </Alert>
  );
}
