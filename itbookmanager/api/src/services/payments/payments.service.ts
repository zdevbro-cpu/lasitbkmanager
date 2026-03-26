import { db } from '../../db';
// 환불 계산 (shared/utils/refund.calculator 복사 — Node API용)
const REFUND_WINDOWS = { FULL_REFUND_DAYS: 7, NO_REFUND_MONTHS: 10 };
const DEFAULT_PENALTY_RATE = 0.10;
const MONTHS_PER_YEAR = 12;

function calculateRefund(input: {
  fullPriceAmount: number; paymentDate: Date; refundRequestDate: Date;
  applyPenalty?: boolean; penaltyRate?: number;
  tabletNotReturned?: boolean; tabletPurchasePrice?: number;
}) {
  const {
    fullPriceAmount, paymentDate, refundRequestDate,
    applyPenalty = true, penaltyRate = DEFAULT_PENALTY_RATE,
    tabletNotReturned = false, tabletPurchasePrice = 0,
  } = input;

  const usageDays = Math.floor((refundRequestDate.getTime() - paymentDate.getTime()) / 86400000);
  const usageMonths = usageDays / 30;
  const monthlyRate = Math.floor(fullPriceAmount / MONTHS_PER_YEAR);

  if (usageMonths >= REFUND_WINDOWS.NO_REFUND_MONTHS) {
    return { usageDays, usageMonths, monthlyRate, usageFee: fullPriceAmount, penaltyAmount: 0,
      tabletDeduction: tabletNotReturned ? tabletPurchasePrice : 0, refundAmount: 0,
      refundEligible: false, refundRule: 'no_refund' as const, notes: '10개월 이후 환불 불가' };
  }
  if (usageDays <= REFUND_WINDOWS.FULL_REFUND_DAYS) {
    const tabletDeduction = tabletNotReturned ? tabletPurchasePrice : 0;
    return { usageDays, usageMonths, monthlyRate, usageFee: 0, penaltyAmount: 0,
      tabletDeduction, refundAmount: Math.max(0, fullPriceAmount - tabletDeduction),
      refundEligible: true, refundRule: 'full' as const, notes: '7일 이내 전액 환불' };
  }
  const usedMonthsCeil = Math.ceil(usageMonths);
  const usageFee = usedMonthsCeil * monthlyRate;
  const base = fullPriceAmount - usageFee;
  const penaltyAmount = applyPenalty ? Math.floor(base * penaltyRate) : 0;
  const tabletDeduction = tabletNotReturned ? tabletPurchasePrice : 0;
  const refundAmount = Math.max(0, base - penaltyAmount - tabletDeduction);
  return { usageDays, usageMonths, monthlyRate, usageFee, penaltyAmount, tabletDeduction,
    refundAmount, refundEligible: refundAmount > 0, refundRule: 'usage_deduct' as const,
    notes: `사용 ${usedMonthsCeil}개월 기준 정상가(${fullPriceAmount.toLocaleString()}원) 환불` };
}

// ─── 결제 ────────────────────────────────────────────────────────

export async function listPayments(memberId?: string) {
  const where = memberId ? 'WHERE p.member_id = $1' : '';
  const values = memberId ? [memberId] : [];
  const result = await db.query(
    `SELECT p.*, m.name AS member_name, m.member_number
     FROM payments p
     JOIN members m ON m.id = p.member_id
     ${where}
     ORDER BY p.payment_date DESC`,
    values
  );
  return result.rows;
}

export async function createPayment(data: {
  memberId: string;
  amountPaid: number;
  amountFullPrice: number;
  paymentMethod?: string;
  notes?: string;
  processedBy?: string;
}) {
  const result = await db.query(
    `INSERT INTO payments
       (member_id, amount_paid, amount_full_price, payment_method, notes, processed_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      data.memberId, data.amountPaid, data.amountFullPrice,
      data.paymentMethod ?? 'bank_transfer', data.notes ?? null, data.processedBy ?? null,
    ]
  );
  return result.rows[0];
}

// ─── 환불 ────────────────────────────────────────────────────────

// 환불 계산 미리보기 (DB 저장 없음)
export async function calculateRefundPreview(paymentId: string, refundRequestDate?: Date) {
  const payment = await db.query(
    `SELECT p.*, m.current_tablet_id,
            t.purchase_price AS tablet_purchase_price
     FROM payments p
     JOIN members m ON m.id = p.member_id
     LEFT JOIN tablets t ON t.id = m.current_tablet_id
     WHERE p.id = $1`,
    [paymentId]
  );
  if (!payment.rows[0]) throw new Error('Payment not found');
  const p = payment.rows[0] as {
    amount_full_price: number;
    payment_date: Date;
    member_id: string;
    current_tablet_id: string | null;
    tablet_purchase_price: number | null;
  };

  const requestDate = refundRequestDate ?? new Date();
  const calculation = calculateRefund({
    fullPriceAmount: p.amount_full_price,
    paymentDate: new Date(p.payment_date),
    refundRequestDate: requestDate,
    tabletNotReturned: !!p.current_tablet_id,
    tabletPurchasePrice: p.tablet_purchase_price ?? 0,
  });

  return { payment: payment.rows[0], calculation };
}

// 환불 요청 생성
export async function requestRefund(data: {
  memberId: string;
  paymentId: string;
  reason?: string;
  requestedBy?: string;
}) {
  // 환불 계산 수행
  const { payment, calculation } = await calculateRefundPreview(data.paymentId);

  if (!calculation.refundEligible && calculation.refundRule === 'no_refund') {
    throw new Error('환불 불가 기간입니다.');
  }

  const result = await db.query(
    `INSERT INTO refunds
       (member_id, payment_id, usage_days, usage_fee, penalty_amount,
        tablet_deduction, refund_amount, refund_rule, reason, requested_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      data.memberId, data.paymentId,
      calculation.usageDays, calculation.usageFee,
      calculation.penaltyAmount, calculation.tabletDeduction,
      calculation.refundAmount, calculation.refundRule,
      data.reason ?? null, data.requestedBy ?? null,
    ]
  );

  void payment; // suppress unused warning
  return result.rows[0];
}

// 환불 목록
export async function listRefunds(status?: string) {
  const where = status ? 'WHERE r.status = $1' : '';
  const values = status ? [status] : [];
  const result = await db.query(
    `SELECT r.*, m.name AS member_name, m.member_number
     FROM refunds r
     JOIN members m ON m.id = r.member_id
     ${where}
     ORDER BY r.requested_at DESC`,
    values
  );
  return result.rows;
}

// 환불 승인
export async function approveRefund(refundId: string, processedBy?: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const refund = await client.query(
      `UPDATE refunds SET status = 'approved', processed_at = NOW(), processed_by = $1
       WHERE id = $2 AND status = 'requested' RETURNING *`,
      [processedBy ?? null, refundId]
    );
    if (!refund.rows[0]) throw new Error('Refund not found or already processed');

    // 회원 상태를 ended로 변경
    await client.query(
      `UPDATE members SET member_status = 'ended' WHERE id = $1`,
      [refund.rows[0].member_id]
    );

    // 결제 상태 변경
    await client.query(
      `UPDATE payments SET status = 'refunded' WHERE id = $1`,
      [refund.rows[0].payment_id]
    );

    await client.query('COMMIT');
    return refund.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 환불 거절
export async function rejectRefund(refundId: string, rejectionReason: string, processedBy?: string) {
  const result = await db.query(
    `UPDATE refunds SET status = 'rejected', processed_at = NOW(), processed_by = $1, rejection_reason = $2
     WHERE id = $3 AND status = 'requested' RETURNING *`,
    [processedBy ?? null, rejectionReason, refundId]
  );
  if (!result.rows[0]) throw new Error('Refund not found or already processed');
  return result.rows[0];
}
