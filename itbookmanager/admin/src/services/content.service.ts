import apiClient from './api.client';

export interface ContentPackage {
  id: string;
  week_number: number;
  title: string;
  description?: string;
  book_count: number;
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

export interface ContentItem {
  id: string;
  package_id: string;
  title: string;
  author?: string;
  content_type: 'video' | 'audio' | 'pdf';
  storage_path?: string;
  file_size_bytes?: number;
  duration_sec?: number;
  sort_order: number;
  is_active: boolean;
}

export interface PackageWithItems extends ContentPackage {
  items: ContentItem[];
}

export interface MemberAccess {
  id: string;
  package_id: string;
  week_number: number;
  title: string;
  book_count: number;
  completion_pct: number;
  accessed_at: string;
}

export interface LmsReport {
  id: string;
  name: string;
  member_number: string;
  member_type: string;
  current_week: number;
  access_packages: number;
  completed_items: number;
  total_time_sec: number;
}

export const contentService = {
  async listPackages(params?: { published?: boolean; page?: number; limit?: number }) {
    const res = await apiClient.get<{ data: ContentPackage[]; total: number }>('/content/packages', { params });
    return res.data;
  },

  async getPackage(id: string): Promise<PackageWithItems> {
    const res = await apiClient.get<PackageWithItems>(`/content/packages/${id}`);
    return res.data;
  },

  async createPackage(data: { weekNumber: number; title: string; description?: string }) {
    const res = await apiClient.post<ContentPackage>('/content/packages', data);
    return res.data;
  },

  async updatePackage(id: string, data: { title?: string; description?: string }) {
    const res = await apiClient.put<ContentPackage>(`/content/packages/${id}`, data);
    return res.data;
  },

  async publishPackage(id: string) {
    const res = await apiClient.patch<ContentPackage>(`/content/packages/${id}/publish`);
    return res.data;
  },

  async deletePackage(id: string) {
    await apiClient.delete(`/content/packages/${id}`);
  },

  async addItem(packageId: string, data: { title: string; author?: string; contentType: string; sortOrder?: number }) {
    const res = await apiClient.post<ContentItem>(`/content/packages/${packageId}/items`, data);
    return res.data;
  },

  async updateItem(itemId: string, data: Partial<ContentItem & { storagePath: string; fileSizeBytes: number; durationSec: number }>) {
    const res = await apiClient.put<ContentItem>(`/content/items/${itemId}`, data);
    return res.data;
  },

  async deleteItem(itemId: string) {
    await apiClient.delete(`/content/items/${itemId}`);
  },

  async getUploadUrl(itemId: string, filename: string, contentType: string) {
    const res = await apiClient.post<{ uploadUrl: string; storagePath: string }>(`/content/items/${itemId}/upload-url`, { filename, contentType });
    return res.data;
  },

  async distributeToMember(memberId: string, weekNumber?: number, fromWeek?: number, toWeek?: number) {
    const res = await apiClient.post('/content/distribute', { memberId, weekNumber, fromWeek, toWeek });
    return res.data;
  },

  async distributeToAll(weekNumber: number) {
    const res = await apiClient.post('/content/distribute/all', { weekNumber });
    return res.data;
  },

  async getMemberAccess(memberId: string): Promise<MemberAccess[]> {
    const res = await apiClient.get<MemberAccess[]>(`/content/access/${memberId}`);
    return res.data;
  },

  async getBulkReport(): Promise<LmsReport[]> {
    const res = await apiClient.get<LmsReport[]>('/lms/report');
    return res.data;
  },

  async getMemberReport(memberId: string) {
    const res = await apiClient.get(`/lms/report/${memberId}`);
    return res.data;
  },
};
