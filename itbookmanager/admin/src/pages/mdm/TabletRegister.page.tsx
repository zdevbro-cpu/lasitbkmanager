import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'single' | 'excel'>('single');
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    if (isSystemAdmin) {
      storesService.list().then(setStores).catch(console.error);
    } else if (adminUser?.store_id) {
      setStoreId(adminUser.store_id);
    }
  }, [isSystemAdmin, adminUser]);

  // 단건
  const [form, setForm] = useState<TabForm>(EMPTY);
  const [creating, setCreating] = useState(false);

  // 엑셀 배치
  const [excelRows, setExcelRows] = useState<TabForm[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
      setExcelRows(rows.map(row => ({
        modelName: String(row['모델명'] ?? row['model_name'] ?? ''),
        serialNumber: String(row['시리얼'] ?? row['serial_number'] ?? ''),
        purchaseDate: String(row['구입일'] ?? row['purchase_date'] ?? ''),
        notes: String(row['비고'] ?? row['notes'] ?? ''),
        storeCode: String(row['지점코드'] ?? row['store_code'] ?? ''),
        subStoreName: String(row['배분처'] ?? row['매장명'] ?? row['sub_store_name'] ?? ''),
      })));
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExcelUpload = async () => {
    if (excelRows.length === 0) return;
    setUploading(true);
    try {
      const result = await tabletsService.batchCreate(excelRows.map(r => {
        const storeId = r.storeCode
          ? stores.find(s => s.code === r.storeCode || s.name === r.storeCode)?.id
          : undefined;
        return {
          modelName: r.modelName || undefined,
          serialNumber: r.serialNumber || undefined,
          purchaseDate: r.purchaseDate || undefined,
          notes: r.notes || undefined,
          storeId,
          subStoreName: r.subStoreName || undefined,
        };
      }));
      alert(`${result.created}대 등록 완료`);
      setExcelRows([]);
    } catch (e) { alert(String(e)); }
    finally { setUploading(false); }
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

      {/* 탭 */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['single', 'excel'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'single' ? '단건 등록' : '엑셀 일괄 등록'}
          </button>
        ))}
      </div>

      {/* 단건 등록 */}
      {tab === 'single' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            {isSystemAdmin ? (
              <div>
                <label className="text-sm font-medium text-gray-700">매장 <span className="text-red-500">*</span></label>
                <select value={storeId} onChange={e => setStoreId(e.target.value)}
                  className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">매장 선택</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.code} {s.name}</option>
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
      )}

      {/* 엑셀 일괄 등록 */}
      {tab === 'excel' && (
        <div className="space-y-4">
          {/* 업로드 영역 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1 font-medium">엑셀 파일 업로드</p>
            <p className="text-xs text-gray-400 mb-4">
              컬럼명: <span className="font-mono text-gray-600">지점코드 / 배분처 / 모델명 / 시리얼 / 구입일 / 비고</span>
              <span className="ml-1">(지점코드: 예) LB0101)</span>
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-500">클릭하여 엑셀 파일 선택</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx, .xls</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFile} />
          </div>

          {/* 미리보기 */}
          {excelRows.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">미리보기 — {excelRows.length}대</p>
                <button onClick={() => setExcelRows([])} className="text-xs text-gray-400 hover:text-red-500">초기화</button>
              </div>
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['#', '지점코드', '배분처', '모델명', '시리얼', '구입일', '비고'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {excelRows.map((r, i) => {
                      const matchedStore = r.storeCode ? stores.find(s => s.code === r.storeCode || s.name === r.storeCode) : null;
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5">
                            {r.storeCode ? (
                              matchedStore
                                ? <span className="text-green-700">{r.storeCode}</span>
                                : <span className="text-red-500" title="매칭되는 지점 없음">{r.storeCode} ⚠</span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-1.5">{r.subStoreName || '-'}</td>
                          <td className="px-3 py-1.5">{r.modelName || '-'}</td>
                          <td className="px-3 py-1.5">{r.serialNumber || '-'}</td>
                          <td className="px-3 py-1.5">{r.purchaseDate || '-'}</td>
                          <td className="px-3 py-1.5">{r.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                <button onClick={() => navigate('/tablets')}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">
                  취소
                </button>
                <button onClick={handleExcelUpload} disabled={uploading}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? '등록 중...' : `${excelRows.length}대 등록`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
