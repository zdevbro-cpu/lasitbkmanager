import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { membersService } from '../../services/members.service';
import type { Member, MemberTypeHistory } from '../../services/members.service';
import { StatusBadge, TypeBadge } from '../../components/crm/MemberStatusBadge';

function fmtMoney(v: string): string {
  const digits = v.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits).toLocaleString('ko-KR') : '';
}
function parseMoney(v: string): number | null {
  const n = parseInt(v.replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}

const STATUS_TRANSITIONS: Record<string, { value: string; label: string; danger?: boolean }[]> = {
  pending:            [{ value: 'active', label: '가입 승인' }],
  active:             [
    { value: 'suspended', label: '일시중단' },
    { value: 'ended', label: '종료' },
    { value: 'pending_withdrawal', label: '탈퇴 신청', danger: true },
  ],
  suspended:          [
    { value: 'active', label: '재활성화' },
    { value: 'ended', label: '종료' },
    { value: 'pending_withdrawal', label: '탈퇴 신청', danger: true },
  ],
  pending_withdrawal: [
    { value: 'active', label: '탈퇴 철회 (재활성화)' },
    { value: 'withdrawn', label: '탈퇴 처리 확정', danger: true },
  ],
  ended:              [
    { value: 'pending_withdrawal', label: '탈퇴 신청', danger: true },
    { value: 'withdrawn', label: '탈퇴 처리 확정', danger: true },
  ],
  withdrawn:          [],
};

type EditForm = {
  name: string; phone: string; paymentPlanName: string;
  planAmount: string; planDiscountedAmt: string; paymentMethod: string;
  assignedInstructor: string; lastPaymentDate: string; nextPaymentDate: string; notes: string;
};

function memberToEditForm(m: Member): EditForm {
  return {
    name: m.name,
    phone: m.phone ?? '',
    paymentPlanName: m.payment_plan_name ?? '',
    planAmount: m.plan_amount ? m.plan_amount.toLocaleString('ko-KR') : '',
    planDiscountedAmt: m.plan_discounted_amt ? m.plan_discounted_amt.toLocaleString('ko-KR') : '',
    paymentMethod: m.payment_method ?? '',
    assignedInstructor: m.assigned_instructor ?? '',
    lastPaymentDate: m.last_payment_date?.slice(0, 10) ?? '',
    nextPaymentDate: m.next_payment_date?.slice(0, 10) ?? '',
    notes: m.notes ?? '',
  };
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<MemberTypeHistory[]>([]);
  const [tab, setTab] = useState<'info' | 'qr' | 'history'>('info');
  const [loading, setLoading] = useState(true);

  // 유형 변경 모달
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newType, setNewType] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [priceDiff, setPriceDiff] = useState('');
  const [typeLoading, setTypeLoading] = useState(false);

  // 정보 수정 모달
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      membersService.getOne(id),
      membersService.getTypeHistory(id),
    ]).then(([m, h]) => {
      setMember(m);
      setHistory(h);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!id || !member) return;
    if (status === 'withdrawn') {
      if (!confirm(`⚠️ 탈퇴 처리 확정\n\n회원의 개인정보(이름, 연락처, 이메일)가 마스킹 처리됩니다.\n이 작업은 되돌릴 수 없습니다.\n\n계속하시겠습니까?`)) return;
    } else {
      const t = STATUS_TRANSITIONS[member.member_status]?.find(x => x.value === status);
      if (!confirm(`"${t?.label ?? status}" 처리하시겠습니까?`)) return;
    }
    try {
      const updated = await membersService.changeStatus(id, status);
      setMember(updated);
    } catch (e) {
      alert(String(e));
    }
  };

  const handleTypeChange = async () => {
    if (!id || !newType || !changeReason) return;
    setTypeLoading(true);
    try {
      const updated = await membersService.changeType(id, newType, changeReason,
        priceDiff ? parseInt(priceDiff) : undefined);
      setMember(updated);
      const h = await membersService.getTypeHistory(id);
      setHistory(h);
      setShowTypeModal(false);
      setChangeReason(''); setPriceDiff('');
    } catch (e) {
      alert(String(e));
    } finally {
      setTypeLoading(false);
    }
  };

  const openEditModal = () => {
    if (!member) return;
    setEditForm(memberToEditForm(member));
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!id || !editForm) return;
    setEditLoading(true); setEditError('');
    try {
      const updated = await membersService.update(id, {
        name: editForm.name || undefined,
        phone: editForm.phone || null,
        paymentPlanName: editForm.paymentPlanName || null,
        planAmount: parseMoney(editForm.planAmount),
        planDiscountedAmt: parseMoney(editForm.planDiscountedAmt),
        paymentMethod: editForm.paymentMethod || null,
        assignedInstructor: editForm.assignedInstructor || null,
        lastPaymentDate: editForm.lastPaymentDate || null,
        nextPaymentDate: editForm.nextPaymentDate || null,
        notes: editForm.notes || null,
      });
      setMember(updated);
      setShowEditModal(false);
    } catch (e) {
      setEditError(String(e));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!member?.member_qr_code || !id) return;
    try {
      const imgBlob = await membersService.getQrImageBlob(id);
      const imgObjectUrl = URL.createObjectURL(imgBlob);
      const padding = 40;
      const qrSize = 300;
      const canvas = document.createElement('canvas');
      canvas.width = qrSize + padding * 2;
      canvas.height = qrSize + 90 + padding * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, padding, padding, qrSize, qrSize);
        URL.revokeObjectURL(imgObjectUrl);
        const cx = canvas.width / 2;
        const ty = padding + qrSize + 24;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 22px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
        ctx.fillText(member.name, cx, ty);
        ctx.fillStyle = '#6366f1';
        ctx.font = '16px monospace';
        ctx.fillText(member.member_qr_code!, cx, ty + 30);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px sans-serif';
        ctx.fillText(member.member_number, cx, ty + 54);
        canvas.toBlob(blob => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${member.member_qr_code}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }, 'image/png');
      };
      img.src = imgObjectUrl;
    } catch (e) {
      alert('이미지 저장 실패: ' + String(e));
    }
  };

  const handlePrintQr = () => {
    if (!member?.member_qr_code || !id) return;
    const imgUrl = `${window.location.origin}/api/v1/members/${id}/qr-image`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>회원 QR - ${member.member_qr_code}</title>
<style>
  body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
  .card { text-align: center; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px; }
  img { width: 220px; height: 220px; display: block; margin: 0 auto 16px; }
  .name { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 6px; }
  .code { font-size: 14px; font-family: monospace; color: #6366f1; margin-bottom: 4px; }
  .num  { font-size: 12px; color: #9ca3af; }
  @media print { body { min-height: auto; } .card { border: none; } }
</style></head><body>
<div class="card">
  <img id="qr" src="${imgUrl}" />
  <div class="name">${member.name}</div>
  <div class="code">${member.member_qr_code}</div>
  <div class="num">${member.member_number}</div>
</div>
<script>
  document.getElementById('qr').onload = function() { window.print(); };
  document.getElementById('qr').onerror = function() { alert('이미지 로드 실패'); };
<\/script>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (!win) { alert('팝업이 차단되었습니다. 팝업을 허용해주세요.'); }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">로딩중...</div>;
  if (!member) return <div className="text-sm text-red-500 py-10 text-center">회원을 찾을 수 없습니다.</div>;

  const transitions = STATUS_TRANSITIONS[member.member_status] ?? [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/members')} className="text-gray-400 hover:text-gray-600 text-sm">← 목록</button>
        <h2 className="text-xl font-semibold text-gray-900">{member.name}</h2>
        <TypeBadge type={member.member_type} />
        <StatusBadge status={member.member_status} />
      </div>

      {/* 탈퇴 관련 경고 배너 */}
      {member.member_status === 'pending_withdrawal' && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>탈퇴 신청 상태입니다. 태블릿 반납 확인 후 탈퇴를 확정하거나, 철회할 수 있습니다.</span>
        </div>
      )}
      {member.member_status === 'withdrawn' && (
        <div className="mb-4 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 flex items-center gap-2">
          <span>🔒</span>
          <span>탈퇴 처리된 회원입니다. 개인정보가 마스킹되어 있습니다.</span>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {transitions.map(t => (
          <button key={t.value} onClick={() => handleStatusChange(t.value)}
            className={`px-3 py-1.5 border rounded-lg text-sm ${
              t.danger
                ? 'border-red-300 text-red-600 hover:bg-red-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
        {member.member_status !== 'withdrawn' && (
          <button onClick={() => { setNewType(member.member_type === 'managed' ? 'subscription' : 'managed'); setShowTypeModal(true); }}
            className="px-3 py-1.5 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50">
            유형 변경
          </button>
        )}
        <button onClick={openEditModal}
          className="px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50 ml-auto">
          정보 수정
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['info', 'qr', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'info' ? '기본 정보' : t === 'qr' ? '회원 QR' : '유형 변경 이력'}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Item label="회원번호" value={member.member_number} />
            <Item label="회원 QR" value={member.member_qr_code ?? '-'} />
            <Item label="이메일" value={member.email} />
            <Item label="연락처" value={member.phone ?? '-'} />
            <Item label="가입일" value={member.joined_at?.slice(0, 10) ?? '-'} />
            <Item label="플랜" value={member.payment_plan_name ?? '-'} />
            <Item label="결제 수단" value={member.payment_method ?? '-'} />
            <Item label="정상가" value={member.plan_amount ? `${member.plan_amount.toLocaleString()}원` : '-'} />
            <Item label="실결제가" value={member.plan_discounted_amt ? `${member.plan_discounted_amt.toLocaleString()}원` : '-'} />
            <Item label="최근 결제일" value={member.last_payment_date?.slice(0, 10) ?? '-'} />
            <Item label="다음 결제일" value={member.next_payment_date?.slice(0, 10) ?? '-'} />
            <Item label="태블릿" value={member.tablet_qr_code ? `${member.tablet_qr_code} (${member.tablet_model ?? ''})` : '미배정'} />
            {member.member_type === 'managed' && <Item label="담당 강사" value={member.assigned_instructor ?? '-'} />}
            {member.notes && <div className="col-span-2"><Item label="비고" value={member.notes} /></div>}
          </dl>
        </div>
      )}

      {tab === 'qr' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-5">
          {member.member_qr_code ? (
            <>
              <img
                src={membersService.getQrImageUrl(id!)}
                alt={member.member_qr_code}
                className="w-48 h-48 border border-gray-100 rounded-lg"
              />
              <div className="text-center">
                <p className="font-mono font-bold text-gray-900 text-lg">{member.member_qr_code}</p>
                <p className="text-sm text-gray-500 mt-0.5">{member.member_number} · {member.name}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrintQr}
                  className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  QR 인쇄
                </button>
                <button onClick={handleDownloadQr}
                  className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                  이미지 저장
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                이 QR 코드는 회원 전용 식별 코드입니다.<br />태블릿 대여/반납 시 사용하거나 회원증으로 활용할 수 있습니다.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">QR 코드가 없습니다.</p>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">유형 변경 이력이 없습니다.</p>
          ) : history.map(h => (
            <div key={h.id} className="px-6 py-4">
              <div className="flex items-center gap-2 text-sm">
                <TypeBadge type={h.previous_type} />
                <span className="text-gray-400">→</span>
                <TypeBadge type={h.new_type} />
                <span className="text-gray-400 text-xs ml-auto">{h.changed_at.slice(0, 10)}</span>
              </div>
              {h.change_reason && <p className="text-xs text-gray-500 mt-1">사유: {h.change_reason}</p>}
              {h.price_diff_krw != null && (
                <p className="text-xs text-gray-500">요금 차액: {h.price_diff_krw.toLocaleString()}원/월</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 유형 변경 모달 */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">회원 유형 변경</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">변경 유형</label>
                <select value={newType} onChange={e => setNewType(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="subscription">구독회원</option>
                  <option value="managed">관리회원</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">변경 사유 *</label>
                <input value={changeReason} onChange={e => setChangeReason(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="변경 사유를 입력하세요" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">요금 차액 (원/월)</label>
                <input type="number" value={priceDiff} onChange={e => setPriceDiff(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="예: 100000" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowTypeModal(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleTypeChange} disabled={typeLoading || !changeReason}
                className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                {typeLoading ? '변경 중...' : '변경 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정보 수정 모달 */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">회원 정보 수정</h3>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {editError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{editError}</p>}
              <div className="grid grid-cols-2 gap-4">
                <EField label="이름 *" value={editForm.name} onChange={v => setEditForm(f => f && ({ ...f, name: v }))} />
                <EField label="연락처" value={editForm.phone} onChange={v => setEditForm(f => f && ({ ...f, phone: v }))} placeholder="010-0000-0000" />
                <EField label="플랜명" value={editForm.paymentPlanName} onChange={v => setEditForm(f => f && ({ ...f, paymentPlanName: v }))} />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">결제 수단</label>
                  <select value={editForm.paymentMethod}
                    onChange={e => setEditForm(f => f && ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">선택 안 함</option>
                    <option value="card">카드</option>
                    <option value="transfer">계좌이체</option>
                    <option value="cash">현금</option>
                  </select>
                </div>
                <EMoneyField label="정상가" value={editForm.planAmount} onChange={v => setEditForm(f => f && ({ ...f, planAmount: fmtMoney(v) }))} />
                <EMoneyField label="실결제가" value={editForm.planDiscountedAmt} onChange={v => setEditForm(f => f && ({ ...f, planDiscountedAmt: fmtMoney(v) }))} />
                <EField label="최근 결제일" type="date" value={editForm.lastPaymentDate} onChange={v => setEditForm(f => f && ({ ...f, lastPaymentDate: v }))} />
                <EField label="다음 결제일" type="date" value={editForm.nextPaymentDate} onChange={v => setEditForm(f => f && ({ ...f, nextPaymentDate: v }))} />
                {member.member_type === 'managed' && (
                  <EField label="담당 강사" value={editForm.assignedInstructor} onChange={v => setEditForm(f => f && ({ ...f, assignedInstructor: v }))} />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">비고</label>
                <textarea value={editForm.notes}
                  onChange={e => setEditForm(f => f && ({ ...f, notes: e.target.value }))}
                  rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
              <button onClick={() => setShowEditModal(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleEditSave} disabled={editLoading || !editForm.name}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                {editLoading ? '저장 중...' : '저장'}
              </button>
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

function EField({ label, type = 'text', value, onChange, placeholder }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function EMoneyField({ label, value, onChange }: {
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
