import apiClient from './api.client';

export interface Payment {
  id: string;
  member_id: string;
  member_name: string;
  member_number: string;
  amount_paid: number;
  amount_full_price: number;
  payment_method: string;
  status: string;
  payment_date: string;
  notes?: string;
}

export interface Refund {
  id: string;
  member_id: string;
  member_name: string;
  member_number: string;
  payment_id: string;
  usage_days: number;
  usage_fee: number;
  penalty_amount: number;
  tablet_deduction: number;
  refund_amount: number;
  refund_rule: string;
  status: string;
  reason?: string;
  rejection_reason?: string;
  requested_at: string;
  processed_at?: string;
}

export interface RefundCalculation {
  usageDays: number;
  usageMonths: number;
  monthlyRate: number;
  usageFee: number;
  penaltyAmount: number;
  tabletDeduction: number;
  refundAmount: number;
  refundEligible: boolean;
  refundRule: string;
  notes: string;
}

export const paymentsService = {
  async listPayments(memberId?: string): Promise<Payment[]> {
    const res = await apiClient.get<Payment[]>('/payments', { params: memberId ? { memberId } : undefined });
    return res.data;
  },

  async createPayment(data: { memberId: string; amountPaid: number; amountFullPrice: number; paymentMethod?: string; notes?: string }) {
    const res = await apiClient.post<Payment>('/payments', data);
    return res.data;
  },

  async listRefunds(status?: string): Promise<Refund[]> {
    const res = await apiClient.get<Refund[]>('/payments/refunds', { params: status ? { status } : undefined });
    return res.data;
  },

  async calculateRefund(paymentId: string, refundRequestDate?: string): Promise<{ payment: Payment; calculation: RefundCalculation }> {
    const res = await apiClient.get('/payments/refunds/calculate', { params: { paymentId, refundRequestDate } });
    return res.data as { payment: Payment; calculation: RefundCalculation };
  },

  async requestRefund(data: { memberId: string; paymentId: string; reason?: string }) {
    const res = await apiClient.post<Refund>('/payments/refunds', data);
    return res.data;
  },

  async approveRefund(id: string) {
    const res = await apiClient.patch<Refund>(`/payments/refunds/${id}/approve`);
    return res.data;
  },

  async rejectRefund(id: string, rejectionReason: string) {
    const res = await apiClient.patch<Refund>(`/payments/refunds/${id}/reject`, { rejectionReason });
    return res.data;
  },
};
