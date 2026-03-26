export type TabletStatus = 'stock' | 'loaned' | 'returned' | 'repair' | 'lost';
// stock = 재고, loaned = 대여중, returned = 회수됨, repair = 수리중, lost = 분실

export type LoanAction = 'loaned' | 'returned' | 'lost_reported' | 'recovered';

export interface Tablet {
  id: string;
  qrCode: string;               // TAB-0001
  modelName?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;       // KRW, 환불 시 미반납 차감용
  status: TabletStatus;
  currentMemberId?: string;
  loanStartDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TabletLoan {
  id: string;
  tabletId: string;
  memberId?: string;
  action: LoanAction;
  actionDate: string;
  returnedDate?: string;
  conditionOk?: boolean;
  conditionNotes?: string;
  processedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateTabletInput {
  modelName?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  notes?: string;
}

export interface LoanTabletInput {
  memberId: string;
  processedBy?: string;
}

export interface ReturnTabletInput {
  conditionOk: boolean;
  conditionNotes?: string;
  processedBy?: string;
}
