// 환불 구간 기준 (구독 시작일로부터)
export const REFUND_WINDOWS = {
  FULL_REFUND_DAYS: 7,          // 7일 이내 → 전액 환불
  NO_USAGE_FEE_MONTHS: 1,       // 1개월 이내 → 사용료 공제 시작
  NO_REFUND_MONTHS: 10,         // 10개월 이후 → 환불 불가
} as const;

// 위약금 기본 비율 (10%)
export const DEFAULT_PENALTY_RATE = 0.10;

// 월 단위 이용료 계산: 연간 구독을 12개월로 나눔
export const MONTHS_PER_YEAR = 12;

// 환불 계산 기준: 정상가(full price) 기반
// 할인 가입자도 정상가 기준으로 월 이용료 계산 (할인 악용 방지)
