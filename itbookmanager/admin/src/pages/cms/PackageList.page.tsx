import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentService } from '../../services/content.service';
import type { ContentPackage } from '../../services/content.service';

export default function PackageListPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<ContentPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [filterPublished, setFilterPublished] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ weekNumber: '', title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [distributeForm, setDistributeForm] = useState({ memberId: '', weekNumber: '', fromWeek: '', toWeek: '', mode: 'single' });
  const [showDistribute, setShowDistribute] = useState(false);
  const [distributing, setDistributing] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filterPublished === 'true') params.published = true;
      if (filterPublished === 'false') params.published = false;
      const result = await contentService.listPackages(params);
      setPackages(result.data);
      setTotal(result.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterPublished]);

  useEffect(() => { void fetch(); }, [fetch]);

  const handleCreate = async () => {
    if (!form.weekNumber || !form.title) return;
    setCreating(true);
    try {
      await contentService.createPackage({
        weekNumber: parseInt(form.weekNumber),
        title: form.title,
        description: form.description || undefined,
      });
      setShowCreate(false);
      setForm({ weekNumber: '', title: '', description: '' });
      void fetch();
    } catch (e) { alert(String(e)); }
    finally { setCreating(false); }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('게시하면 회원에게 배포될 수 있습니다. 게시하시겠습니까?')) return;
    try {
      await contentService.publishPackage(id);
      void fetch();
    } catch (e) { alert(String(e)); }
  };

  const handleDistribute = async () => {
    if (!distributeForm.memberId) return alert('회원 ID를 입력하세요.');
    setDistributing(true);
    try {
      if (distributeForm.mode === 'range') {
        await contentService.distributeToMember(
          distributeForm.memberId, undefined,
          parseInt(distributeForm.fromWeek), parseInt(distributeForm.toWeek)
        );
      } else {
        await contentService.distributeToMember(distributeForm.memberId, parseInt(distributeForm.weekNumber));
      }
      alert('배포 완료');
      setShowDistribute(false);
    } catch (e) { alert(String(e)); }
    finally { setDistributing(false); }
  };

  const publishedCount = packages.filter(p => p.is_published).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">콘텐츠 패키지</h2>
          <p className="text-sm text-gray-500 mt-0.5">전체 {total}개 · 게시 {publishedCount}개</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDistribute(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
            배포 관리
          </button>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            + 패키지 추가
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={filterPublished} onChange={e => setFilterPublished(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">전체</option>
          <option value="true">게시됨</option>
          <option value="false">미게시</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">주차</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">패키지 제목</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">콘텐츠 수</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">게시일</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">로딩중...</td></tr>
            ) : packages.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">패키지가 없습니다.</td></tr>
            ) : packages.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">Week {p.week_number}</td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/content/packages/${p.id}`)}
                    className="text-blue-600 hover:underline text-left">
                    {p.title}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.book_count}개</td>
                <td className="px-4 py-3">
                  {p.is_published
                    ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">게시됨</span>
                    : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">미게시</span>
                  }
                </td>
                <td className="px-4 py-3 text-gray-500">{p.published_at?.slice(0, 10) ?? '-'}</td>
                <td className="px-4 py-3 text-right">
                  {!p.is_published && (
                    <button onClick={() => handlePublish(p.id)}
                      className="text-xs text-blue-600 hover:underline mr-3">게시</button>
                  )}
                  <button onClick={() => navigate(`/content/packages/${p.id}`)}
                    className="text-xs text-gray-500 hover:underline">관리</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 패키지 생성 모달 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">패키지 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">주차 번호</label>
                <input value={form.weekNumber} onChange={e => setForm(p => ({ ...p, weekNumber: e.target.value }))}
                  type="number" placeholder="1" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">제목</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Week 1 - AI 기초" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">설명 (선택)</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                {creating ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 배포 모달 */}
      {showDistribute && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">콘텐츠 배포</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">회원 ID</label>
                <input value={distributeForm.memberId} onChange={e => setDistributeForm(p => ({ ...p, memberId: e.target.value }))}
                  placeholder="UUID" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div className="flex gap-2">
                {['single', 'range'].map(m => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={distributeForm.mode === m} onChange={() => setDistributeForm(p => ({ ...p, mode: m }))} className="accent-blue-600" />
                    <span className="text-sm">{m === 'single' ? '단일 주차' : '범위 배포'}</span>
                  </label>
                ))}
              </div>
              {distributeForm.mode === 'single' ? (
                <div>
                  <label className="text-xs font-medium text-gray-600">주차 번호</label>
                  <input value={distributeForm.weekNumber} onChange={e => setDistributeForm(p => ({ ...p, weekNumber: e.target.value }))}
                    type="number" placeholder="1" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600">시작 주차</label>
                    <input value={distributeForm.fromWeek} onChange={e => setDistributeForm(p => ({ ...p, fromWeek: e.target.value }))}
                      type="number" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600">종료 주차</label>
                    <input value={distributeForm.toWeek} onChange={e => setDistributeForm(p => ({ ...p, toWeek: e.target.value }))}
                      type="number" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDistribute(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleDistribute} disabled={distributing}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                {distributing ? '배포 중...' : '배포'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
