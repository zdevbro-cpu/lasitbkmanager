export type PaymentStatus = 'paid' | 'unpaid' | 'cancelled';
export type RefundStatus = 'requested' | 'processing' | 'completed' | 'rejected';

export interface Payment {
  id: string;
  memberId: string;
  amountPaid: number;           // 실결제금액 (KRW)
  amountFullPrice: number;      // 정상가 (환불 계산 기준)
  paymentMethod?: string;
  paymentDate: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  status: PaymentStatus;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Refund {
  id: string;
  memberId: string;
  paymentId?: string;
  paymentAmount: number;
  usageMonths: number;
  usageFee: number;
  penaltyRate: number;
  penaltyAmount: number;
  tabletDeduction: number;
  refundAmount: number;
  status: RefundStatus;
  reason: string;
  tabletReturned: boolean;
  refundDate?: string;
  processedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  memberId: string;
  amountPaid: number;
  amountFullPrice: number;
  paymentMethod?: string;
  paymentDate: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  notes?: string;
}
