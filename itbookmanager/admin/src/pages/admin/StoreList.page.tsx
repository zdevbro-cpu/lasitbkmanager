import { useState, useEffect } from 'react';
import { Plus, Pencil, Power, Building2 } from 'lucide-react';
import { storesService } from '../../services/stores.service';
import type { Store } from '../../services/stores.service';
import { STORE_PREFIXES, STORE_CODE_REGEX } from '../../constants/storePrefixes';

type ModalMode = 'create' | 'edit';
type FormState = { prefix: string; serial: string; name: string; address: string; phone: string };

const emptyForm: FormState = { prefix: STORE_PREFIXES[0].code, serial: '', name: '', address: '', phone: '' };

export default function StoreListPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const [modal, setModal] = useState<{ mode: ModalMode; store?: Store } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    storesService.list(showInactive)
      .then(setStores)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [showInactive]);

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (s: Store) => {
    // 기존 코드에서 prefix(2자리)와 serial(나머지) 분리
    const prefix = s.code.match(/^[A-Z]{2}/)?.[0] ?? STORE_PREFIXES[0].code;
    const serial = s.code.slice(prefix.length);
    setForm({ prefix, serial, name: s.name, address: s.address ?? '', phone: s.phone ?? '' });
    setError('');
    setModal({ mode: 'edit', store: s });
  };

  const handleSave = async () => {
    const code = form.prefix + form.serial;
    if (!code || !form.name) { setError('코드와 매장명은 필수입니다.'); return; }
    if (modal?.mode === 'create' && !STORE_CODE_REGEX.test(code)) {
      setError(`매장 코드는 접두사 + 숫자 4자리여야 합니다. (예: ${STORE_PREFIXES[0].code}0101)`);
      return;
    }
    setSaving(true); setError('');
    try {
      if (modal?.mode === 'create') {
        await storesService.create({ code, name: form.name, address: form.address || undefined, phone: form.phone || undefined });
      } else if (modal?.store) {
        await storesService.update(modal.store.id, { name: form.name, address: form.address || null, phone: form.phone || null });
      }
      setModal(null);
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Store) => {
    try {
      await storesService.update(s.id, { is_active: !s.is_active });
      load();
    } catch (e) { alert(String(e)); }
  };

  return (
    <div className="w-full max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 size={24} className="text-blue-600" />
            지점 관리
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">전체 {stores.length}개 지점</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500" />
            비활성 포함
          </label>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
            <Plus size={16} />
            지점 등록
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">로딩중...</div>
        ) : stores.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">등록된 지점이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">코드</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">지점명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">주소</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">연락처</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stores.map(s => (
                  <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${!s.is_active ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-blue-700">{s.code}</td>
                    <td className="px-4 py-4 whitespace-nowrap font-bold text-gray-900">{s.name}</td>
                    <td className="px-4 py-4 text-gray-600">{s.address ?? '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">{s.phone ?? '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500 text-xs">
                      {s.created_at ? s.created_at.slice(0, 10) : '-'}
                    </td>
                    <td className="px-4 py-4 text-left whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1">
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                          title="수정">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => toggleActive(s)}
                          className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${s.is_active ? 'text-green-600 hover:text-green-700' : 'text-gray-300 hover:text-gray-400'}`}
                          title={s.is_active ? '비활성화' : '활성화'}>
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) }
      </div>

      {/* 등록/수정 모달 */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">
              {modal.mode === 'create' ? '매장 등록' : '매장 수정'}
            </h3>
            <div className="space-y-3">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">매장 코드 *</label>
                {modal.mode === 'edit' ? (
                  <input value={modal.store?.code} disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono bg-gray-50" />
                ) : (
                  <div className="flex">
                    <select value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))}
                      className="border border-r-0 border-gray-300 rounded-l-lg px-2 py-2 text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {STORE_PREFIXES.map(p => (
                        <option key={p.code} value={p.code}>{p.label}</option>
                      ))}
                    </select>
                    <input value={form.serial} onChange={e => setForm(f => ({ ...f, serial: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="0101"
                      maxLength={4}
                      className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
                {modal.mode === 'create' && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    최종 코드: <span className="font-mono text-gray-600">{form.prefix}{form.serial || '0101'}</span>
                    &nbsp;(지역 2자리 + 일련번호 2자리)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">매장명 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="○○ 매장"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">연락처</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="02-0000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
