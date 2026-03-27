import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScanLine, RotateCcw, CheckCircle2, Tablet } from 'lucide-react';
import { isAxiosError } from 'axios';
import { tabletsService } from '../../services/tablets.service';
import { membersService } from '../../services/members.service';
import { staffService } from '../../services/staff.service';
import type { Tablet as TabletType } from '../../services/tablets.service';
import type { Member } from '../../services/members.service';
import { TabletStatusBadge } from '../../components/mdm/TabletStatusBadge';
import { StatusBadge, TypeBadge } from '../../components/crm/MemberStatusBadge';
import { useAuth } from '../../context/AuthContext';

// QR 스캐너가 한글 IME 모드로 입력될 때 한글 → 영문 역변환
const KOR_MAP: Record<string, string> = {
  'ㅂ':'q','ㅈ':'w','ㄷ':'e','ㄱ':'r','ㅅ':'t','ㅛ':'y','ㅕ':'u','ㅑ':'i','ㅐ':'o','ㅔ':'p',
  'ㅁ':'a','ㄴ':'s','ㅇ':'d','ㄹ':'f','ㅎ':'g','ㅗ':'h','ㅓ':'j','ㅏ':'k','ㅣ':'l',
  'ㅋ':'z','ㅌ':'x','ㅊ':'c','ㅍ':'v','ㅠ':'b','ㅜ':'n','ㅡ':'m',
  'ㅃ':'q','ㅉ':'w','ㄸ':'e','ㄲ':'r','ㅆ':'t','ㅖ':'o','ㅒ':'p',
  'ㅄ':'q','ㄵ':'n','ㄶ':'n','ㄳ':'r','ㄺ':'f','ㄻ':'f','ㄼ':'f','ㄽ':'f','ㄾ':'f','ㄿ':'f','ㅀ':'f','ㅘ':'h','ㅙ':'h','ㅚ':'h','ㅝ':'n','ㅞ':'n','ㅟ':'n','ㅢ':'m',
};
const deKorean = (v: string) => {
  // 한글 호환 자음/모음 (Decomposition)
  const result = [];
  for (const c of v) {
    const code = c.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7AF) { // 한글 완성형
      const base = code - 0xAC00;
      const j1 = Math.floor(base / 588); // 초성
      const j2 = Math.floor((base % 588) / 28); // 중성
      const j3 = base % 28; // 종성
      const CJ = [0x3131, 0x3132, 0x3134, 0x3137, 0x3138, 0x3139, 0x3141, 0x3142, 0x3143, 0x3145, 0x3146, 0x3147, 0x3148, 0x314A, 0x314B, 0x314C, 0x314D, 0x314E];
      const MJ = [0x314F, 0x3150, 0x3151, 0x3152, 0x3153, 0x3154, 0x3155, 0x3156, 0x3157, 0x3158, 0x3159, 0x315A, 0x315B, 0x315C, 0x315D, 0x315E, 0x315F, 0x3160, 0x3161, 0x3162, 0x3163];
      const TJ = [0, 0x3131, 0x3132, 0x3133, 0x3134, 0x3135, 0x3136, 0x3137, 0x3139, 0x313A, 0x313B, 0x313C, 0x313D, 0x313E, 0x313F, 0x3140, 0x3141, 0x3142, 0x3144, 0x3145, 0x3146, 0x3147, 0x3148, 0x3149, 0x314A, 0x314B, 0x314C, 0x314E];
      result.push(KOR_MAP[String.fromCharCode(CJ[j1])] ?? '');
      result.push(KOR_MAP[String.fromCharCode(MJ[j2])] ?? '');
      if (j3 > 0) result.push(KOR_MAP[String.fromCharCode(TJ[j3])] ?? '');
    } else {
      result.push(KOR_MAP[c] ?? c);
    }
  }
  return result.join('');
};

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
  const [loanOfficerId, setLoanOfficerId] = useState<string | null>(null);
  const [officerVerified, setOfficerVerified] = useState<boolean | null>(null); // null=미확인, true=DB확인, false=미등록(직접입력)
  const [officerLoading, setOfficerLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState('');
  
  const tabletQrRef = useRef<HTMLInputElement>(null);
  const memberQrRef = useRef<HTMLInputElement>(null);
  const loanOfficerRef = useRef<HTMLInputElement>(null);

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
      // 스캔 성공 시 입력창에 회원이름(고유번호) 표시
      const displayStr = `${m.name} (${m.member_number})`;
      setMemberQrInput(displayStr);
      if (memberQrRef.current) memberQrRef.current.value = displayStr;
      
      setMembers(prev => prev.some(x => x.id === m.id) ? prev : [m, ...prev]);
      // 대여담당자 입력창으로 포커스 이동
      setTimeout(() => loanOfficerRef.current?.focus(), 100);
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

  useEffect(() => { 
    if (step === 'loan' || step === 'scan') {
      loadMembers(''); 
      // 회원 QR 입력창으로 포커스 이동 (대여 단계일 때만)
      if (step === 'loan') {
        setTimeout(() => memberQrRef.current?.focus(), 100);
      }
    }
  }, [step, loadMembers]);

  // adminUser 로드 후 대여담당자 기본값 세팅 안함 (사용자 요청에 따라 비움)
  useEffect(() => {
    // if (adminUser?.name) setLoanOfficer(prev => prev || adminUser.name);
  }, [adminUser]);

  // ── QR / 바코드 처리 ─────────────────────────────────────
  // 한글 IME로 스캔된 QR은 deKorean 역변환, 시리얼 바코드(영문)는 그대로 사용
  const processQrCode = useCallback(async (code: string) => {
    const raw = code.trim();
    // 한글이 포함된 경우 → QR 스캐너 IME 오입력, 역변환
    const normalized = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(raw)
      ? deKorean(raw).toUpperCase()
      : raw.toUpperCase();
    setQrInput(normalized);
    if (tabletQrRef.current) tabletQrRef.current.value = normalized;
    setLoading(true); setError('');
    try {
      const t = await tabletsService.getByQr(normalized);
      setTablet(t);
      setStep(t.status === 'loaned' ? 'return' : 'loan');
    } catch {
      setError(`"${normalized}" — QR코드 또는 시리얼 번호로 태블릿을 찾을 수 없습니다.`);
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
    setStep('scan'); 
    setQrInput(''); if (tabletQrRef.current) tabletQrRef.current.value = '';
    setTablet(null);
    setSelectedMember(null); setMembers([]); setMemberSearch('');
    setMemberQrInput(''); if (memberQrRef.current) memberQrRef.current.value = '';
    setMemberQrError('');
    setConditionOk(true); setConditionNotes(''); setError('');
    setLoanOfficer(''); setLoanOfficerId(null); setOfficerVerified(null);
    if (loanOfficerRef.current) loanOfficerRef.current.value = '';
    setQueueIdx(next);
    if (next < queue.length) void processQrCode(queue[next]);
  };

  const lookupOfficer = async () => {
    const val = loanOfficerRef.current?.value.trim() || '';
    if (!val) return;
    setOfficerLoading(true);

    if (/[가-힣]/.test(val)) {
      // 한글 → 이름으로 직원 조회
      try {
        const s = await staffService.getByName(val);
        const formatted = `${s.name} (${s.referral_code || s.email})`;
        setLoanOfficer(formatted);
        setLoanOfficerId(s.id);
        setOfficerVerified(true);
        if (loanOfficerRef.current) loanOfficerRef.current.value = formatted;
      } catch {
        // 미등록 직원 → 텍스트 그대로 허용
        setLoanOfficer(val);
        setLoanOfficerId(null);
        setOfficerVerified(false);
      }
    } else {
      // 영문/숫자 → QR 코드로 직원 조회
      const code = deKorean(val).trim().toUpperCase();
      if (loanOfficerRef.current) loanOfficerRef.current.value = code;
      const searchCode = code.startsWith('AAS') ? 'LAS' + code.slice(3) : code;
      try {
        const s = await staffService.getByQr(searchCode);
        const formatted = `${s.name} (${s.referral_code || searchCode})`;
        setLoanOfficer(formatted);
        setLoanOfficerId(s.id);
        setOfficerVerified(true);
        if (loanOfficerRef.current) loanOfficerRef.current.value = formatted;
      } catch {
        // QR 미인식 → 텍스트 그대로 허용
        setLoanOfficer(searchCode);
        setLoanOfficerId(null);
        setOfficerVerified(false);
      }
    }
    setOfficerLoading(false);
  };

  const handleLoan = async () => {
    // 확인 버튼 안 눌렀어도 ref의 현재 값 사용
    const currentOfficerName = loanOfficer.trim() || loanOfficerRef.current?.value.trim() || '';
    if (!tablet || (!selectedMember && !currentOfficerName)) return;
    setLoading(true); setError('');
    try {
      await tabletsService.loan(
        tablet.id,
        selectedMember?.id ?? null,
        loanOfficerId || undefined,
        currentOfficerName || undefined,
      );
      setDoneType('loaned');
      setStep('done');
    } catch (e) {
      if (isAxiosError(e)) {
        setError(e.response?.data?.error || e.message);
      } else {
        setError(String(e));
      }
    } finally { setLoading(false); }
  };

  const handleReturn = async () => {
    if (!tablet) return;
    setLoading(true); setError('');
    try {
      await tabletsService.return(tablet.id, conditionOk, conditionNotes || undefined);
      setDoneType('returned');
      setStep('done');
    } catch (e) {
      if (isAxiosError(e)) {
        setError(e.response?.data?.error || e.message);
      } else {
        setError(String(e));
      }
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep('scan'); 
    setQrInput(''); if (tabletQrRef.current) tabletQrRef.current.value = '';
    setTablet(null);
    setSelectedMember(null); setMembers([]); setMemberSearch('');
    setMemberQrInput(''); if (memberQrRef.current) memberQrRef.current.value = '';
    setMemberQrError('');
    setConditionOk(true); setConditionNotes(''); setError('');
    setLoanOfficer(''); setLoanOfficerId(null); setOfficerVerified(null);
    if (loanOfficerRef.current) loanOfficerRef.current.value = '';
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

      {/* ── 항상 노출되는 상단 QR 스캔 영역 (완료 전) ── */}
      {step !== 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 shadow-sm">
          <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
            <ScanLine size={16} className="text-blue-600" /> 태블릿 QR / 바코드 스캔
            <span className="text-xs font-normal text-gray-400">(QR코드 또는 시리얼 번호 바코드)</span>
          </p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-gray-50">
              <input
                ref={tabletQrRef}
                defaultValue={qrInput}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = tabletQrRef.current?.value || '';
                    if (!val) return;
                    // 한글이면 IME 역변환, 아니면 그대로
                    const code = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(val)
                      ? deKorean(val).trim().toUpperCase()
                      : val.trim().toUpperCase();
                    if (tabletQrRef.current) tabletQrRef.current.value = code;
                    setQrInput(code);
                    processQrCode(code);
                  }
                }}
                className="flex-1 py-2.5 text-sm font-mono uppercase outline-none bg-transparent"
                autoFocus={!tablet}
                placeholder="QR코드 또는 시리얼 바코드 스캔"
              />
            </div>
            <button onClick={handleQrScan} disabled={loading || !qrInput.trim()}
              className="px-6 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50 font-medium whitespace-nowrap">
              {loading ? '조회중...' : '조회'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2 font-medium">{error}</p>}
        </div>
      )}

      {/* ── 태블릿 정보 및 폼 영역 ── */}
      {step !== 'done' && (
        <div>
          {tablet && queue.length > 0 && (
            <>
              <TabletInfoBar />
              
              {/* 기기 상태 통합 체크 폼 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
              기기 상태 확인 <span className="text-xs font-normal text-gray-500">(대여/반납 전 필수)</span>
            </p>
            <div className="flex gap-4 mb-3">
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
                    {v ? '정상 기기' : '파손 / 불량 기기'}
                  </span>
                </label>
              ))}
            </div>
            {!conditionOk && (
              <textarea value={conditionNotes} onChange={e => setConditionNotes(e.target.value)}
                placeholder="파손 또는 특이사항을 상세히 기록하세요..." rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            )}
          </div>
          </>
          )}

          {/* 대여 UI */}
          {(step === 'scan' || step === 'loan') && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <p className="text-sm font-bold text-gray-800">대여 처리 (회원 선택)</p>
                {selectedMember && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                    <CheckCircle2 size={12} /> {selectedMember.name} (선택됨)
                  </span>
                )}
              </div>

              {/* 회원 QR 스캔 */}
              <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/30">
                <p className="text-xs font-bold text-blue-700 mb-2">회원 QR 스캔</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center border border-blue-200 rounded-lg px-3 gap-2 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                    <ScanLine size={16} className="text-blue-400 shrink-0" />
                    <input
                      ref={memberQrRef}
                      defaultValue={memberQrInput}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = memberQrRef.current?.value || '';
                          if (!val) return;
                          const code = deKorean(val).trim().toUpperCase();
                          if (memberQrRef.current) memberQrRef.current.value = code;
                          processMemberQr(code);
                        }
                      }}
                      className="flex-1 py-2 text-sm font-mono outline-none bg-transparent"
                      placeholder="회원증 QR 스캔"
                      autoComplete="off"
                    />
                  </div>
                  <button onClick={() => memberQrInput.trim() && processMemberQr(memberQrInput)}
                    disabled={memberQrLoading || !memberQrInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium">
                    {memberQrLoading ? '조회중...' : '조회'}
                  </button>
                </div>
                {memberQrError && <p className="text-xs text-red-500 mt-1 font-medium">{memberQrError}</p>}
              </div>

              {/* 이름/이메일 검색 */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                 <p className="text-xs font-medium text-gray-500 mb-2">또는 이름 검색</p>
                <div className="flex gap-2">
                  <input
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadMembers(memberSearch)}
                    placeholder="회원 이름 입력..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button onClick={() => loadMembers(memberSearch)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                    목록 검색
                  </button>
                </div>
              </div>

              {/* 회원 목록 */}
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto w-full">
                {membersLoading ? (
                  <div className="py-8 text-center text-sm text-gray-400">로딩중...</div>
                ) : members.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">목록이 없습니다. 검색해 주세요.</div>
                ) : members.map(m => {
                  const isSelected = selectedMember?.id === m.id;
                  return (
                    <div key={m.id}
                      onClick={() => setSelectedMember(isSelected ? null : m)}
                      className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors
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
                        <p className="text-sm font-bold text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500 truncate">{m.member_number} · {m.email}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <TypeBadge type={m.member_type} />
                        <StatusBadge status={m.member_status} />
                      </div>
                      {m.current_tablet_id && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-bold shrink-0">태블릿 보유중</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 대여 실행 영역 */}
              <div className="p-5 border-t border-gray-100 bg-gray-50">
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-64">
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                      대여 담당자
                      {officerVerified === true && <span className="ml-1.5 text-green-600 font-normal">✓ 확인됨</span>}
                      {officerVerified === false && <span className="ml-1.5 text-yellow-600 font-normal">미등록 (직접 입력)</span>}
                    </label>
                    <div className="flex gap-2">
                      <div className={`flex-1 flex items-center border rounded-lg px-3 gap-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 ${officerVerified === true ? 'border-green-400' : officerVerified === false ? 'border-yellow-400' : 'border-gray-300'}`}>
                        <ScanLine size={14} className="text-gray-400 shrink-0" />
                        <input
                          ref={loanOfficerRef}
                          defaultValue={loanOfficer}
                          onChange={() => setOfficerVerified(null)}
                          onKeyDown={e => {
                            // 한글 IME 조합 중 Enter는 무시 (isComposing)
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              lookupOfficer();
                            }
                          }}
                          className="w-full py-2.5 text-sm outline-none bg-transparent"
                          placeholder="이름 입력 또는 QR 스캔 후 확인"
                          autoComplete="off"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={lookupOfficer}
                        disabled={officerLoading}
                        className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40 font-medium whitespace-nowrap">
                        {officerLoading ? '조회중...' : '확인'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    {!conditionOk && (
                      <p className="text-xs font-bold text-red-600 bg-red-50 py-1 px-3 rounded">⚠️ 파손 기기는 대여할 수 없습니다.</p>
                    )}
                    <button onClick={handleLoan} disabled={!tablet || (!selectedMember && !(loanOfficer.trim() || loanOfficerRef.current?.value.trim())) || !conditionOk || loading}
                      className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 font-bold whitespace-nowrap shadow-sm">
                      {loading ? '처리중...' : selectedMember ? `대여 승인 — ${selectedMember.name}` : (loanOfficer.trim() || loanOfficerRef.current?.value.trim()) ? '담당자 직접 대여' : '대여 승인'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 반납 UI */}
          {step === 'return' && (
            <div className="flex justify-end">
              <button onClick={handleReturn} disabled={loading || (!conditionOk && !conditionNotes.trim())}
                className="w-full sm:w-auto px-10 py-3.5 bg-green-600 text-white text-base rounded-xl hover:bg-green-700 disabled:opacity-50 font-bold shadow-md">
                {loading ? '처리중...' : '반납 (입고) 확정'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DONE 화면 ── */}
      {step === 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm mt-6">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 mb-2">
            {doneType === 'loaned' ? '기기 대여가 완료되었습니다!' : '기기 반납이 완료되었습니다!'}
          </p>
          <p className="text-sm text-gray-500 mb-4 font-mono">
             승인된 QR: {tablet?.serial_number || tablet?.qr_code}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 inline-block text-left mb-6 max-w-sm w-full mx-auto">
            {doneType === 'loaned' && selectedMember && (
              <p className="text-sm text-gray-700 font-medium mb-1"><span className="text-gray-500 w-20 inline-block">대여 회원</span> {selectedMember.name}</p>
            )}
            {doneType === 'loaned' && loanOfficer && (
              <p className="text-sm text-gray-700 font-medium mb-1"><span className="text-gray-500 w-20 inline-block">승인 담당자</span> {loanOfficer}</p>
            )}
            {doneType === 'returned' && (
               <p className="text-sm text-gray-700 font-medium mb-1"><span className="text-gray-500 w-20 inline-block">기기 상태</span> <span className={conditionOk ? 'text-green-600' : 'text-red-600 font-bold'}>{conditionOk ? "정상" : "파손 접수 (손상 기록됨)"}</span></p>
            )}
          </div>
          
          {queue.length > 1 && (
            <p className="text-sm text-blue-600 font-bold bg-blue-50 py-2 rounded-lg mb-6">
              총 {queue.length}개 중 {queueIdx + 1}번째 대여/반납을 처리했습니다.
            </p>
          )}

          <div className="flex gap-3 justify-center">
            {queueIdx + 1 < queue.length ? (
              <>
                <button onClick={() => navigate('/tablets')}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">
                  작업 취소 (목록으로)
                </button>
                <button onClick={advanceQueue}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md">
                  다음 기기 진행 ({queue.length - queueIdx - 1}개 남음)
                </button>
              </>
            ) : (
              <>
                <button onClick={reset}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">
                  다른 QR 스캔하기
                </button>
                <button onClick={() => navigate('/tablets')}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 shadow-md">
                  목록으로 돌아가기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
