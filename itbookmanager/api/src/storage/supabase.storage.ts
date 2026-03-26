import { supabase } from '../supabase';

const BUCKET_NAME = 'content'; // Supabase 대시보드에서 생성 필요

// 콘텐츠 파일 업로드용 서명 URL (PUT 대응, 15분)
export async function getUploadSignedUrl(storagePath: string, contentType: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(storagePath);

  if (error) throw error;
  return data.signedUrl;
}

// 콘텐츠 파일 다운로드용 서명 URL (GET, 30분)
export async function getDownloadSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 30 * 60);

  if (error) throw error;
  return data.signedUrl;
}

// 스토리지 경로 생성: content/{packageId}/{itemId}/{filename}
export function buildStoragePath(packageId: string, itemId: string, filename: string): string {
  return `content/${packageId}/${itemId}/${filename}`;
}
