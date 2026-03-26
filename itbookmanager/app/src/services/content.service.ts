import apiClient from './api.client';

export interface ContentPackage {
  id: string;
  week_number: number;
  title: string;
  description?: string;
  book_count: number;
  completion_pct: number;
  accessed_at: string;
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
}

export interface ContentProgress {
  content_item_id: string;
  progress_pct: number;
  is_completed: boolean;
  time_spent_sec: number;
}

export const contentService = {
  // 내가 접근 가능한 패키지 목록
  async getMyPackages(): Promise<ContentPackage[]> {
    const res = await apiClient.get<{ data: ContentPackage[] }>('/content/packages', { params: { published: true } });
    return res.data.data;
  },

  // 패키지 상세 (콘텐츠 목록 포함)
  async getPackage(id: string) {
    const res = await apiClient.get<{ items: ContentItem[] } & ContentPackage>(`/content/packages/${id}`);
    return res.data;
  },

  // 콘텐츠 다운로드 URL
  async getContentUrl(itemId: string): Promise<string> {
    const res = await apiClient.get<{ url: string }>(`/content/items/${itemId}/url`);
    return res.data.url;
  },

  // 진도 업데이트
  async updateProgress(contentItemId: string, progressPct: number, timeSpentSec?: number) {
    await apiClient.patch('/lms/progress', { contentItemId, progressPct, timeSpentSec });
  },

  // 완료 처리
  async markCompleted(itemId: string) {
    await apiClient.post(`/lms/progress/${itemId}/complete`);
  },
};
