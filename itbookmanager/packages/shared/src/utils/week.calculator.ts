import { DISTRIBUTION_INTERVAL_DAYS } from '../constants/content.constants';

/**
 * 가입일 기준으로 현재 몇 주차 콘텐츠를 받아야 하는지 계산
 * @param startDate 콘텐츠 시작일 (가입 활성화 시점)
 * @param referenceDate 기준일 (default: 오늘)
 * @param startWeek 시작 주차 번호 (default: 1)
 */
export function getCurrentWeekNumber(
  startDate: Date,
  referenceDate: Date = new Date(),
  startWeek = 1
): number {
  const daysSinceStart = Math.floor(
    (referenceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weeksElapsed = Math.floor(daysSinceStart / DISTRIBUTION_INTERVAL_DAYS);
  return startWeek + weeksElapsed;
}

/**
 * 특정 주차의 배포 예정일 계산
 */
export function getDistributionDate(startDate: Date, weekNumber: number, startWeek = 1): Date {
  const weeksFromStart = weekNumber - startWeek;
  const daysFromStart = weeksFromStart * DISTRIBUTION_INTERVAL_DAYS;
  return new Date(startDate.getTime() + daysFromStart * 24 * 60 * 60 * 1000);
}
