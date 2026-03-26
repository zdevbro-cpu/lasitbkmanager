import apiClient from './api.client';

export interface Store {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export const storesService = {
  list: (includeInactive = false) =>
    apiClient.get<Store[]>('/stores', { params: { includeInactive } }).then(r => r.data),

  getOne: (id: string) =>
    apiClient.get<Store>(`/stores/${id}`).then(r => r.data),

  create: (data: { code: string; name: string; address?: string; phone?: string }) =>
    apiClient.post<Store>('/stores', data).then(r => r.data),

  update: (id: string, data: { name?: string; address?: string | null; phone?: string | null; is_active?: boolean }) =>
    apiClient.put<Store>(`/stores/${id}`, data).then(r => r.data),
};
