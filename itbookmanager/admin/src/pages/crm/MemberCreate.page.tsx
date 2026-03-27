import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersService } from '../../services/members.service';
import { useAuth } from '../../context/AuthContext';
import { storesService } from '../../services/stores.service';
import type { Store } from '../../services/stores.service';


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
    assignedInstructor: '', notes: '',
  });
  const [products, setProducts] = useState([{ id: Date.now(), lang: '한글', series: 'K2', qty: 1 }]);
  const [emailCheck, setEmailCheck] = useState<{ status: 'none' | 'checking' | 'ok' | 'fail'; msg: string }>({ status: 'none', msg: '' });

  useEffect(() => {
    storesService.list().then(data => {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
      if (!isSystemAdmin && adminUser?.store_id) {
        setStores(sorted.filter(s => s.id === adminUser.store_id));
        setStoreId(adminUser.store_id);
      } else {
        setStores(sorted);
      }
    }).catch(console.error);
  }, [isSystemAdmin, adminUser]);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'email') setEmailCheck({ status: 'none', msg: '' });
  };

  const handleCheckEmail = async () => {
    if (!form.email) return;
    setEmailCheck({ status: 'checking', msg: '' });
    try {
      const res = await membersService.checkEmail(form.email);
      if (res.isDuplicate) {
        setEmailCheck({ status: 'fail', msg: '이미 등록된 이메일입니다.' });
      } else {
        setEmailCheck({ status: 'ok', msg: '사용 가능한 이메일입니다.' });
      }
    } catch {
      setEmailCheck({ status: 'fail', msg: '중복 확인 중 오류가 발생했습니다.' });
    }
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (isSystemAdmin && !storeId) { setError('매장을 선택해주세요.'); return; }
    if (emailCheck.status !== 'ok') {
      alert('이메일 중복 확인을 먼저 해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const productSummary = products.map(p => `${p.lang} ${p.series} x ${p.qty}`).join(', ');
      const member = await membersService.create({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        memberType: form.memberType,
        paymentPlanName: productSummary, // 새로 생성된 컬럼에 기록
        assignedInstructor: form.assignedInstructor || undefined,
        notes: form.notes || undefined,
        storeId: storeId || undefined,
      });
      console.log('[DEBUG] Created Member:', member);
      if (member?.id) {
        navigate(`/members/${member.id}`);
      } else {
        console.error('[DEBUG] ID is missing from created member!', member);
        navigate('/members');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || '등록 중 오류가 발생했습니다.';
      setError(msg);
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">이메일 *</label>
              <div className="flex gap-2">
                <input
                  type="email" required value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCheckEmail}
                  disabled={!form.email || emailCheck.status === 'checking'}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap border border-gray-200"
                >
                  {emailCheck.status === 'checking' ? '확인중' : '중복 확인'}
                </button>
              </div>
              {emailCheck.msg && (
                <p className={`text-[11px] mt-1 ${emailCheck.status === 'ok' ? 'text-blue-600' : 'text-red-500'}`}>
                  {emailCheck.msg}
                </p>
              )}
            </div>
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
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">매장 *</label>
              <select 
                value={storeId} 
                onChange={e => setStoreId(e.target.value)}
                disabled={!isSystemAdmin}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 disabled:bg-gray-100"
              >
                {!isSystemAdmin && stores.length === 0 && adminUser?.store_name && (
                  <option value={adminUser.store_id ?? ''}>{adminUser.store_name}</option>
                )}
                {isSystemAdmin && <option value="">매장 선택</option>}
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">구매 상품</h3>
            <button
              type="button"
              onClick={() => setProducts([...products, { id: Date.now(), lang: '한글', series: 'K1', qty: 1 }])}
              className="px-3 py-1 bg-teal-50 text-teal-700 text-xs rounded border border-teal-100 font-medium hover:bg-teal-100"
            >
              + 추가
            </button>
          </div>
          <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
            {products.map((p, idx) => (
              <div key={p.id} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 mb-0.5">언어</label>
                  <select
                    value={p.lang}
                    onChange={e => {
                      const newP = [...products];
                      newP[idx].lang = e.target.value;
                      setProducts(newP);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="한글">한글</option>
                    <option value="영어">영어</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 mb-0.5">시리즈</label>
                  <select
                    value={p.series}
                    onChange={e => {
                      const newP = [...products];
                      newP[idx].series = e.target.value;
                      setProducts(newP);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    {['K1', 'K2', 'K3', 'G1', 'G2', 'S1', 'S2'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="w-16">
                  <label className="block text-[10px] text-gray-400 mb-0.5">수량</label>
                  <input
                    type="number"
                    value={p.qty}
                    min={1}
                    onChange={e => {
                      const newP = [...products];
                      newP[idx].qty = parseInt(e.target.value) || 1;
                      setProducts(newP);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                  />
                </div>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setProducts(products.filter((_, i) => i !== idx))}
                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 mb-0.5"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
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

