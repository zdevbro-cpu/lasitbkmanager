import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tabletsService } from '../../services/tablets.service';
import { useAuth } from '../../context/AuthContext';
import { storesService } from '../../services/stores.service';
import type { Store } from '../../services/stores.service';

type TabForm = { modelName: string; serialNumber: string; purchaseDate: string; notes: string; storeCode: string; subStoreName: string };
const EMPTY: TabForm = { modelName: '', serialNumber: '', purchaseDate: '', notes: '', storeCode: '', subStoreName: '' };

export default function TabletRegisterPage() {
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const isSystemAdmin = adminUser?.role === 'system_admin';
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [form, setForm] = useState<TabForm>(EMPTY);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isSystemAdmin) {
      storesService.list().then(setStores).catch(console.error);
    } else if (adminUser?.store_id) {
      setStoreId(adminUser.store_id);
    }
  }, [isSystemAdmin, adminUser]);

  const handleCreate = async () => {
    if (isSystemAdmin && !storeId) { alert('매장을 선택해주세요.'); return; }
    setCreating(true);
    try {
      await tabletsService.create({
        modelName: form.modelName || undefined,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: form.purchaseDate || undefined,
        notes: form.notes || undefined,
        storeId: storeId || undefined,
        subStoreName: form.subStoreName || undefined,
      });
      alert('태블릿이 등록되었습니다.');
      setForm(EMPTY);
    } catch (e) { alert(String(e)); }
    finally { setCreating(false); }
  };

  return (
    <div className="max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/tablets')}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">태블릿 등록</h2>
          <p className="text-sm text-gray-500 mt-0.5">QR 코드(TAB-NNNNNN)는 자동 생성됩니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            {isSystemAdmin ? (
              <div>
                <label className="text-sm font-medium text-gray-700">매장 <span className="text-red-500">*</span></label>
                <select value={storeId} onChange={e => setStoreId(e.target.value)}
                  className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">매장 선택</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700">등록 지점</label>
                <div className="mt-1.5 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-100 font-medium">
                  {adminUser?.store_name} ({adminUser?.store_code})
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">배분처 (하위 매장/몰)</label>
              <input value={form.subStoreName}
                onChange={e => setForm(p => ({ ...p, subStoreName: e.target.value }))}
                placeholder="예: 홈플러스 울산점, 가좌점 등"
                className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">모델명</label>
              <input value={form.modelName}
                onChange={e => setForm(p => ({ ...p, modelName: e.target.value }))}
                placeholder="예: Samsung Galaxy Tab A9"
                className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">시리얼 번호</label>
              <input value={form.serialNumber}
                onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))}
                placeholder="S/N"
                className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">구입일</label>
              <input type="date" value={form.purchaseDate}
                onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))}
                className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">비고</label>
              <textarea value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => navigate('/tablets')}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              취소
            </button>
            <button onClick={handleCreate} disabled={creating}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {creating ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
    </div>
  );
}
