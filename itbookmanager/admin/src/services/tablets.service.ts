import apiClient from './api.client';

export interface Tablet {
  id: string;
  qr_code: string;
  model_name?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  status: 'stock' | 'loaned' | 'returned' | 'repair' | 'lost' | 'assigned';
  current_member_id?: string;
  member_name?: string;
  member_number?: string;
  loan_start_date?: string;
  notes?: string;
  created_at: string;
  store_id?: string | null;
  store_code?: string | null;
  store_name?: string | null;
  sub_store_name?: string | null;
  loan_officer_name?: string | null;
}

export interface TabletLoan {
  id: string;
  tablet_id: string;
  member_id?: string;
  member_name?: string;
  action: string;
  action_date: string;
  returned_date?: string;
  condition_ok?: boolean;
  condition_notes?: string;
}

export interface TabletListResult {
  data: Tablet[];
  total: number;
  statusCounts?: {
    total: number;
    stock: number;
    assigned: number;
    loaned: number;
    repair: number;
    lost: number;
  };
  page: number;
  limit: number;
}

export const tabletsService = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<TabletListResult>('/tablets', { params }).then(r => r.data),

  getOne: (id: string) =>
    apiClient.get<Tablet>(`/tablets/${id}`).then(r => r.data),

  getByQr: (qrCode: string) =>
    apiClient.get<Tablet>(`/tablets/qr/${qrCode}`).then(r => r.data),

  create: (data: { modelName?: string; serialNumber?: string; purchaseDate?: string; purchasePrice?: number; notes?: string; storeId?: string; subStoreName?: string }) =>
    apiClient.post<Tablet>('/tablets', data).then(r => r.data),

  update: (id: string, data: { modelName?: string; serialNumber?: string; purchaseDate?: string; purchasePrice?: number; notes?: string; subStoreName?: string | null }) =>
    apiClient.put<Tablet>(`/tablets/${id}`, data).then(r => r.data),

  loan: (id: string, memberId: string | null, processedBy?: string, officerName?: string) =>
    apiClient.post<Tablet>(`/tablets/${id}/loan`, { memberId, processedBy, officerName }).then(r => r.data),

  return: (id: string, conditionOk: boolean, conditionNotes?: string) =>
    apiClient.post<Tablet>(`/tablets/${id}/return`, { conditionOk, conditionNotes }).then(r => r.data),

  reportLost: (id: string, notes?: string) =>
    apiClient.post<Tablet>(`/tablets/${id}/lost`, { notes }).then(r => r.data),

  recover: (id: string) =>
    apiClient.post<Tablet>(`/tablets/${id}/recover`, {}).then(r => r.data),

  getHistory: (id: string) =>
    apiClient.get<TabletLoan[]>(`/tablets/${id}/history`).then(r => r.data),

  getQrImageUrl: (id: string) => `/api/v1/tablets/${id}/qr-image`,

  batchCreate: (tablets: Array<{ modelName?: string; serialNumber?: string; purchaseDate?: string; purchasePrice?: number; notes?: string; storeId?: string; subStoreName?: string }>) =>
    apiClient.post<{ created: number; tablets: Tablet[] }>('/tablets/batch', { tablets }).then(r => r.data),

  bulkAssignStore: (tabletIds: string[], storeId: string | null, isRelease = false) =>
    apiClient.patch<{ updated: number }>('/tablets/bulk-assign', { tabletIds, storeId, isRelease }).then(r => r.data),

  bulkAssignSubStore: (tabletIds: string[], subStoreName: string | null) =>
    apiClient.patch<{ updated: number }>('/tablets/bulk-sub-store', { tabletIds, subStoreName }).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/tablets/${id}`).then(r => r.data),

  regenQr: (id: string) =>
    apiClient.post<Tablet>(`/tablets/${id}/regen-qr`).then(r => r.data),
};
