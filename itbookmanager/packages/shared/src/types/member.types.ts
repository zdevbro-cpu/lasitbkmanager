export type MemberType = 'managed' | 'subscription';
// managed = 관리회원, subscription = 구독회원

export type MemberStatus = 'pending' | 'active' | 'suspended' | 'ended' | 'withdrawn';
// pending = 가입대기, active = 정상, suspended = 일시정지, ended = 종료, withdrawn = 탈퇴

export interface Member {
  id: string;
  memberNumber: string;         // MB-YYYYMM-NNN
  firebaseUid?: string;
  name: string;
  phone?: string;
  email: string;
  memberType: MemberType;
  memberStatus: MemberStatus;

  paymentPlanName?: string;
  planAmount?: number;          // 정상가 (KRW)
  planDiscountedAmt?: number;   // 실결제가 (KRW)
  paymentMethod?: string;

  joinedAt?: string;            // ISO date string
  paymentStartDate?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;

  contentStartWeek: number;
  currentWeek: number;
  currentTabletId?: string;

  assignedInstructor?: string;  // 관리회원 전용
  notes?: string;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface MemberTypeHistory {
  id: string;
  memberId: string;
  previousType: MemberType;
  newType: MemberType;
  changedAt: string;
  changeReason?: string;
  priceDiffKrw?: number;
  processedBy?: string;
  notes?: string;
}

export interface CreateMemberInput {
  name: string;
  email: string;
  phone?: string;
  memberType: MemberType;
  paymentPlanName?: string;
  planAmount?: number;
  planDiscountedAmt?: number;
  paymentMethod?: string;
  assignedInstructor?: string;
  notes?: string;
}

export interface ChangeMemberTypeInput {
  newType: MemberType;
  changeReason: string;
  priceDiffKrw?: number;
}

// 상태 전환 허용 맵
export const MEMBER_STATUS_TRANSITIONS: Record<MemberStatus, MemberStatus[]> = {
  pending: ['active'],
  active: ['suspended', 'ended', 'withdrawn'],
  suspended: ['active', 'ended', 'withdrawn'],
  ended: ['withdrawn'],
  withdrawn: [],
};
