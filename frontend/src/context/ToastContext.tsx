import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';

type ToastSeverity = 'error' | 'success' | 'info' | 'warning';

type ToastState = {
  open: boolean;
  message: string;
  severity: ToastSeverity;
};

type ToastContextValue = {
  showToast: (message: string, severity?: ToastSeverity) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'error' });

  const showToast = useCallback((message: string, severity: ToastSeverity = 'error') => {
    setToast({ open: true, message, severity });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast outside provider');
  return ctx;
}
