import { useEffect } from 'react';
import { registerToastHandler } from '../api/client';
import { useToast } from './ToastContext';

export function ToastBridge() {
  const { showToast } = useToast();

  useEffect(() => {
    registerToastHandler(showToast);
  }, [showToast]);

  return null;
}
