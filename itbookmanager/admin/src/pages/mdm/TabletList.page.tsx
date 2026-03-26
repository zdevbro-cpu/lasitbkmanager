import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, RefreshCw, Pencil, Trash2, Plus, HandCoins, Building2 } from 'lucide-react';
import { tabletsService } from '../../services/tablets.service';
import type { Tablet } from '../../services/tablets.service';
import { TabletStatusBadge } from '../../components/mdm/TabletStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { storesService } from '../../services/stores.service';
import type { Store } from '../../services/stores.service';

type EditForm = { modelName: string; serialNumber: string; purchaseDate: string; purchasePrice: string; notes: string; subStoreName: string };
const EMPTY_FORM: EditForm = { modelName: '', serialNumber: '', purchaseDate: '', purchasePrice: '', notes: '', subStoreName: '' };

export default function TabletListPage() {
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const isSystemAdmin = adminUser?.role === 'system_admin';
  const [tablets, setTablets] = useState<Tablet[]>([]);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterSubStore, setFilterSubStore] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState('');
  const [loanDateFrom, setLoanDateFrom] = useState('');
  const [loanDateTo, setLoanDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 수정 모달
  const [editTarget, setEditTarget] = useState<Tablet | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // 라스브러리 배정 모달
  const [assignModal, setAssignModal] = useState(false);
  const [assignStoreId, setAssignStoreId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // 하위 매장 배분 모달
  const [subStoreModal, setSubStoreModal] = useState(false);
  const [subStoreInput, setSubStoreInput] = useState<string>('');
  const [subStoreAssigning, setSubStoreAssigning] = useState(false);

  useEffect(() => {
    if (isSystemAdmin) {
      storesService.list().then(setStores).catch(console.error);
    } else if (adminUser?.store_id) {
      setFilterStore(adminUser.store_id);
    }
  }, [isSystemAdmin, adminUser]);

  const fetchTablets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 200 };
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      if (loanDateFrom) params.loanDateFrom = loanDateFrom;
      if (loanDateTo) params.loanDateTo = loanDateTo;
      if (filterStore) params.storeId = filterStore;
      if (filterSubStore) params.subStoreName = filterSubStore;
      const result = await tabletsService.list(params);
      setTablets(result.data);
      setTotal(result.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, search, loanDateFrom, loanDateTo, filterStore]);

  useEffect(() => { void fetchTablets(); }, [fetchTablets]);

  const statusCounts = {
    '': tablets.length,
    stock: tablets.filter(t => t.status === 'stock').length,
    loaned: tablets.filter(t => t.status === 'loaned').length,
    repair: tablets.filter(t => t.status === 'repair').length,
    lost: tablets.filter(t => t.status === 'lost').length,
  };
  const stockCount = statusCounts.stock;
  const loanedCount = statusCounts.loaned;

  // 현 지점(또는 전체)에 존재하는 독특한 하위 매장 이름들 추출
  const subStoreList = Array.from(new Set(tablets.map(t => t.sub_store_name).filter(Boolean))) as string[];

  // ── 체크박스 ──
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => setSelected(selected.size === tablets.length ? new Set() : new Set(tablets.map(t => t.id)));
  const selectedTablets = tablets.filter(t => selected.has(t.id));

  // ── 수정 ──
  const openEdit = (t: Tablet, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(t);
    setEditForm({
      modelName: t.model_name ?? '',
      serialNumber: t.serial_number ?? '',
      purchaseDate: t.purchase_date?.slice(0, 10) ?? '',
      purchasePrice: t.purchase_price ? String(t.purchase_price) : '',
      notes: t.notes ?? '',
      subStoreName: t.sub_store_name ?? '',
    });
  };
  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await tabletsService.update(editTarget.id, {
        modelName: editForm.modelName || null,
        serialNumber: editForm.serialNumber || null,
        purchaseDate: editForm.purchaseDate || null,
        purchasePrice: editForm.purchasePrice ? parseInt(editForm.purchasePrice) : null,
        notes: editForm.notes || null,
        subStoreName: editForm.subStoreName || null,
      } as Parameters<typeof tabletsService.update>[1]);
      setEditTarget(null);
      void fetchTablets();
    } catch (e) { alert(String(e)); }
    finally { setSaving(false); }
  };

  // ── 삭제 ──
  const handleDelete = async (t: Tablet, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`${t.qr_code} 태블릿을 삭제하시겠습니까?\n대여 중인 태블릿은 삭제할 수 없습니다.`)) return;
    try {
      await tabletsService.remove(t.id);
      setSelected(prev => { const n = new Set(prev); n.delete(t.id); return n; });
      void fetchTablets();
    } catch (e) { alert(String(e)); }
  };

  // ── 라스브러리 일괄 배정 ──
  const handleBulkAssign = async () => {
    setAssigning(true);
    try {
      const result = await tabletsService.bulkAssignStore(
        Array.from(selected),
        assignStoreId || null
      );
      const storeName = assignStoreId
        ? stores.find(s => s.id === assignStoreId)?.name ?? assignStoreId
        : '미배정';
      alert(`${result.updated}대를 [${storeName}](으)로 배정했습니다.`);
      setAssignModal(false);
      setAssignStoreId('');
      setSelected(new Set());
      void fetchTablets();
    } catch (e) { alert(String(e)); }
    finally { setAssigning(false); }
  };

  // ── 하위 매장 일괄 배분 ──
  const handleBulkSubStoreAssign = async () => {
    setSubStoreAssigning(true);
    try {
      const result = await tabletsService.bulkAssignSubStore(
        Array.from(selected),
        subStoreInput || null
      );
      alert(`${result.updated}대를 [${subStoreInput || '미배정'}](이)로 배분했습니다.`);
      setSubStoreModal(false);
      setSubStoreInput('');
      setSelected(new Set());
      void fetchTablets();
    } catch (e) { alert(String(e)); }
    finally { setSubStoreAssigning(false); }
  };

  // ── QR 재생성 ──
  const handleRegenQr = async (t: Tablet, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`${t.qr_code}의 QR 코드를 새로 생성하시겠습니까?\n기존 QR 스티커는 사용 불가가 됩니다.`)) return;
    try {
      const updated = await tabletsService.regenQr(t.id);
      alert(`새 QR 코드: ${updated.qr_code}`);
      void fetchTablets();
    } catch (e) { alert(String(e)); }
  };

  // ── QR 출력 (인쇄 미리보기) ──
  const handlePrint = (targets: Tablet[]) => {
    const origin = window.location.origin;
    const labelsHtml = targets.map(t => `
      <div class="label">
        <div class="brand">LASBook</div>
        <img src="${origin}/api/v1/tablets/${t.id}/qr-image" alt="${t.qr_code}" />
        <div class="qr-code">${t.qr_code}</div>
        ${t.model_name ? `<div class="model">${t.model_name}</div>` : ''}
        ${t.serial_number ? `<div class="serial">S/N: ${t.serial_number}</div>` : ''}
      </div>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR 라벨 출력</title>
<style>
  @page { size: A4 portrait; margin: 5mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: sans-serif; }
  .toolbar {
    position: fixed; top: 0; left: 0; right: 0;
    background: #1e40af; color: #fff; padding: 10px 16px;
    display: flex; align-items: center; gap: 12px; z-index: 1000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  .toolbar span { flex: 1; font-weight: 700; font-size: 14px; }
  .toolbar button {
    padding: 6px 16px; border-radius: 6px; border: none; cursor: pointer;
    font-size: 13px; font-weight: 600;
  }
  .btn-print { background: #fff; color: #1e40af; }
  .btn-close { background: rgba(255,255,255,0.2); color: #fff; }
  .content { margin-top: 48px; padding: 4mm; }
  .grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-auto-rows: 27mm;
    gap: 1.5mm;
    width: 200mm;
  }
  .label {
    border: 0.5px solid #aaa; border-radius: 1.5mm; padding: 1.5mm;
    text-align: center; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .brand { font-weight: 900; font-size: 7pt; letter-spacing: 1.5px; margin-bottom: 0.5mm; }
  .label img { width: 18mm; height: 18mm; display: block; }
  .qr-code { font-size: 5.5pt; font-family: monospace; font-weight: 700; margin-top: 0.5mm; }
  .model { font-size: 4.5pt; color: #444; margin-top: 0.3mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .serial { font-size: 4pt; color: #777; margin-top: 0.2mm; }
  @media print {
    .toolbar { display: none !important; }
    .content { margin-top: 0 !important; padding: 0 !important; }
  }
</style>
<script>
  window.addEventListener('afterprint', function() { window.close(); });
  window.onload = function() {
    // 이미지 로드 완료 후 인쇄 대화상자 자동 실행
    var imgs = document.querySelectorAll('img');
    var loaded = 0;
    if (imgs.length === 0) { window.print(); return; }
    imgs.forEach(function(img) {
      if (img.complete) { loaded++; if (loaded === imgs.length) window.print(); }
      else { img.onload = img.onerror = function() { loaded++; if (loaded === imgs.length) window.print(); }; }
    });
  };
</script>
</head>
<body>
  <div class="toolbar">
    <span>QR 라벨 — ${targets.length}개 (A4 6×10)</span>
    <button class="btn-print" onclick="window.print()">🖨 다시 인쇄</button>
    <button class="btn-close" onclick="window.close()">✕ 닫기</button>
  </div>
  <div class="content"><div class="grid">${labelsHtml}</div></div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'width=1000,height=750');
    if (!win) { URL.revokeObjectURL(url); alert('팝업이 차단됐습니다. 팝업을 허용해주세요.'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <>
      <div>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isSystemAdmin ? '태블릿 관리 (전체)' : (
                <span className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-mono font-bold">{adminUser?.store_code}</span>
                  {adminUser?.store_name} 태블릿 관리
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              전체 {total}대 · 재고 {stockCount}대 · 대여중 {loanedCount}대
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {selected.size > 0 && (
              <>
                {isSystemAdmin && (
                  <button onClick={() => setAssignModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                    <Building2 size={15} /> 라스브러리 배정 ({selected.size}개)
                  </button>
                )}
                <button onClick={() => setSubStoreModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600">
                  <HandCoins size={15} /> 하위 매장 배분 ({selected.size}개)
                </button>
              </>
            )}
            {selected.size > 0 ? (
              <button onClick={() => handlePrint(selectedTablets)}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                <Printer size={15} /> 선택 QR 출력 ({selected.size}개)
              </button>
            ) : tablets.length > 0 && (
              <button onClick={() => handlePrint(tablets)}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                <Printer size={15} /> 탭 전체 QR 출력 ({tablets.length}개)
              </button>
            )}
            <button
              onClick={() => navigate('/tablets/loan',
                selected.size > 0
                  ? { state: { preloaded: selectedTablets.map(t => t.qr_code) } }
                  : undefined
              )}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              <HandCoins size={15} />
              {selected.size > 0 ? `대여 / 반납 (${selected.size}개)` : '대여 / 반납'}
            </button>
            <button onClick={() => navigate('/tablets/new')}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
              <Plus size={15} /> 태블릿 등록
            </button>
          </div>
        </div>

        {/* 상태 탭 */}
        <div className="flex gap-1 mb-3 border-b border-gray-200">
          {([
            { value: '', label: '전체' },
            { value: 'stock', label: '재고' },
            { value: 'loaned', label: '대여중' },
            { value: 'repair', label: '수리중' },
            { value: 'lost', label: '분실' },
          ] as { value: string; label: string }[]).map(tab => (
            <button
              key={tab.value}
              onClick={() => { setFilterStatus(tab.value); setSelected(new Set()); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                filterStatus === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filterStatus === tab.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {statusCounts[tab.value as keyof typeof statusCounts] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* 검색/필터 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input type="text" placeholder="QR코드, 모델명, 시리얼"
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          {!isSystemAdmin && adminUser?.store_name && (
            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium border border-blue-100 flex items-center gap-2">
              <Building2 size={16} />
              {adminUser.store_name} ({adminUser.store_code})
            </div>
          )}
          {isSystemAdmin && (
            <select value={filterStore} onChange={e => { setFilterStore(e.target.value); setFilterSubStore(''); setSelected(new Set()); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm">
              <option value="">전체 라스브러리</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.code} {s.name}</option>
              ))}
            </select>
          )}
          
          <select value={filterSubStore} onChange={e => { setFilterSubStore(e.target.value); setSelected(new Set()); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm min-w-32">
            <option value="">전체 배분처</option>
            <option value="UNASSIGNED">미배정</option>
            {subStoreList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="whitespace-nowrap">대여일</span>
            <input type="date" value={loanDateFrom} onChange={e => setLoanDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm" />
            <span>~</span>
            <input type="date" value={loanDateTo} onChange={e => setLoanDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm" />
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input type="checkbox"
                    checked={tablets.length > 0 && selected.size === tablets.length}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">QR 코드</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">모델명</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">시리얼</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">상태</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">라스브러리</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">배분처/몰</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">대여 회원</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">대여일</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-center w-28">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={isSystemAdmin ? 9 : 8} className="text-center py-10 text-gray-400">로딩중...</td></tr>
              ) : tablets.length === 0 ? (
                <tr><td colSpan={isSystemAdmin ? 9 : 8} className="text-center py-10 text-gray-400">태블릿이 없습니다.</td></tr>
              ) : tablets.map(t => (
                <tr key={t.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selected.has(t.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => navigate(`/tablets/${t.id}`)}>
                  <td className="px-3 py-2.5" onClick={e => toggleSelect(t.id, e)}>
                    <input type="checkbox" readOnly checked={selected.has(t.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-2.5 font-mono font-medium text-gray-900 text-xs">{t.qr_code}</td>
                  <td className="px-3 py-2.5 text-gray-600">{t.model_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{t.serial_number ?? '-'}</td>
                  <td className="px-3 py-2.5"><TabletStatusBadge status={t.status} /></td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 font-medium">
                    {t.store_code ? `${t.store_code} ${t.store_name ?? ''}` : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {t.sub_store_name ? (
                      <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100 font-medium">
                        {t.sub_store_name}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{t.member_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{t.loan_start_date?.slice(0, 10) ?? '-'}</td>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button title="QR 출력" onClick={e => { e.stopPropagation(); handlePrint([t]); }}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                        <Printer size={14} />
                      </button>
                      <button title="QR 재생성" onClick={e => handleRegenQr(t, e)}
                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded">
                        <RefreshCw size={14} />
                      </button>
                      <button title="정보 수정" onClick={e => openEdit(t, e)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil size={14} />
                      </button>
                      <button title="삭제" onClick={e => handleDelete(t, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 수정 모달 */}
        {editTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-semibold text-gray-900 mb-1">태블릿 정보 수정</h3>
              <p className="text-xs text-gray-400 mb-4 font-mono">{editTarget.qr_code}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">배분처 (하위 매장/몰)</label>
                  <input value={editForm.subStoreName}
                    onChange={e => setEditForm(p => ({ ...p, subStoreName: e.target.value }))}
                    placeholder="예: 홈플러스 울산점"
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">모델명</label>
                  <input value={editForm.modelName}
                    onChange={e => setEditForm(p => ({ ...p, modelName: e.target.value }))}
                    placeholder="예: Samsung Galaxy Tab A9"
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">시리얼 번호</label>
                  <input value={editForm.serialNumber}
                    onChange={e => setEditForm(p => ({ ...p, serialNumber: e.target.value }))}
                    placeholder="S/N"
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">구입일</label>
                  <input type="date" value={editForm.purchaseDate}
                    onChange={e => setEditForm(p => ({ ...p, purchaseDate: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">구입가 (원)</label>
                  <input type="number" value={editForm.purchasePrice}
                    onChange={e => setEditForm(p => ({ ...p, purchasePrice: e.target.value }))}
                    placeholder="400000"
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">비고</label>
                  <input value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEditTarget(null)}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 하위 매장 배분 모달 */}
      {subStoreModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1 text-orange-600">하위 매장/몰 배분</h3>
            <p className="text-xs text-gray-400 mb-4 font-medium leading-relaxed">
              선택된 {selected.size}대를 지점 산하의 매장에 배분합니다.<br/>
              (예: 라스몰, 홈플러스 수원점 등)
            </p>
            <input 
              value={subStoreInput} 
              onChange={e => setSubStoreInput(e.target.value)}
              placeholder="배분처/몰 이름 입력"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-[10px] text-gray-400 mb-4 italic">* 입력하지 않고 확인 누를 시 "미배정" 처리됩니다.</p>
            <div className="flex gap-2">
              <button onClick={() => { setSubStoreModal(false); setSubStoreInput(''); }}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleBulkSubStoreAssign} disabled={subStoreAssigning}
                className="flex-1 bg-orange-600 text-white rounded-lg py-2 text-sm font-bold hover:bg-orange-700 disabled:opacity-50">
                {subStoreAssigning ? '배분 중...' : '배분 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 라스브러리 배정 모달 */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">라스브러리 배정</h3>
            <p className="text-xs text-gray-400 mb-4">선택된 태블릿 {selected.size}대를 배정할 라스브러리를 선택하세요.</p>
            <select value={assignStoreId} onChange={e => setAssignStoreId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">미배정 (배정 해제)</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.code} {s.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => { setAssignModal(false); setAssignStoreId(''); }}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleBulkAssign} disabled={assigning}
                className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {assigning ? '배정 중...' : '배정 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  );
}
