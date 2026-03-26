// 전체 콘텐츠 도서 수
export const TOTAL_BOOKS = 2014;

// 배포 단위: 2주마다 1개 패키지 배포
export const DISTRIBUTION_INTERVAL_DAYS = 14;

// 패키지당 최대 도서 수 (2014권 / 주차 수)
// 예: 약 52주차 기준 주당 약 38~39권
export const BOOKS_PER_PACKAGE = Math.ceil(TOTAL_BOOKS / 52);
