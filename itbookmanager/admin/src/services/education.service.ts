import apiClient from './api.client';

export interface EducationSession {
  id: string;
  member_id: string;
  member_name: string;
  member_number: string;
  session_date: string;
  instructor?: string;
  attended: boolean;
  rating?: number;
  notes?: string;
  created_at: string;
}

export const educationService = {
  async listSessions(params?: { memberId?: string; fromDate?: string; toDate?: string }): Promise<EducationSession[]> {
    const res = await apiClient.get<EducationSession[]>('/education', { params });
    return res.data;
  },

  async createSession(data: { memberId: string; sessionDate: string; instructor?: string; attended?: boolean; rating?: number; notes?: string }) {
    const res = await apiClient.post<EducationSession>('/education', data);
    return res.data;
  },

  async updateSession(id: string, data: { attended?: boolean; rating?: number; notes?: string; instructor?: string }) {
    const res = await apiClient.put<EducationSession>(`/education/${id}`, data);
    return res.data;
  },

  async deleteSession(id: string) {
    await apiClient.delete(`/education/${id}`);
  },
};
