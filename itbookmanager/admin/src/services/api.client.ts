import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { supabase } from '../supabase';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // 이미 토큰이 설정된 경우 덮어쓰지 않음 (onAuthStateChange 레이스 컨디션 방지)
  if (!config.headers.Authorization) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }
  return config;
});

let _redirecting = false;
apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && !_redirecting) {
      _redirecting = true;
      supabase.auth.signOut().finally(() => {
        window.location.href = '/login';
      });
    }
    return Promise.reject(err);
  }
);

export default apiClient;
