import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentService } from '../../services/content.service';
import type { ContentItem } from '../../services/content.service';

const TYPE_ICON: Record<string, string> = { video: '🎬', audio: '🎵', pdf: '📄' };
const TYPE_LABEL: Record<string, string> = { video: '영상', audio: '음성', pdf: 'PDF' };

export default function ContentListPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<{ title: string; week_number: number; items: ContentItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packageId) return;
    contentService.getPackage(packageId)
      .then(data => setPkg(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [packageId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">로딩중...</div>
  );

  if (!pkg) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">패키지를 찾을 수 없습니다.</div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-400 text-xl">←</button>
        <div>
          <p className="text-xs text-blue-600 font-medium">Week {pkg.week_number}</p>
          <p className="font-semibold text-gray-900">{pkg.title}</p>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="space-y-2">
          {pkg.items.map((item, idx) => (
            <button key={item.id}
              onClick={() => navigate(`/content/${packageId ?? ''}/item/${item.id}`)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 transition-colors flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">
                {TYPE_ICON[item.content_type] ?? '📁'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.title}</p>
                {item.author && <p className="text-xs text-gray-400 mt-0.5">{item.author}</p>}
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-xs text-gray-400">{TYPE_LABEL[item.content_type] ?? ''}</span>
                <span className="text-xs text-gray-300 mt-0.5">#{idx + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
