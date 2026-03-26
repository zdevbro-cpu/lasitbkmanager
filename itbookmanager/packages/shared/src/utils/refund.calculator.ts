import { REFUND_WINDOWS, DEFAULT_PENALTY_RATE, MONTHS_PER_YEAR } from '../constants/refund.constants';

export interface RefundInput {
  fullPriceAmount: number;      // 정상가 (연간, KRW)
  paymentDate: Date;            // 결제일 (구독 시작일)
  refundRequestDate: Date;      // 환불 요청일
  applyPenalty?: boolean;       // 위약금 적용 여부 (default: true)
  penaltyRate?: number;         // 위약금 비율 (default: 0.10)
  tabletNotReturned?: boolean;  // 태블릿 미반납 여부
  tabletPurchasePrice?: number; // 태블릿 구입가 (미반납 시 차감)
}

export interface RefundCalculation {
  usageDays: number;
  usageMonths: number;
  monthlyRate: number;          // 정상가 기준 월 이용료
  usageFee: number;
  penaltyAmount: number;
  tabletDeduction: number;
  refundAmount: number;
  refundEligible: boolean;
  refundRule: 'full' | 'usage_deduct' | 'no_refund';
  notes: string;
}

export function calculateRefund(input: RefundInput): RefundCalculation {
  const {
    fullPriceAmount,
    paymentDate,
    refundRequestDate,
    applyPenalty = true,
    penaltyRate = DEFAULT_PENALTY_RATE,
    tabletNotReturned = false,
    tabletPurchasePrice = 0,
  } = input;

  const usageDays = Math.floor(
    (refundRequestDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const usageMonths = usageDays / 30;
  const monthlyRate = Math.floor(fullPriceAmount / MONTHS_PER_YEAR);

  // 환불 불가 구간
  if (usageMonths >= REFUND_WINDOWS.NO_REFUND_MONTHS) {
    return {
      usageDays,
      usageMonths,
      monthlyRate,
      usageFee: fullPriceAmount,
      penaltyAmount: 0,
      tabletDeduction: tabletNotReturned ? (tabletPurchasePrice ?? 0) : 0,
      refundAmount: 0,
      refundEligible: false,
      refundRule: 'no_refund',
      notes: `구독 ${REFUND_WINDOWS.NO_REFUND_MONTHS}개월 이후 환불 불가`,
    };
  }

  // 7일 이내 전액 환불
  if (usageDays <= REFUND_WINDOWS.FULL_REFUND_DAYS) {
    const tabletDeduction = tabletNotReturned ? (tabletPurchasePrice ?? 0) : 0;
    const refundAmount = Math.max(0, fullPriceAmount - tabletDeduction);
    return {
      usageDays,
      usageMonths,
      monthlyRate,
      usageFee: 0,
      penaltyAmount: 0,
      tabletDeduction,
      refundAmount,
      refundEligible: true,
      refundRule: 'full',
      notes: `구독 ${REFUND_WINDOWS.FULL_REFUND_DAYS}일 이내 전액 환불`,
    };
  }

  // 사용료 공제 환불
  const usedMonthsCeil = Math.ceil(usageMonths);
  const usageFee = usedMonthsCeil * monthlyRate;
  const base = fullPriceAmount - usageFee;
  const penaltyAmount = applyPenalty ? Math.floor(base * penaltyRate) : 0;
  const tabletDeduction = tabletNotReturned ? (tabletPurchasePrice ?? 0) : 0;
  const refundAmount = Math.max(0, base - penaltyAmount - tabletDeduction);

  return {
    usageDays,
    usageMonths,
    monthlyRate,
    usageFee,
    penaltyAmount,
    tabletDeduction,
    refundAmount,
    refundEligible: refundAmount > 0,
    refundRule: 'usage_deduct',
    notes: `사용 ${usedMonthsCeil}개월 기준 정상가(${fullPriceAmount.toLocaleString()}원) 환불`,
  };
}
