import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsService } from '../../services/payments.service';
import type { Payment } from '../../services/payments.service';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  paid:     { label: '결제완료', cls: 'bg-green-100 text-green-800' },
  refunded: { label: '환불됨',   cls: 'bg-gray-100 text-gray-600' },
  pending:  { label: '대기중',   cls: 'bg-yellow-100 text-yellow-700' },
};

const METHOD_MAP: Record<string, string> = {
  bank_transfer: '계좌이체',
  card: '카드',
  cash: '현금',
};

export default function PaymentListPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ memberId: '', amountPaid: '', amountFullPrice: '', paymentMethod: 'bank_transfer', notes: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    paymentsService.listPayments()
      .then(data => setPayments(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.memberId || !form.amountPaid || !form.amountFullPrice) return alert('필수 항목을 입력하세요.');
    setCreating(true);
    try {
      await paymentsService.createPayment({
        memberId: form.memberId,
        amountPaid: parseInt(form.amountPaid),
        amountFullPrice: parseInt(form.amountFullPrice),
        paymentMethod: form.paymentMethod,
        notes: form.notes || undefined,
      });
      setShowCreate(false);
      setForm({ memberId: '', amountPaid: '', amountFullPrice: '', paymentMethod: 'bank_transfer', notes: '' });
      const data = await paymentsService.listPayments();
      setPayments(data);
    } catch (e) { alert(String(e)); }
    finally { setCreating(false); }
  };

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">결제 관리</h2>
          <p className="text-sm text-gray-500 mt-0.5">총 결제금액 {totalPaid.toLocaleString()}원</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/payments/refunds')}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
            환불 관리
          </button>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            + 결제 등록
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">회원</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">결제일</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">결제금액</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">정상가</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">결제방법</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">로딩중...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">결제 내역이 없습니다.</td></tr>
            ) : payments.map(p => {
              const s = STATUS_MAP[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.member_name}</p>
                    <p className="text-xs text-gray-400">{p.member_number}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.payment_date.slice(0, 10)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.amount_paid.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-gray-500">{p.amount_full_price.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-gray-500">{METHOD_MAP[p.payment_method] ?? p.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'paid' && (
                      <button onClick={() => navigate(`/payments/refunds/new?paymentId=${p.id}&memberId=${p.member_id}`)}
                        className="text-xs text-red-500 hover:underline">환불</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 결제 등록 모달 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">결제 등록</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">회원 ID</label>
                <input value={form.memberId} onChange={e => setForm(p => ({ ...p, memberId: e.target.value }))}
                  placeholder="UUID" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">결제금액 (원)</label>
                <input value={form.amountPaid} onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))}
                  type="number" placeholder="900000" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">정상가 (원)</label>
                <input value={form.amountFullPrice} onChange={e => setForm(p => ({ ...p, amountFullPrice: e.target.value }))}
                  type="number" placeholder="1200000" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">결제방법</label>
                <select value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="bank_transfer">계좌이체</option>
                  <option value="card">카드</option>
                  <option value="cash">현금</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">메모</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
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
