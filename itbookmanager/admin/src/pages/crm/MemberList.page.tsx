import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersService } from '../../services/members.service';
import type { Member } from '../../services/members.service';
import { StatusBadge, TypeBadge } from '../../components/crm/MemberStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { storesService } from '../../services/stores.service';
import type { Store } from '../../services/stores.service';

type StatusTab = 'active' | 'suspended' | 'pending_withdrawal' | 'ended' | 'withdrawn';

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'active',             label: '정상회원' },
  { value: 'suspended',          label: '일시중지' },
  { value: 'pending_withdrawal', label: '탈퇴대기' },
  { value: 'ended',              label: '종료' },
  { value: 'withdrawn',          label: '탈퇴' },
];

export default function MemberListPage() {
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const isSystemAdmin = adminUser?.role === 'system_admin';
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(''); // 상시 입력값
  const [search, setSearch] = useState(''); // 지연 반영값
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusTab>('active');
  const [filterStore, setFilterStore] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    storesService.list().then(data => {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
      if (!isSystemAdmin && adminUser?.store_id) {
        setStores(sorted.filter(s => s.id === adminUser.store_id));
        setFilterStore(adminUser.store_id);
      } else {
        setStores(sorted);
      }
    }).catch(console.error);
  }, [isSystemAdmin, adminUser]);

  // 검색어 디바운싱
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterStore) params.storeId = filterStore;
      if (filterStatus) {
        params.status = filterStatus;
      } else {
        // 기본(활성 회원) 탭: 탈퇴 회원 제외
        params.excludeWithdrawn = 'true';
      }
      const result = await membersService.list(params);
      setMembers(result.data);
      setTotal(result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, filterStatus, filterStore]);

  useEffect(() => { void fetchMembers(); }, [fetchMembers]);

  useEffect(() => {
    const storeId = filterStore || undefined;
    membersService.statusCounts(storeId).then(setTabCounts).catch(() => {});
  }, [filterStore]);

  const handleTabChange = (tab: StatusTab) => {
    setFilterStatus(tab);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">회원관리
            {filterStore && stores.find(s => s.id === filterStore) && (
              <span className="ml-2 text-base font-normal text-blue-600">
                — {stores.find(s => s.id === filterStore)!.name}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">총 {total}명</p>
        </div>
        <button
          onClick={() => navigate('/members/new')}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + 회원 등록
        </button>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              filterStatus === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {(() => {
              const n = tabCounts[tab.value];
              if (!n) return null;
              return <span className="ml-1 text-xs opacity-70">({n})</span>;
            })()}
          </button>
        ))}
      </div>

      {/* 검색/필터 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="이름, 이메일, 연락처, 회원번호 검색"
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isSystemAdmin && (
          <select value={filterStore} onChange={e => { setFilterStore(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">전체 매장</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체 유형</option>
          <option value="managed">관리회원</option>
          <option value="subscription">구독회원</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">회원번호</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">이메일</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">연락처</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">유형</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
              {isSystemAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">매장</th>}
              <th className="text-left px-4 py-3 font-medium text-gray-600">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={isSystemAdmin ? 8 : 7} className="text-center py-10 text-gray-400">로딩중...</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={isSystemAdmin ? 8 : 7} className="text-center py-10 text-gray-400">회원이 없습니다.</td></tr>
            ) : members.map(m => (
              <tr key={m.id}
                className={`hover:bg-gray-50 cursor-pointer ${m.member_status === 'withdrawn' ? 'opacity-60' : ''}`}
                onClick={() => navigate(`/members/${m.id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.member_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                <td className="px-4 py-3 text-gray-600">{m.email}</td>
                <td className="px-4 py-3 text-gray-600">{m.phone ?? '-'}</td>
                <td className="px-4 py-3"><TypeBadge type={m.member_type} /></td>
                <td className="px-4 py-3"><StatusBadge status={m.member_status} /></td>
                {isSystemAdmin && <td className="px-4 py-3 text-xs text-gray-500">{m.store_name || m.store_code || '-'}</td>}
                <td className="px-4 py-3 text-gray-500">{m.joined_at ? m.joined_at.slice(0, 10) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded text-sm ${p === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
