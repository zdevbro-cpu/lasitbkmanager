import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QrCode, ScanLine, RotateCcw, CheckCircle2, Tablet } from 'lucide-react';
import { tabletsService } from '../../services/tablets.service';
import { membersService } from '../../services/members.service';
import type { Tablet as TabletType } from '../../services/tablets.service';
import type { Member } from '../../services/members.service';
import { TabletStatusBadge } from '../../components/mdm/TabletStatusBadge';
import { StatusBadge, TypeBadge } from '../../components/crm/MemberStatusBadge';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';

// QR 스캐너가 한글 IME 모드로 입력될 때 한글 → 영문 역변환
const KOR_MAP: Record<string, string> = {
  'ㅂ':'q','ㅈ':'w','ㄷ':'e','ㄱ':'r','ㅅ':'t','ㅛ':'y','ㅕ':'u','ㅑ':'i','ㅐ':'o','ㅔ':'p',
  'ㅁ':'a','ㄴ':'s','ㅇ':'d','ㄹ':'f','ㅎ':'g','ㅗ':'h','ㅓ':'j','ㅏ':'k','ㅣ':'l',
  'ㅋ':'z','ㅌ':'x','ㅊ':'c','ㅍ':'v','ㅠ':'b','ㅜ':'n','ㅡ':'m',
  'ㅃ':'q','ㅉ':'w','ㄸ':'e','ㄲ':'r','ㅆ':'t','ㅖ':'o','ㅒ':'p',
};
const deKorean = (v: string) => [...v].map(c => KOR_MAP[c] ?? c).join('');

type Step = 'scan' | 'loan' | 'return' | 'done';
type DoneType = 'loaned' | 'returned';

export default function TabletLoanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser } = useAuth();

  // ── 큐 (TabletList에서 체크박스 선택 후 진입 시) ──────────────
  const navState = location.state as { preloaded?: string[] } | null;
  const [queue] = useState<string[]>(() => navState?.preloaded ?? []);
  const [queueIdx, setQueueIdx] = useState(0);
  const autoProcessed = useRef(false);

  const [step, setStep] = useState<Step>('scan');
  const [doneType, setDoneType] = useState<DoneType>('loaned');
  const [qrInput, setQrInput] = useState('');
  const [tablet, setTablet] = useState<TabletType | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [conditionOk, setConditionOk] = useState(true);
  const [conditionNotes, setConditionNotes] = useState('');
  const [loanOfficer, setLoanOfficer] = useState('');
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState('');

  // ── 회원 QR 입력 ─────────────────────────────────────────────
  const [memberQrInput, setMemberQrInput] = useState('');
  const [memberQrLoading, setMemberQrLoading] = useState(false);
  const [memberQrError, setMemberQrError] = useState('');

  const processMemberQr = useCallback(async (code: string) => {
    const normalized = deKorean(code.trim()).toUpperCase();
    if (!normalized) return;
    setMemberQrLoading(true); setMemberQrError('');
    try {
      const m = await membersService.getByQr(normalized);
      setSelectedMember(m);
      // 스캔 성공 시 입력창에 회원번호 + 이름 표시 (다음 스캔 전까지 유지)
      setMemberQrInput(`${m.member_number} ${m.name}`);
      setMembers(prev => prev.some(x => x.id === m.id) ? prev : [m, ...prev]);
    } catch {
      setMemberQrError(`QR(${normalized})에 해당하는 회원을 찾을 수 없습니다.`);
    } finally {
      setMemberQrLoading(false);
    }
  }, []);

  // ── 회원 목록 로드 ─────────────────────────────────────────
  const loadMembers = useCallback(async (search: string) => {
    setMembersLoading(true);
    try {
      const result = await membersService.list({
        search: search || undefined,
        status: 'active',
        limit: 30,
      } as Record<string, string | number>);
      setMembers(result.data);
    } catch { setMembers([]); }
    finally { setMembersLoading(false); }
  }, []);

  useEffect(() => { if (step === 'loan') loadMembers(''); }, [step, loadMembers]);

  // adminUser 로드 후 대여담당자 기본값 세팅 (한 번만)
  useEffect(() => {
    if (adminUser?.name) setLoanOfficer(prev => prev || adminUser.name);
  }, [adminUser]);

  // ── QR 코드 처리 ───────────────────────────────────────────
  const processQrCode = useCallback(async (code: string) => {
    const normalized = deKorean(code.trim()).toUpperCase();
    setQrInput(normalized);
    setLoading(true); setError('');
    try {
      const t = await tabletsService.getByQr(normalized);
      setTablet(t);
      setStep(t.status === 'loaned' ? 'return' : 'loan');
    } catch {
      setError('해당 QR 코드의 태블릿을 찾을 수 없습니다.');
    } finally { setLoading(false); }
  }, []);

  const handleQrScan = () => processQrCode(qrInput);

  // ── 큐 자동 처리 ───────────────────────────────────────────
  useEffect(() => {
    if (!autoProcessed.current && queue.length > 0) {
      autoProcessed.current = true;
      void processQrCode(queue[0]);
    }
  }, [queue, processQrCode]);

  const advanceQueue = () => {
    const next = queueIdx + 1;
    setStep('scan'); setQrInput(''); setTablet(null);
    setSelectedMember(null); setMembers([]); setMemberSearch('');
    setMemberQrInput(''); setMemberQrError('');
    setConditionOk(true); setConditionNotes(''); setError('');
    setQueueIdx(next);
    if (next < queue.length) void processQrCode(queue[next]);
  };

  // ── 대여 / 반납 ────────────────────────────────────────────
  const handleLoan = async () => {
    if (!tablet || !selectedMember) return;
    setLoading(true); setError('');
    try {
      await tabletsService.loan(tablet.id, selectedMember.id, loanOfficer || undefined);
      setDoneType('loaned');
      setStep('done');
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const handleReturn = async () => {
    if (!tablet) return;
    setLoading(true); setError('');
    try {
      await tabletsService.return(tablet.id, conditionOk, conditionNotes || undefined);
      setDoneType('returned');
      setStep('done');
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setStep('scan'); setQrInput(''); setTablet(null);
    setSelectedMember(null); setMembers([]); setMemberSearch('');
    setMemberQrInput(''); setMemberQrError('');
    setConditionOk(true); setConditionNotes(''); setError('');
    setLoanOfficer(adminUser?.name ?? '');
  };

  // ── 태블릿 정보 한 줄 바 ───────────────────────────────────
  const TabletInfoBar = () => {
    if (!tablet) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-4 flex-wrap">
        <Tablet size={16} className="text-gray-400 shrink-0" />
        <span className="font-mono font-bold text-gray-900 text-sm">{tablet.qr_code}</span>
        <TabletStatusBadge status={tablet.status} />
        {tablet.model_name && <span className="text-sm text-gray-600">{tablet.model_name}</span>}
        {tablet.serial_number && (
          <span className="text-xs text-gray-400 font-mono">S/N: {tablet.serial_number}</span>
        )}
        {tablet.status === 'loaned' && tablet.member_name && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-blue-600 font-medium">{tablet.member_name}</span>
            {tablet.loan_start_date && (
              <span className="text-xs text-gray-400">대여일: {tablet.loan_start_date.slice(0, 10)}</span>
            )}
          </>
        )}
        <button onClick={reset}
          className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <RotateCcw size={12} /> 재스캔
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/tablets')}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-gray-900">태블릿 대여 / 반납</h2>
        {queue.length > 1 && (
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            {queueIdx + 1} / {queue.length}
          </span>
        )}
      </div>

      {/* ── STEP 1: QR 스캔 ── */}
      {step === 'scan' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <ScanLine size={32} className="text-blue-600" />
            </div>
            <p className="text-gray-700 font-medium mb-1">태블릿 QR 코드 스캔</p>
            <p className="text-sm text-gray-400 mb-6">QR 리더기로 스캔하거나 코드를 직접 입력하세요.</p>

            {error && (
              <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-2 w-full max-w-sm">
              <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <QrCode size={16} className="text-gray-400 shrink-0" />
                <input
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleQrScan()}
                  placeholder="TAB-000001"
                  className="flex-1 py-2.5 text-sm font-mono uppercase outline-none bg-transparent"
                  autoFocus
                />
              </div>
              <button onClick={handleQrScan} disabled={loading || !qrInput.trim()}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {loading ? '조회중...' : '조회'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: 대여 ── */}
      {step === 'loan' && tablet && (
        <div>
          <TabletInfoBar />
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <p className="text-sm font-medium text-gray-700 flex-1">대여 회원 선택</p>
              {selectedMember && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  선택: {selectedMember.name}
                </span>
              )}
            </div>

            {/* 회원 QR 스캔 */}
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50">
              <p className="text-xs font-medium text-blue-700 mb-1.5">회원 QR 코드로 바로 선택</p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center border border-blue-200 rounded-lg px-3 gap-2 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                  <QrCode size={14} className="text-blue-400 shrink-0" />
                  <input
                    value={memberQrInput}
                    onChange={e => setMemberQrInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && memberQrInput.trim() && processMemberQr(memberQrInput)}
                    placeholder="MBR-000001 스캔 또는 입력"
                    className="flex-1 py-2 text-sm font-mono outline-none bg-transparent"
                    autoComplete="off"
                  />
                </div>
                <button onClick={() => memberQrInput.trim() && processMemberQr(memberQrInput)}
                  disabled={memberQrLoading || !memberQrInput.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40">
                  {memberQrLoading ? '조회중...' : '확인'}
                </button>
              </div>
              {memberQrError && <p className="text-xs text-red-500 mt-1">{memberQrError}</p>}
            </div>

            {/* 이름/이메일 검색 */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex gap-2">
                <input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadMembers(memberSearch)}
                  placeholder="이름, 이메일, 회원번호 검색"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={() => loadMembers(memberSearch)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                  검색
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {membersLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">로딩중...</div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">활성 회원이 없습니다.</div>
              ) : members.map(m => {
                const isSelected = selectedMember?.id === m.id;
                return (
                  <div key={m.id}
                    onClick={() => setSelectedMember(isSelected ? null : m)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.member_number} · {m.email}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <TypeBadge type={m.member_type} />
                      <StatusBadge status={m.member_status} />
                    </div>
                    {m.current_tablet_id && (
                      <span className="text-xs text-orange-500 font-medium shrink-0">태블릿 보유</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">
                대여담당자 (이름 또는 QR 스캔)
                {adminUser?.role && (
                  <span className="ml-1 text-gray-400">({ROLE_LABELS[adminUser.role]})</span>
                )}
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 gap-2 focus-within:ring-2 focus-within:ring-blue-500">
                <QrCode size={14} className="text-gray-400 shrink-0" />
                <input
                  value={loanOfficer}
                  onChange={e => setLoanOfficer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      // QR 스캐너 입력 대응 (영문 변환)
                      const code = deKorean(loanOfficer.trim()).toUpperCase();
                      if (code.startsWith('LAS')) {
                        setLoanOfficer(code);
                      }
                    }
                  }}
                  placeholder="담당자 이름 또는 QR 스캔"
                  className="w-full py-2 text-sm outline-none bg-transparent"
                />
              </div>
            </div>
            <button onClick={handleLoan} disabled={!selectedMember || loading}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium whitespace-nowrap">
              {loading ? '처리중...' : `대여 등록${selectedMember ? ` — ${selectedMember.name}` : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: 반납 ── */}
      {step === 'return' && tablet && (
        <div>
          <TabletInfoBar />
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-700 mb-4">기기 상태 확인</p>
            <div className="flex gap-4 mb-4">
              {([true, false] as const).map(v => (
                <label key={String(v)}
                  className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors
                    ${conditionOk === v
                      ? (v ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50')
                      : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${conditionOk === v
                      ? (v ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500')
                      : 'border-gray-300'}`}>
                    {conditionOk === v && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <input type="radio" className="sr-only" checked={conditionOk === v} onChange={() => setConditionOk(v)} />
                  <span className={`text-sm font-medium ${conditionOk === v ? (v ? 'text-green-700' : 'text-red-600') : 'text-gray-600'}`}>
                    {v ? '정상' : '손상'}
                  </span>
                </label>
              ))}
            </div>
            {!conditionOk && (
              <textarea value={conditionNotes} onChange={e => setConditionNotes(e.target.value)}
                placeholder="손상 내용을 입력하세요" rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={handleReturn} disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
              {loading ? '처리중...' : '반납 완료'}
            </button>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {step === 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-1">
            {doneType === 'loaned' ? '대여 완료' : '반납 완료'}
          </p>
          <p className="text-sm text-gray-500 mb-2">
            {tablet?.qr_code} 태블릿이 정상적으로 처리되었습니다.
          </p>
          {doneType === 'loaned' && selectedMember && (
            <p className="text-sm text-blue-600 font-medium mb-1">대여 회원: {selectedMember.name}</p>
          )}
          {doneType === 'loaned' && loanOfficer && (
            <p className="text-xs text-gray-400 mb-2">담당자: {loanOfficer}</p>
          )}
          {queue.length > 1 && (
            <p className="text-xs text-gray-400 mb-6">
              {queueIdx + 1} / {queue.length} 처리 완료
            </p>
          )}
          <div className="flex gap-2 justify-center">
            {queueIdx + 1 < queue.length ? (
              <>
                <button onClick={() => navigate('/tablets')}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  목록으로
                </button>
                <button onClick={advanceQueue}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  다음 처리 ({queue.length - queueIdx - 1}개 남음)
                </button>
              </>
            ) : (
              <>
                <button onClick={reset}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  계속 처리
                </button>
                <button onClick={() => navigate('/tablets')}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  목록으로
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
