import apiClient from './api.client';
import type { StaffRole } from '../context/AuthContext';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
  store_id?: string | null;
  store_code?: string | null;
  store_name?: string | null;
}

export interface CreateStaffResult {
  staff: StaffMember;
  tempPassword: string;
}

export const staffService = {
  getMe: () =>
    apiClient.get<StaffMember>('/staff/me').then(r => r.data),

  list: () =>
    apiClient.get<StaffMember[]>('/staff').then(r => r.data),

  create: (data: { name: string; email: string; role: StaffRole; phone?: string; storeId?: string | null }) =>
    apiClient.post<CreateStaffResult>('/staff', data).then(r => r.data),

  update: (id: string, data: Partial<{ name: string; role: StaffRole; phone: string; is_active: boolean; storeId: string | null }>) =>
    apiClient.put<StaffMember>(`/staff/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/staff/${id}`).then(r => r.data),
};
