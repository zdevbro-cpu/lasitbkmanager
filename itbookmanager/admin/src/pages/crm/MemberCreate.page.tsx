import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersService } from '../../services/members.service';
import { useAuth } from '../../context/AuthContext';
import { storesService } from '../../services/stores.service';
import type { Store } from '../../services/stores.service';

// 숫자 문자열을 천단위 콤마 포맷으로 변환
function fmtMoney(v: string): string {
  const digits = v.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits).toLocaleString('ko-KR') : '';
}
// 콤마 제거 후 정수로 파싱
function parseMoney(v: string): number | undefined {
  const n = parseInt(v.replace(/,/g, ''), 10);
  return isNaN(n) ? undefined : n;
}

export default function MemberCreatePage() {
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const isSystemAdmin = adminUser?.role === 'system_admin';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    memberType: 'subscription',
    paymentPlanName: '', planAmount: '', planDiscountedAmt: '',
    paymentMethod: 'card',
    assignedInstructor: '', notes: '',
  });

  useEffect(() => {
    if (isSystemAdmin) {
      storesService.list().then(setStores).catch(console.error);
    }
  }, [isSystemAdmin]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (isSystemAdmin && !storeId) { setError('매장을 선택해주세요.'); return; }
    setError('');
    setLoading(true);
    try {
      const member = await membersService.create({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        memberType: form.memberType,
        paymentPlanName: form.paymentPlanName || undefined,
        planAmount: parseMoney(form.planAmount),
        planDiscountedAmt: parseMoney(form.planDiscountedAmt),
        paymentMethod: form.paymentMethod || undefined,
        assignedInstructor: form.assignedInstructor || undefined,
        notes: form.notes || undefined,
        storeId: storeId || undefined,
      });
      navigate(`/members/${member.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/members')} className="text-gray-400 hover:text-gray-600 text-sm">← 목록</button>
        <h2 className="text-xl font-semibold text-gray-900">회원 등록</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="이름 *" required value={form.name} onChange={v => set('name', v)} />
            <Field label="이메일 *" type="email" required value={form.email} onChange={v => set('email', v)} />
            <Field label="연락처" value={form.phone} onChange={v => set('phone', v)} placeholder="010-0000-0000" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">회원 유형 *</label>
              <select
                value={form.memberType}
                onChange={e => set('memberType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="subscription">구독회원</option>
                <option value="managed">관리회원</option>
              </select>
            </div>
            {isSystemAdmin && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">매장 *</label>
                <select value={storeId} onChange={e => setStoreId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">매장 선택</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.code} {s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">결제 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="플랜명" value={form.paymentPlanName} onChange={v => set('paymentPlanName', v)} placeholder="연간 구독 플랜" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">결제 수단</label>
              <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="card">카드</option>
                <option value="transfer">계좌이체</option>
                <option value="cash">현금</option>
              </select>
            </div>
            <MoneyField label="정상가" value={form.planAmount}
              onChange={v => set('planAmount', fmtMoney(v))} />
            <MoneyField label="실결제가" value={form.planDiscountedAmt}
              onChange={v => set('planDiscountedAmt', fmtMoney(v))} />
          </div>
        </section>

        {form.memberType === 'managed' && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">관리회원 추가 정보</h3>
            <Field label="담당 강사" value={form.assignedInstructor} onChange={v => set('assignedInstructor', v)} />
          </section>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">비고</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        <p className="text-xs text-gray-400">* 등록 후 Firebase 계정이 자동 생성되고 비밀번호 재설정 이메일이 발송됩니다.</p>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/members')} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50">취소</button>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? '등록 중...' : '회원 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, type = 'text', required, value, onChange, placeholder }: {
  label: string; type?: string; required?: boolean;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type} required={required} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function MoneyField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">원</span>
      </div>
    </div>
  );
}
