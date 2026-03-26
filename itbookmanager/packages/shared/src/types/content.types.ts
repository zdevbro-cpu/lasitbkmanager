export type ContentType = 'video' | 'audio' | 'pdf' | 'book_metadata';

export interface ContentPackage {
  id: string;
  weekNumber: number;           // 1, 2, 3, ... (2주 단위 인덱스)
  title: string;
  description?: string;
  bookCount: number;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ContentItem {
  id: string;
  packageId: string;
  title: string;
  author?: string;
  contentType: ContentType;
  storagePath?: string;
  fileSizeBytes?: number;
  durationSec?: number;
  sortOrder: number;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberContentAccess {
  id: string;
  memberId: string;
  packageId: string;
  weekNumber: number;
  unlockedAt: string;
  expiresAt?: string;
}

export interface MemberContentProgress {
  id: string;
  memberId: string;
  contentItemId: string;
  packageId: string;
  startedAt?: string;
  lastAccessedAt?: string;
  completedAt?: string;
  progressPct: number;          // 0.00 ~ 100.00
  timeSpentSec: number;
  isCompleted: boolean;
}

export interface CreateContentPackageInput {
  weekNumber: number;
  title: string;
  description?: string;
}

export interface UpdateProgressInput {
  memberId: string;
  contentItemId: string;
  progressPct: number;
  timeSpentSec?: number;
}
