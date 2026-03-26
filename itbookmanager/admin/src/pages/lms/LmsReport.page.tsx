import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentService } from '../../services/content.service';
import type { LmsReport } from '../../services/content.service';

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export default function LmsReportPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<LmsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    contentService.getBulkReport()
      .then(data => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = reports.filter(r =>
    !search || r.name.includes(search) || r.member_number.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">학습 현황</h2>
          <p className="text-sm text-gray-500 mt-0.5">전체 활성 회원 학습 통계</p>
        </div>
      </div>

      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이름, 회원번호 검색"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">회원번호</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">유형</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">현재주차</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">접근 패키지</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">완료 콘텐츠</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">총 학습시간</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">로딩중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">데이터가 없습니다.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.member_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.member_type === 'managed' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {r.member_type === 'managed' ? '관리' : '구독'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">Week {r.current_week}</td>
                <td className="px-4 py-3 text-gray-600">{r.access_packages}개</td>
                <td className="px-4 py-3 text-gray-600">{r.completed_items}개</td>
                <td className="px-4 py-3 text-gray-600">{formatTime(r.total_time_sec)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/members/${r.id}`)}
                    className="text-xs text-blue-600 hover:underline">회원 상세</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
