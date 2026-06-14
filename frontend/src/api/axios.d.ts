import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipToast?: boolean;
  }
}
