import { useEffect, useState } from 'react';
import { staffService } from '../../services/staff.service';
import type { StaffMember } from '../../services/staff.service';
import { ROLE_LABELS } from '../../context/AuthContext';
import type { StaffRole } from '../../context/AuthContext';
import { Plus, Pencil, Trash2, Copy, Check } from 'lucide-react';
import { storesService } from '../../services/stores.service';
import type { Store } from '../../services/stores.service';

const ROLE_BADGE: Record<StaffRole, string> = {
  system_admin: 'bg-purple-100 text-purple-700',
  store_manager: 'bg-blue-100 text-blue-700',
  young_creator: 'bg-green-100 text-green-700',
};

export default function StaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);

  // 추가 모달
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'store_manager' as StaffRole, phone: '', storeId: '' });
  const [creating, setCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 수정 모달
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'store_manager' as StaffRole, phone: '', is_active: true, storeId: '' });
  const [saving, setSaving] = useState(false);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    load();
    storesService.list().then(setStores).catch(console.error);
  }, []);

  async function load() {
    setLoading(true);
    try {
      setStaff(await staffService.list());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!createForm.name || !createForm.email) { setError('이름과 이메일을 입력하세요'); return; }
    setError('');
    setCreating(true);
    try {
      const result = await staffService.create({
        ...createForm,
        storeId: createForm.storeId || null
      });
      setTempPassword(result.tempPassword);
      setStaff(prev => [result.staff, ...prev]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '등록에 실패했습니다');
    } finally {
      setCreating(false);
    }
  }

  function handleCopyPassword() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function openEdit(s: StaffMember) {
    setEditTarget(s);
    setEditForm({ name: s.name, role: s.role, phone: s.phone ?? '', is_active: s.is_active, storeId: s.store_id ?? '' });
    setError('');
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    setError('');
    try {
      const updated = await staffService.update(editTarget.id, {
        ...editForm,
        storeId: editForm.storeId || null,
      });
      setStaff(prev => prev.map(s => s.id === editTarget.id ? updated : s));
      setEditTarget(null);
    } catch {
      setError('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await staffService.remove(deleteTarget.id);
      setStaff(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('삭제에 실패했습니다');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">직원관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">전체 {staff.length}명</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setTempPassword(null); setCreateForm({ name: '', email: '', role: 'store_manager', phone: '', storeId: '' }); setError(''); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          직원 등록
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">로딩중...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이름</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이메일</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">직무</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">매장</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">전화번호</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">상태</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">등록일</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[s.role]}`}>
                      {ROLE_LABELS[s.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.store_code ? `${s.store_code} ${s.store_name ?? ''}` : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => { setDeleteTarget(s); setError(''); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">등록된 직원이 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 직원 등록 모달 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            {!tempPassword ? (
              <>
                <h2 className="text-base font-bold text-gray-900 mb-1">직원 등록</h2>
                <p className="text-xs text-gray-400 mb-4">
                  지점 관리자용 이메일을 권장 규칙에 따라 생성하세요.<br/>
                  (예: <span className="font-mono text-blue-600 font-bold">지점코드admin@las.com</span>, 초기비번: <span className="font-mono text-blue-600 font-bold">123456</span>)
                </p>
                {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">이름 *</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">이메일 *</label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="staff@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">직무 *</label>
                    <select
                      value={createForm.role}
                      onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as StaffRole }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="store_manager">점장</option>
                      <option value="young_creator">영크리에이터</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">전화번호</label>
                    <input
                      type="tel"
                      value={createForm.phone}
                      onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  {createForm.role === 'store_manager' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">담당 매장 *</label>
                      <select
                        value={createForm.storeId}
                        onChange={e => setCreateForm(p => ({ ...p, storeId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-blue-50 border-blue-200"
                      >
                        <option value="">매장 선택 필수</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.code} {s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
                  <button onClick={handleCreate} disabled={creating} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {creating ? '등록 중...' : '등록'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-gray-900 mb-2">직원 등록 완료</h2>
                <p className="text-sm text-gray-500 mb-4">아래 임시 비밀번호를 직원에게 전달하세요. 이 창을 닫으면 다시 확인할 수 없습니다.</p>
                <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between border border-gray-200 mb-5">
                  <span className="font-mono text-base text-gray-900 tracking-wider">{tempPassword}</span>
                  <button onClick={handleCopyPassword} className="p-1.5 rounded hover:bg-gray-200 text-gray-500">
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <button onClick={() => setShowCreate(false)} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 직원 수정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">직원 정보 수정</h2>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">이름</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">직무</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(p => ({ ...p, role: e.target.value as StaffRole }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="store_manager">점장</option>
                  <option value="young_creator">영크리에이터</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">전화번호</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">담당 매장</label>
                <select
                  value={editForm.storeId}
                  onChange={e => setEditForm(p => ({ ...p, storeId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">미배정</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.code} {s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editForm.is_active}
                  onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">활성 계정</label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditTarget(null)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">직원 삭제</h2>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-semibold text-gray-800">{deleteTarget.name}</span> ({deleteTarget.email}) 직원을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-red-500 mb-5">Firebase 계정도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
