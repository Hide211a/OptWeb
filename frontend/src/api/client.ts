import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3002/api',
});

let toastHandler: ((message: string, severity?: 'error' | 'success' | 'info' | 'warning') => void) | null = null;

export function registerToastHandler(
  handler: (message: string, severity?: 'error' | 'success' | 'info' | 'warning') => void,
) {
  toastHandler = handler;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status as number | undefined;
    const message = err.response?.data?.error ?? (err.message === 'Network Error' ? 'Немає зʼєднання з сервером' : 'Помилка сервера');
    const url = String(err.config?.url ?? '');
    const skipToast = err.config?.skipToast === true;

    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('token');
      if (!skipToast) toastHandler?.('Сесія закінчилась — увійдіть знову', 'warning');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    } else if (!skipToast) {
      toastHandler?.(message, 'error');
    }

    return Promise.reject(new Error(message));
  },
);

export default api;
