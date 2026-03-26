import { useState, useEffect, useCallback } from 'react';
import { educationService } from '../../services/education.service';
import type { EducationSession } from '../../services/education.service';

const STARS = [1, 2, 3, 4, 5];

export default function EducationListPage() {
  const [sessions, setSessions] = useState<EducationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ memberId: '', sessionDate: '', instructor: '', attended: true, rating: '', notes: '' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ attended: true, rating: '', notes: '', instructor: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await educationService.listSessions({
        fromDate: filterFrom || undefined,
        toDate: filterTo || undefined,
      });
      setSessions(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterFrom, filterTo]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.memberId || !form.sessionDate) return alert('회원 ID와 날짜를 입력하세요.');
    setCreating(true);
    try {
      await educationService.createSession({
        memberId: form.memberId,
        sessionDate: form.sessionDate,
        instructor: form.instructor || undefined,
        attended: form.attended,
        rating: form.rating ? parseInt(form.rating) : undefined,
        notes: form.notes || undefined,
      });
      setShowCreate(false);
      setForm({ memberId: '', sessionDate: '', instructor: '', attended: true, rating: '', notes: '' });
      void load();
    } catch (e) { alert(String(e)); }
    finally { setCreating(false); }
  };

  const handleUpdate = async (id: string) => {
    try {
      await educationService.updateSession(id, {
        attended: editForm.attended,
        rating: editForm.rating ? parseInt(editForm.rating) : undefined,
        notes: editForm.notes || undefined,
        instructor: editForm.instructor || undefined,
      });
      setEditingId(null);
      void load();
    } catch (e) { alert(String(e)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('교육 세션을 삭제하시겠습니까?')) return;
    try {
      await educationService.deleteSession(id);
      void load();
    } catch (e) { alert(String(e)); }
  };

  const startEdit = (s: EducationSession) => {
    setEditingId(s.id);
    setEditForm({ attended: s.attended, rating: s.rating?.toString() ?? '', notes: s.notes ?? '', instructor: s.instructor ?? '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">교육 세션</h2>
          <p className="text-sm text-gray-500 mt-0.5">관리회원 전용 오프라인 교육</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          + 세션 등록
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mr-1">시작일</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mr-1">종료일</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">교육일</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">회원</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">강사</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">참석</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">평가</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">메모</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">로딩중...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">교육 세션이 없습니다.</td></tr>
            ) : sessions.map(s => (
              editingId === s.id ? (
                <tr key={s.id} className="bg-blue-50">
                  <td className="px-4 py-3 text-gray-600">{s.session_date.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.member_name}</p>
                    <p className="text-xs text-gray-400">{s.member_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <input value={editForm.instructor} onChange={e => setEditForm(p => ({ ...p, instructor: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={editForm.attended} onChange={e => setEditForm(p => ({ ...p, attended: e.target.checked }))} className="accent-blue-600" />
                      <span className="text-xs">참석</span>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <select value={editForm.rating} onChange={e => setEditForm(p => ({ ...p, rating: e.target.value }))}
                      className="border border-gray-300 rounded px-1 py-1 text-xs">
                      <option value="">-</option>
                      {STARS.map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs w-32" />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => handleUpdate(s.id)} className="text-xs text-blue-600 hover:underline">저장</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">취소</button>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{s.session_date.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.member_name}</p>
                    <p className="text-xs text-gray-400">{s.member_number}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.instructor ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${s.attended ? 'text-green-600' : 'text-red-500'}`}>
                      {s.attended ? '참석' : '결석'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-yellow-400 text-xs">
                    {s.rating ? '★'.repeat(s.rating) + '☆'.repeat(5 - s.rating) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{s.notes ?? '-'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => startEdit(s)} className="text-xs text-blue-600 hover:underline">수정</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* 세션 등록 모달 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">교육 세션 등록</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">회원 ID</label>
                <input value={form.memberId} onChange={e => setForm(p => ({ ...p, memberId: e.target.value }))}
                  placeholder="UUID" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">교육일</label>
                <input type="date" value={form.sessionDate} onChange={e => setForm(p => ({ ...p, sessionDate: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">강사</label>
                <input value={form.instructor} onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="attended" checked={form.attended} onChange={e => setForm(p => ({ ...p, attended: e.target.checked }))} className="accent-blue-600" />
                <label htmlFor="attended" className="text-sm text-gray-700">참석</label>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">평가</label>
                <select value={form.rating} onChange={e => setForm(p => ({ ...p, rating: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">선택 없음</option>
                  {STARS.map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n}점)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">메모</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                {creating ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
