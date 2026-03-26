import apiClient from './api.client';

export interface Member {
  id: string;
  member_number: string;
  name: string;
  phone?: string;
  email: string;
  member_type: 'managed' | 'subscription';
  member_status: 'pending' | 'active' | 'suspended' | 'pending_withdrawal' | 'ended' | 'withdrawn';
  payment_plan_name?: string;
  plan_amount?: number;
  plan_discounted_amt?: number;
  payment_method?: string;
  joined_at?: string;
  last_payment_date?: string;
  next_payment_date?: string;
  member_qr_code?: string;
  current_tablet_id?: string;
  tablet_qr_code?: string;
  tablet_model?: string;
  assigned_instructor?: string;
  notes?: string;
  created_at: string;
  store_id?: string | null;
  store_code?: string | null;
  store_name?: string | null;
}

export interface MemberTypeHistory {
  id: string;
  member_id: string;
  previous_type: string;
  new_type: string;
  changed_at: string;
  change_reason?: string;
  price_diff_krw?: number;
  processed_by?: string;
}

export interface MemberListResult {
  data: Member[];
  total: number;
  page: number;
  limit: number;
}

export const membersService = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<MemberListResult>('/members', { params }).then(r => r.data),

  getOne: (id: string) =>
    apiClient.get<Member>(`/members/${id}`).then(r => r.data),

  create: (data: {
    name: string; email: string; memberType: string;
    phone?: string; paymentPlanName?: string; planAmount?: number;
    planDiscountedAmt?: number; paymentMethod?: string;
    assignedInstructor?: string; notes?: string; storeId?: string;
  }) => apiClient.post<Member>('/members', data).then(r => r.data),

  update: (id: string, data: {
    name?: string; phone?: string | null; paymentPlanName?: string | null;
    planAmount?: number | null; planDiscountedAmt?: number | null;
    paymentMethod?: string | null; assignedInstructor?: string | null;
    lastPaymentDate?: string | null; nextPaymentDate?: string | null;
    notes?: string | null;
  }) => apiClient.put<Member>(`/members/${id}`, data).then(r => r.data),

  changeStatus: (id: string, status: string) =>
    apiClient.patch<Member>(`/members/${id}/status`, { status }).then(r => r.data),

  changeType: (id: string, newType: string, changeReason: string, priceDiffKrw?: number) =>
    apiClient.patch<Member>(`/members/${id}/type`, { newType, changeReason, priceDiffKrw }).then(r => r.data),

  getTypeHistory: (id: string) =>
    apiClient.get<MemberTypeHistory[]>(`/members/${id}/type-history`).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/members/${id}`).then(r => r.data),

  getByQr: (code: string) =>
    apiClient.get<Member>(`/members/qr/${code}`).then(r => r.data),

  getQrImageUrl: (id: string) => `/api/v1/members/${id}/qr-image`,

  getQrImageBlob: (id: string) =>
    apiClient.get<Blob>(`/members/${id}/qr-image`, { responseType: 'blob' }).then(r => r.data),
};
