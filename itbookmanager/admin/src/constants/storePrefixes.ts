export interface StorePrefix {
  code: string;
  label: string;
}

// 매장 코드 접두사 목록 — 추가 시 이 배열에만 항목 추가
export const STORE_PREFIXES: StorePrefix[] = [
  { code: 'LB', label: 'LB - 라스브러리' },
  { code: 'LS', label: 'LS - 라스북 매장' },
];

export const STORE_CODE_REGEX = /^[A-Z]{2}\d{4}$/;
