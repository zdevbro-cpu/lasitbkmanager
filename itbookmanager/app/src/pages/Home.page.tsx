import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { contentService } from '../services/content.service';
import type { ContentPackage } from '../services/content.service';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [packages, setPackages] = useState<ContentPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentService.getMyPackages()
      .then(data => setPackages(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <span className="font-semibold text-gray-900">IT북매니저</span>
        </div>
        <button onClick={() => void signOut()} className="text-sm text-gray-400 hover:text-gray-600">
          로그아웃
        </button>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        <div className="mb-6">
          <p className="text-gray-500 text-sm">안녕하세요,</p>
          <p className="text-lg font-semibold text-gray-900">{user?.email?.split('@')[0]} 님</p>
        </div>

        <h2 className="font-semibold text-gray-900 mb-3">학습 콘텐츠</h2>

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">로딩중...</div>
        ) : packages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-gray-500 text-sm">아직 배포된 콘텐츠가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {packages.map(pkg => (
              <button key={pkg.id} onClick={() => navigate(`/content/${pkg.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-1">Week {pkg.week_number}</p>
                    <p className="font-medium text-gray-900">{pkg.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{pkg.book_count}개 콘텐츠</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{pkg.completion_pct ?? 0}%</p>
                    <p className="text-xs text-gray-400">완료</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${pkg.completion_pct ?? 0}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
