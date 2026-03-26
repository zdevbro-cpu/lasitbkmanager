import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tabletsService } from '../../services/tablets.service';
import type { Tablet, TabletLoan } from '../../services/tablets.service';
import { TabletStatusBadge, ActionLabel } from '../../components/mdm/TabletStatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function TabletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const isSystemAdmin = adminUser?.role === 'system_admin';

  const [tablet, setTablet] = useState<Tablet | null>(null);
  const [history, setHistory] = useState<TabletLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostNotes, setLostNotes] = useState('');

  useEffect(() => {
    if (!id || !adminUser) return;
    setLoading(true);
    Promise.all([tabletsService.getOne(id), tabletsService.getHistory(id)])
      .then(([t, h]) => {
        // 권한 체크: 시스템 관리자가 아니고 지점 ID가 다르면 접근 차단
        if (!isSystemAdmin && t.store_id !== adminUser.store_id) {
          setError('해당 태블릿에 대한 관리 권한이 없습니다.');
          return;
        }
        setTablet(t);
        setHistory(h);
      })
      .catch(err => {
        console.error(err);
        setError('정보를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [id, adminUser, isSystemAdmin]);

  const handleLost = async () => {
    if (!id) return;
    try {
      const updated = await tabletsService.reportLost(id, lostNotes || undefined);
      setTablet(updated);
      const h = await tabletsService.getHistory(id);
      setHistory(h);
      setShowLostModal(false);
    } catch (e) { alert(String(e)); }
  };

  const handleRecover = async () => {
    if (!id || !confirm('분실 태블릿을 회수 처리하겠습니까?')) return;
    try {
      const updated = await tabletsService.recover(id);
      setTablet(updated);
      const h = await tabletsService.getHistory(id);
      setHistory(h);
    } catch (e) { alert(String(e)); }
  };

  const handlePrintQr = () => {
    if (!tablet || !id) return;
    const imgUrl = `${window.location.origin}/api/v1/tablets/${id}/qr-image`;
    const storeLabel = tablet.store_code ? `${tablet.store_code} ${tablet.store_name ?? ''}` : '';
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR 출력</title>
<style>
  body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
  .card { text-align: center; font-family: sans-serif; padding: 16px; }
  .brand { font-weight: 900; font-size: 11pt; letter-spacing: 2px; margin-bottom: 6px; }
  img { width: 200px; height: 200px; display: block; margin: 0 auto; }
  .qr-code { font-family: monospace; font-size: 11pt; font-weight: 700; margin-top: 8px; }
  .model { font-size: 9pt; color: #444; margin-top: 4px; }
  .serial { font-size: 8pt; color: #777; margin-top: 2px; }
  .store { font-size: 8pt; color: #555; margin-top: 2px; }
  @media print { body { min-height: unset; } }
</style></head>
<body><div class="card">
  <div class="brand">LASBook</div>
  <img src="${imgUrl}" onload="window.print()" onerror="window.print()" alt="${tablet.qr_code}" />
  <div class="qr-code">${tablet.qr_code}</div>
  ${tablet.model_name ? `<div class="model">${tablet.model_name}</div>` : ''}
  ${tablet.serial_number ? `<div class="serial">S/N: ${tablet.serial_number}</div>` : ''}
  ${storeLabel ? `<div class="store">${storeLabel}</div>` : ''}
</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">로딩중...</div>;
  if (error) return (
    <div className="py-10 text-center">
      <p className="text-sm text-red-500 mb-4">{error}</p>
      <button onClick={() => navigate('/tablets')} className="text-sm text-blue-600 hover:underline">목록으로 돌아가기</button>
    </div>
  );
  if (!tablet) return <div className="text-sm text-red-500 py-10 text-center">태블릿을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/tablets')} className="text-gray-400 hover:text-gray-600 text-sm">← 목록</button>
        <h2 className="text-xl font-semibold text-gray-900 font-mono">{tablet.qr_code}</h2>
        <TabletStatusBadge status={tablet.status} />
      </div>

      <div className="flex gap-2 mb-5">
        {tablet.status === 'lost' && (
          <button onClick={handleRecover}
            className="px-3 py-1.5 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50">
            회수 처리
          </button>
        )}
        {tablet.status !== 'lost' && tablet.status !== 'loaned' && (
          <button onClick={() => setShowLostModal(true)}
            className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
            분실 신고
          </button>
        )}
        <button onClick={handlePrintQr}
          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
          QR 이미지 출력
        </button>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Item label="소속 지점" value={tablet.store_code ? `${tablet.store_code} ${tablet.store_name ?? ''}` : '-'} />
          <Item label="배분처 (몰/매장)" value={tablet.sub_store_name ?? '-'} />
          <Item label="모델명" value={tablet.model_name ?? '-'} />
          <Item label="시리얼 번호" value={tablet.serial_number ?? '-'} />
          <Item label="구입일" value={tablet.purchase_date?.slice(0, 10) ?? '-'} />
          <Item label="구입가" value={tablet.purchase_price ? `${tablet.purchase_price.toLocaleString()}원` : '-'} />
          <Item label="현재 대여자" value={tablet.member_name ?? '없음'} />
          {tablet.loan_start_date && <Item label="대여 시작일" value={tablet.loan_start_date.slice(0, 10)} />}
          {tablet.notes && <div className="col-span-2"><Item label="비고" value={tablet.notes} /></div>}
        </dl>
      </div>

      {/* 이력 */}
      <h3 className="text-sm font-semibold text-gray-700 mb-2">대여 이력</h3>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">이력이 없습니다.</p>
        ) : history.map(h => (
          <div key={h.id} className="px-4 py-3 flex items-start justify-between text-sm">
            <div>
              <ActionLabel action={h.action} />
              {h.member_name && <span className="ml-2 text-gray-700">{h.member_name}</span>}
              {h.condition_notes && <p className="text-xs text-orange-600 mt-0.5">{h.condition_notes}</p>}
            </div>
            <span className="text-xs text-gray-400 shrink-0 ml-4">{h.action_date.slice(0, 10)}</span>
          </div>
        ))}
      </div>

      {/* 분실 신고 모달 */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-3">분실 신고</h3>
            <textarea value={lostNotes} onChange={e => setLostNotes(e.target.value)}
              placeholder="분실 상황을 입력하세요" rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowLostModal(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleLost}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm">신고</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
