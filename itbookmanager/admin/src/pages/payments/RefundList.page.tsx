import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsService } from '../../services/payments.service';
import type { Refund, RefundCalculation } from '../../services/payments.service';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  requested: { label: '요청됨',  cls: 'bg-yellow-100 text-yellow-700' },
  approved:  { label: '승인됨',  cls: 'bg-green-100 text-green-800' },
  rejected:  { label: '거절됨',  cls: 'bg-red-100 text-red-700' },
};

const RULE_MAP: Record<string, string> = {
  full: '전액환불',
  usage_deduct: '사용료공제',
  no_refund: '환불불가',
};

export default function RefundListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // 새 환불 계산기
  const paymentIdFromUrl = searchParams.get('paymentId') ?? '';
  const memberIdFromUrl = searchParams.get('memberId') ?? '';
  const [showCalc, setShowCalc] = useState(!!paymentIdFromUrl);
  const [calcPaymentId, setCalcPaymentId] = useState(paymentIdFromUrl);
  const [calcMemberId, setCalcMemberId] = useState(memberIdFromUrl);
  const [calcReason, setCalcReason] = useState('');
  const [calcResult, setCalcResult] = useState<RefundCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const data = await paymentsService.listRefunds(filterStatus || undefined);
      setRefunds(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadRefunds(); }, [filterStatus]);

  const handleCalculate = async () => {
    if (!calcPaymentId) return alert('결제 ID를 입력하세요.');
    setCalculating(true);
    try {
      const result = await paymentsService.calculateRefund(calcPaymentId);
      setCalcResult(result.calculation);
    } catch (e) { alert(String(e)); }
    finally { setCalculating(false); }
  };

  const handleRequest = async () => {
    if (!calcPaymentId || !calcMemberId) return alert('결제 ID와 회원 ID를 입력하세요.');
    if (!confirm(`환불금액 ${calcResult?.refundAmount.toLocaleString()}원 환불을 요청하시겠습니까?`)) return;
    setRequesting(true);
    try {
      await paymentsService.requestRefund({ memberId: calcMemberId, paymentId: calcPaymentId, reason: calcReason });
      setShowCalc(false);
      setCalcResult(null);
      void loadRefunds();
    } catch (e) { alert(String(e)); }
    finally { setRequesting(false); }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('환불을 승인하시겠습니까? 회원 상태가 종료됩니다.')) return;
    try {
      await paymentsService.approveRefund(id);
      void loadRefunds();
    } catch (e) { alert(String(e)); }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await paymentsService.rejectRefund(rejectId, rejectReason);
      setRejectId(null); setRejectReason('');
      void loadRefunds();
    } catch (e) { alert(String(e)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/payments')} className="text-gray-400 hover:text-gray-600 text-sm">← 결제목록</button>
          <h2 className="text-xl font-semibold text-gray-900">환불 관리</h2>
        </div>
        <button onClick={() => { setShowCalc(true); setCalcResult(null); }}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
          + 환불 계산
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">전체</option>
          <option value="requested">요청됨</option>
          <option value="approved">승인됨</option>
          <option value="rejected">거절됨</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">회원</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">요청일</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">환불 규칙</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">사용료</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">위약금</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">환불금액</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">로딩중...</td></tr>
            ) : refunds.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">환불 내역이 없습니다.</td></tr>
            ) : refunds.map(r => {
              const s = STATUS_MAP[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.member_name}</p>
                    <p className="text-xs text-gray-400">{r.member_number}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.requested_at.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-600">{RULE_MAP[r.refund_rule] ?? r.refund_rule}</td>
                  <td className="px-4 py-3 text-gray-600">{r.usage_fee.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-gray-600">{r.penalty_amount.toLocaleString()}원</td>
                  <td className="px-4 py-3 font-medium text-red-600">{r.refund_amount.toLocaleString()}원</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {r.status === 'requested' && (
                      <>
                        <button onClick={() => handleApprove(r.id)} className="text-xs text-green-600 hover:underline">승인</button>
                        <button onClick={() => setRejectId(r.id)} className="text-xs text-red-500 hover:underline">거절</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 환불 계산기 모달 */}
      {showCalc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">환불 계산기</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">회원 ID</label>
                <input value={calcMemberId} onChange={e => setCalcMemberId(e.target.value)}
                  placeholder="UUID" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">결제 ID</label>
                <input value={calcPaymentId} onChange={e => setCalcPaymentId(e.target.value)}
                  placeholder="UUID" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">환불 사유</label>
                <input value={calcReason} onChange={e => setCalcReason(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={handleCalculate} disabled={calculating}
                className="w-full border border-blue-500 text-blue-600 rounded-lg py-2 text-sm hover:bg-blue-50 disabled:opacity-50">
                {calculating ? '계산중...' : '환불 계산'}
              </button>

              {calcResult && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">사용일수</span><span>{calcResult.usageDays}일</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">사용료</span><span>{calcResult.usageFee.toLocaleString()}원</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">위약금</span><span>{calcResult.penaltyAmount.toLocaleString()}원</span></div>
                  {calcResult.tabletDeduction > 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">태블릿미반납</span><span className="text-red-600">-{calcResult.tabletDeduction.toLocaleString()}원</span></div>
                  )}
                  <div className="h-px bg-gray-200 my-1" />
                  <div className="flex justify-between font-semibold">
                    <span>환불금액</span>
                    <span className={calcResult.refundEligible ? 'text-blue-600' : 'text-red-600'}>
                      {calcResult.refundAmount.toLocaleString()}원
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{calcResult.notes}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowCalc(false); setCalcResult(null); }}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              {calcResult?.refundEligible && (
                <button onClick={handleRequest} disabled={requesting}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                  {requesting ? '처리중...' : '환불 요청'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 거절 모달 */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-3">환불 거절</h3>
            <div>
              <label className="text-xs font-medium text-gray-600">거절 사유</label>
              <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRejectId(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleReject}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm">거절</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
