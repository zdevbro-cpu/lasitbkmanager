import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentService } from '../../services/content.service';
import type { ContentItem } from '../../services/content.service';

export default function ContentViewerPage() {
  const { packageId, itemId } = useParams<{ packageId: string; itemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [contentUrl, setContentUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const progressRef = useRef(0);
  const timeRef = useRef(0);
  const lastSentRef = useRef(Date.now());

  useEffect(() => {
    if (!packageId || !itemId) return;

    const load = async () => {
      try {
        const pkg = await contentService.getPackage(packageId);
        const found = pkg.items.find(i => i.id === itemId);
        if (!found) { setError('콘텐츠를 찾을 수 없습니다.'); return; }
        setItem(found);

        if (found.storage_path) {
          const url = await contentService.getContentUrl(itemId);
          setContentUrl(url);
        } else {
          setError('아직 파일이 업로드되지 않은 콘텐츠입니다.');
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [packageId, itemId]);

  // 30초마다 진도 자동 저장
  const sendProgress = useCallback(async () => {
    if (!itemId || progressRef.current <= 0) return;
    const elapsed = Math.floor((Date.now() - lastSentRef.current) / 1000);
    lastSentRef.current = Date.now();
    await contentService.updateProgress(itemId, progressRef.current, elapsed);
  }, [itemId]);

  useEffect(() => {
    const interval = setInterval(() => { void sendProgress(); }, 30000);
    return () => {
      clearInterval(interval);
      void sendProgress(); // 언마운트 시 최종 저장
    };
  }, [sendProgress]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    const el = e.currentTarget;
    if (el.duration > 0) {
      progressRef.current = Math.round((el.currentTime / el.duration) * 100);
    }
    timeRef.current = Math.round(el.currentTime);
  };

  const handleEnded = async () => {
    if (itemId) {
      progressRef.current = 100;
      await contentService.markCompleted(itemId);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">로딩중...</div>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* 헤더 */}
      <header className="bg-black px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => { void sendProgress(); navigate(`/content/${packageId ?? ''}`); }}
          className="text-white text-xl">←</button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{item?.title ?? ''}</p>
          {item?.author && <p className="text-gray-400 text-xs">{item.author}</p>}
        </div>
      </header>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 flex items-center justify-center">
        {error ? (
          <div className="text-center px-8">
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        ) : item?.content_type === 'video' ? (
          <video
            src={contentUrl}
            controls
            controlsList="nodownload"
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => { void handleEnded(); }}
            className="w-full max-h-screen"
          />
        ) : item?.content_type === 'audio' ? (
          <div className="w-full px-6 text-center">
            <div className="w-32 h-32 rounded-full bg-blue-600 mx-auto flex items-center justify-center text-5xl mb-6">
              🎵
            </div>
            <p className="text-white font-medium mb-1">{item.title}</p>
            {item.author && <p className="text-gray-400 text-sm mb-6">{item.author}</p>}
            <audio
              src={contentUrl}
              controls
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => { void handleEnded(); }}
              className="w-full"
            />
          </div>
        ) : item?.content_type === 'pdf' ? (
          <iframe
            src={contentUrl}
            title={item.title}
            className="w-full h-full min-h-screen"
            style={{ border: 'none' }}
            onLoad={() => {
              progressRef.current = 50; // PDF는 로드 시 50% 처리
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
