import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Printer, RefreshCw, Trash2, Plus, HandCoins, Building2, Loader2 } from 'lucide-react';
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
  const [stores, setStores] = useState<Store[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loanDateFrom, setLoanDateFrom] = useState('');
  const [loanDateTo, setLoanDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // 수정 모달
  const [editTarget, setEditTarget] = useState<Tablet | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // 배정 모달 (전체 지점)
  const [assignModal, setAssignModal] = useState(false);
  const [assignStoreId, setAssignStoreId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // 단일 태블릿 정보+배정 모달
  const [singleModal, setSingleModal] = useState<Tablet | null>(null);
  const [singleStoreId, setSingleStoreId] = useState('');
  const [singleAssigning, setSingleAssigning] = useState(false);

  // 엑셀 업로드 로딩
  const [uploadingExcel, setUploadingExcel] = useState(false);

  // 전역 재고 상태 카운트 (API에서 받아옴)
  const [globalCounts, setGlobalCounts] = useState({ total: 0, stock: 0, assigned: 0, loaned: 0, repair: 0, lost: 0 });

  useEffect(() => {
    if (isSystemAdmin) {
      storesService.list().then(data => {
        setStores([...data].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR')));
      }).catch(console.error);
    } else if (adminUser?.store_id) {
      setFilterStore(adminUser.store_id);
    }
  }, [isSystemAdmin, adminUser]);

  // 검색어 디바운싱
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchTablets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: pageSize };
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      if (loanDateFrom) params.loanDateFrom = loanDateFrom;
      if (loanDateTo) params.loanDateTo = loanDateTo;
      if (filterStore) params.storeId = filterStore;
      const result = await tabletsService.list(params);
      setTablets(result.data);
      setTotal(result.total);
      if (result.statusCounts) setGlobalCounts(result.statusCounts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, search, loanDateFrom, loanDateTo, filterStore, page, pageSize]);

  // 필터 변경 시 페이지 1로 리셋
  useEffect(() => { setPage(1); }, [filterStatus, search, loanDateFrom, loanDateTo, filterStore, pageSize]);

  useEffect(() => { void fetchTablets(); }, [fetchTablets]);

  // ── 엑셀 일괄 업로드 ──
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newTablets: { serialNumber: string, modelName?: string }[] = [];
        data.forEach((row: any) => {
          const sn = row['시리얼'] || row['시리얼넘버'] || row['시리얼 번호'] || row['SerialNumber'] || row['S/N'] || row['serialNumber'];
          if (sn) {
            newTablets.push({
              serialNumber: String(sn).trim(),
              modelName: row['모델명'] || row['Model'] || undefined
            });
          }
        });
        
        if (newTablets.length === 0) {
          alert('엑셀 파일에서 유효한 시리얼 넘버를 찾을 수 없습니다. (열 이름: S/N, 시리얼, 시리얼넘버 중 하나)');
          return;
        }
        
        if (!confirm(`총 ${newTablets.length}대의 기기를 등록하시겠습니까?`)) return;
        
        const res = await tabletsService.batchCreate(newTablets);
        alert(`${res.created}대의 기기가 성공적으로 일괄 등록되었습니다.`);
        void fetchTablets();
      } catch (err: any) {
        alert(`엑셀 처리 중 오류 발생: ${err.response?.data?.error || err.message}`);
      } finally {
        setUploadingExcel(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── 바코드 스캐너 전역 감지 로직 ──
  const barcodeBuffer = useRef('');
  const barcodeTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 폼에 포커스가 있으면 바코드 스캔 단축키 무시 (사용자 타이핑 방해 금지)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Enter') {
        const scannedCode = barcodeBuffer.current.trim();
        if (scannedCode.length > 3) {
          const upper = scannedCode.toUpperCase();
          const matched = tablets.find(t =>
            t.serial_number?.toUpperCase() === upper || t.qr_code?.toUpperCase() === upper
          );
          if (matched) {
            setSelected(prev => {
              const next = new Set(prev);
              next.add(matched.id);
              return next;
            });
          }
        }
        barcodeBuffer.current = '';
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        barcodeTimeout.current = setTimeout(() => {
          barcodeBuffer.current = ''; // 50ms 타임아웃
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
    };
  }, [tablets]);

  const statusCounts = {
    '': globalCounts.total,
    stock: globalCounts.stock,
    assigned: globalCounts.assigned,
    loaned: globalCounts.loaned,
    repair: globalCounts.repair,
    lost: globalCounts.lost,
  };
  const stockCount = statusCounts.stock;
  const assignedCount = statusCounts.assigned;
  const loanedCount = statusCounts.loaned;

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

  // ── 단일 배정 ──
  const handleSingleAssign = async () => {
    if (!singleModal || !singleStoreId) return;
    setSingleAssigning(true);
    try {
      await tabletsService.bulkAssignStore([singleModal.id], singleStoreId);
      const storeName = stores.find(s => s.id === singleStoreId)?.name ?? singleStoreId;
      alert(`[${storeName}](으)로 배정했습니다.`);
      setSingleModal(null); setSingleStoreId('');
      void fetchTablets();
    } catch (e) { alert(String(e)); }
    finally { setSingleAssigning(false); }
  };

  const handleSingleRelease = async () => {
    if (!singleModal || !confirm('배정을 해지하고 본사로 반환하시겠습니까?')) return;
    setSingleAssigning(true);
    try {
      await tabletsService.bulkAssignStore([singleModal.id], null, true);
      alert('배정 해지되었습니다. (본사 반환, 재고)');
      setSingleModal(null); setSingleStoreId('');
      void fetchTablets();
    } catch (e) { alert(String(e)); }
    finally { setSingleAssigning(false); }
  };

  // ── 일괄 배정 ──
  const handleBulkAssign = async () => {
    if (!assignStoreId) return;
    setAssigning(true);
    try {
      const result = await tabletsService.bulkAssignStore(Array.from(selected), assignStoreId);
      const storeName = stores.find(s => s.id === assignStoreId)?.name ?? assignStoreId;
      alert(`${result.updated}대를 [${storeName}](으)로 배정했습니다.`);
      setAssignModal(false);
      setAssignStoreId('');
      setSelected(new Set());
      void fetchTablets();
    } catch (e) { alert(String(e)); }
    finally { setAssigning(false); }
  };

  // ── 배정 해지 (본사 반환) ──
  const handleBulkRelease = async () => {
    if (!confirm(`선택된 ${selected.size}대의 배정을 해지하고 본사로 반환하시겠습니까?`)) return;
    setAssigning(true);
    try {
      const result = await tabletsService.bulkAssignStore(Array.from(selected), null, true);
      alert(`${result.updated}대가 배정 해지되었습니다. (본사 반환, 재고)`);
      setAssignModal(false);
      setAssignStoreId('');
      setSelected(new Set());
      void fetchTablets();
    } catch (e) { alert(String(e)); }
    finally { setAssigning(false); }
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
    const labelsHtml = targets.map(t => {
      const imgUrl = `${origin}/api/v1/tablets/${t.id}/qr-image`;
      return `<div class="label">
        <div class="brand">LASBOOK</div>
        <img src="${imgUrl}" alt="${t.qr_code}" />
        <div class="qr-code">${t.qr_code}</div>
        ${t.model_name ? `<div class="model">${t.model_name}</div>` : ''}
        ${t.serial_number ? `<div class="serial">${t.serial_number}</div>` : ''}
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR 출력</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #f0f0f0; }
  .toolbar {
    position: fixed; top: 0; left: 0; right: 0; height: 40px;
    background: #1e40af; color: white; display: flex; align-items: center;
    justify-content: space-between; padding: 0 16px; z-index: 100; font-size: 13px;
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
            <h2 onClick={() => { setFilterStatus(''); setFilterStore(''); setSearch(''); setLoanDateFrom(''); setLoanDateTo(''); }}
              className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
              {isSystemAdmin ? '태블릿 관리 (전체)' : (
                <span className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-mono font-bold">{adminUser?.store_code}</span>
                  {adminUser?.store_name} 태블릿 관리
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              전체 {total}대 · 재고 {stockCount}대 · 배정 {assignedCount}대 · 대여중 {loanedCount}대
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {selected.size > 0 && isSystemAdmin && (
              <button onClick={() => setAssignModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                <Building2 size={15} /> 배정 ({selected.size}개)
              </button>
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
              <Plus size={15} /> 수동 등록
            </button>
            <div className="relative flex items-center">
              <input type="file" id="excel-upload" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} disabled={uploadingExcel} />
              <button onClick={() => document.getElementById('excel-upload')?.click()} disabled={uploadingExcel}
                className="flex items-center gap-1.5 px-4 py-2 border border-green-600 text-green-700 bg-green-50 text-sm rounded-lg hover:bg-green-100 disabled:opacity-50">
                {uploadingExcel ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {uploadingExcel ? '처리중...' : '엑셀 일괄 등록'}
              </button>
            </div>
          </div>
        </div>

        {/* 상태 탭 */}
        <div className="flex gap-1 mb-3 border-b border-gray-200">
          {([
            { value: '', label: '전체' },
            { value: 'stock', label: '재고' },
            { value: 'assigned', label: '배정' },
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
            value={query} onChange={e => setQuery(e.target.value)}
            className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          {!isSystemAdmin && adminUser?.store_name && (
            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium border border-blue-100 flex items-center gap-2">
              <Building2 size={16} />
              {adminUser.store_name} ({adminUser.store_code})
            </div>
          )}
          {isSystemAdmin && (
            <select value={filterStore} onChange={e => { setFilterStore(e.target.value); setSelected(new Set()); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm min-w-40">
              <option value="">전체 매장</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
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
                <th className="text-left px-3 py-3 font-medium text-gray-600">매장</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">대여 회원</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">담당자</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">대여일</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-center w-28">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">로딩중...</td></tr>
              ) : tablets.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">태블릿이 없습니다.</td></tr>
              ) : tablets.map(t => (
                <tr key={t.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selected.has(t.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => { setSingleModal(t); setSingleStoreId(''); }}>
                  <td className="px-3 py-2.5" onClick={e => toggleSelect(t.id, e)}>
                    <input type="checkbox" readOnly checked={selected.has(t.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-2.5 font-mono font-medium text-gray-900 text-sm">{t.qr_code}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-sm">{t.model_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-sm">{t.serial_number ?? '-'}</td>
                  <td className="px-3 py-2.5"><TabletStatusBadge status={t.status} /></td>
                  <td className="px-3 py-2.5 text-sm text-gray-600 font-medium">
                    {t.store_name ?? '-'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 text-sm">{t.member_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-sm">{t.loan_officer_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-sm">{t.loan_start_date?.slice(0, 10) ?? '-'}</td>
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

        {/* 페이지네이션 */}
        {total > 0 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>페이지당</span>
              {[30, 50, 100].map(n => (
                <button key={n}
                  onClick={() => setPageSize(n)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    pageSize === n
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {n}
                </button>
              ))}
              <span className="ml-1">· 전체 {total}대</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                «
              </button>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="px-2.5 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                ‹
              </button>
              {(() => {
                const totalPages = Math.ceil(total / pageSize);
                const delta = 2;
                const pages: (number | '...')[] = [];
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                    pages.push(i);
                  } else if (pages[pages.length - 1] !== '...') {
                    pages.push('...');
                  }
                }
                return pages.map((p2, idx) =>
                  p2 === '...' ? (
                    <span key={`e${idx}`} className="px-1 text-gray-400 text-xs">…</span>
                  ) : (
                    <button key={p2} onClick={() => setPage(p2 as number)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        page === p2
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {p2}
                    </button>
                  )
                );
              })()}
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / pageSize)}
                className="px-2.5 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                ›
              </button>
              <button onClick={() => setPage(Math.ceil(total / pageSize))} disabled={page >= Math.ceil(total / pageSize)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                »
              </button>
            </div>
          </div>
        )}

        {/* 수정 모달 */}
        {editTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-semibold text-gray-900 mb-3">태블릿 정보 수정</h3>
              {/* 현재 태블릿 정보 */}
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">QR 코드</span>
                  <span className="font-mono font-bold text-gray-700">{editTarget.qr_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">상태</span>
                  <TabletStatusBadge status={editTarget.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">소속 매장</span>
                  <span className="text-gray-700">{editTarget.store_name ?? '-'}</span>
                </div>
                {editTarget.member_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">대여 회원</span>
                    <span className="text-gray-700">{editTarget.member_name}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
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

        {/* 단일 태블릿 정보 + 배정 모달 */}
        {singleModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono font-bold text-gray-900 text-base">{singleModal.qr_code}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{singleModal.model_name ?? '모델명 없음'}</p>
                </div>
                <TabletStatusBadge status={singleModal.status} />
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">시리얼</span>
                  <span className="font-mono text-gray-700">{singleModal.serial_number ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">소속 매장</span>
                  <span className="text-gray-700 font-medium">{singleModal.store_name ?? '-'}</span>
                </div>
                {singleModal.member_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">대여 회원</span>
                    <span className="text-gray-700">{singleModal.member_name}</span>
                  </div>
                )}
                {singleModal.loan_start_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">대여일</span>
                    <span className="text-gray-700">{singleModal.loan_start_date.slice(0, 10)}</span>
                  </div>
                )}
              </div>
              {isSystemAdmin && (
                <>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">매장 배정</p>
                  <select value={singleStoreId} onChange={e => setSingleStoreId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">-- 매장 선택 --</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={handleSingleAssign} disabled={singleAssigning || !singleStoreId}
                    className="w-full bg-purple-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 mb-2">
                    {singleAssigning ? '처리 중...' : '배정 확인'}
                  </button>
                  <button onClick={handleSingleRelease} disabled={singleAssigning}
                    className="w-full border border-red-300 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50 mb-3">
                    {singleAssigning ? '처리 중...' : '배정 해지 (본사 반환 · 재고)'}
                  </button>
                </>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setSingleModal(null); setSingleStoreId(''); }}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">닫기</button>
                <button onClick={e => { openEdit(singleModal, e as unknown as React.MouseEvent); setSingleModal(null); }}
                  className="flex-1 border border-blue-300 text-blue-600 rounded-lg py-2 text-sm font-medium hover:bg-blue-50">
                  정보 수정
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 배정 모달 (전체 지점 - 라스브러리 + 매장) */}
        {assignModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-semibold text-gray-900 mb-1">매장 배정</h3>
              <p className="text-xs text-gray-400 mb-4">선택된 태블릿 {selected.size}대를 배정할 매장을 선택하세요.</p>
              <select value={assignStoreId} onChange={e => setAssignStoreId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">-- 매장 선택 --</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setAssignModal(false); setAssignStoreId(''); }}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
                <button onClick={handleBulkAssign} disabled={assigning || !assignStoreId}
                  className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  {assigning ? '배정 중...' : '배정 확인'}
                </button>
              </div>
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">또는</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <button onClick={handleBulkRelease} disabled={assigning}
                className="w-full border border-red-300 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                {assigning ? '처리 중...' : '배정 해지 (본사 반환 · 재고)'}
              </button>
            </div>
          </div>
        )}

        {/* 엑셀 업로드 로딩 오버레이 */}
        {uploadingExcel && (
          <div className="fixed inset-0 bg-black/40 flex flex-col items-center justify-center z-[100] backdrop-blur-sm">
            <Loader2 size={48} className="text-white animate-spin mb-4" />
            <p className="text-white font-bold text-xl">엑셀 일괄 등록 처리 중입니다...</p>
            <p className="text-white/80 text-sm mt-3">데이터를 데이터베이스에 반영하고 있습니다. 잠시만 기다려주세요.</p>
          </div>
        )}
      </div>
    </>
  );
}
