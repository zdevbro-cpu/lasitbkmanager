import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase';
import QRCode from 'qrcode';
import { User, Lock, Mail, Building2, ShieldCheck, AlertCircle, Download, Printer, QrCode as QrIcon } from 'lucide-react';

export default function MyProfilePage() {
  const { adminUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // QR 이미지 상태
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [employeeCode, setEmployeeCode] = useState<string>('');

  useEffect(() => {
    if (adminUser) {
      generateEmployeeQR();
    }
  }, [adminUser]);

  const generateEmployeeQR = async () => {
    if (!adminUser || !canvasRef.current) return;
    setGeneratingQr(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      const userName = adminUser.name;
      const userBranch = adminUser.store_name || (adminUser.role === 'system_admin' ? '본사' : '');

      // las-mgmt users 테이블에서 referral_code 조회 (email 기준, 같은 Supabase 프로젝트)
      let userCode = adminUser.store_code || '';
      const { data: lasUser, error: lasError } = await supabase
        .from('users')
        .select('referral_code')
        .eq('email', adminUser.email)
        .maybeSingle();
      if (lasError) console.warn('las-mgmt referral_code 조회 실패:', lasError.message);
      if (lasUser?.referral_code) userCode = lasUser.referral_code;

      // 고유코드가 없으면 QR 생성 불가 안내
      if (!userCode) {
        setEmployeeCode('');
        return;
      }
      setEmployeeCode(userCode);

      canvas.width = 600;
      canvas.height = 800;

      // 1. 배경 (흰색)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. 상단 헤더 (회사 브랜드 컬러)
      ctx.fillStyle = '#249689';
      ctx.fillRect(0, 0, canvas.width, 100);

      // 3. 로고 로드
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/images/logo.png';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
      });

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoTargetH = 50;
        const logoTargetW = (logoImg.width / logoImg.height) * logoTargetH;
        ctx.drawImage(logoImg, (canvas.width - logoTargetW) / 2, 25, logoTargetW, logoTargetH);
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LAS BOOK', canvas.width / 2, 60);
      }

      // 4. QR 코드 생성 (직원 코드)
      const qrDataUrl = await QRCode.toDataURL(userCode, {
        width: 1000,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve) => { qrImg.onload = () => resolve(); });

      const qrSize = 400;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 180;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // 5. QR 중앙 로고 삽입
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoSize = 80;
        const logoX = qrX + (qrSize - logoSize) / 2;
        const logoY = qrY + (qrSize - logoSize) / 2;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      }

      // 6. 하단 정보
      ctx.textAlign = 'center';

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 40px Malgun Gothic, sans-serif';
      ctx.fillText(userName, canvas.width / 2, 640);

      ctx.fillStyle = '#666666';
      ctx.font = '30px Malgun Gothic, sans-serif';
      ctx.fillText(userBranch, canvas.width / 2, 690);

      ctx.fillStyle = '#249689';
      ctx.font = 'bold 35px Roboto, sans-serif';
      ctx.fillText(userCode, canvas.width / 2, 750);

      setQrImageUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('QR 생성 실패:', err);
    } finally {
      setGeneratingQr(false);
    }
  };

  const downloadQR = () => {
    if (!qrImageUrl || !adminUser) return;
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `직원QR_${adminUser.name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQR = () => {
    if (!qrImageUrl) return;
    const win = window.open('');
    if (!win) return;
    win.document.write(`<img src="${qrImageUrl}" style="width:100%;max-width:500px;display:block;margin:0 auto;">`);
    win.document.write('<script>window.onload=function(){window.print();window.close();}<\/script>');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '비밀번호는 6자리 이상이어야 합니다.' });
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      // 현재 비밀번호로 재인증
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: adminUser.email,
        password: currentPassword,
      });
      if (signInError) {
        setMessage({ type: 'error', text: '현재 비밀번호가 올바르지 않습니다.' });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: '비밀번호 변경에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setUpdating(false);
    }
  };

  if (!adminUser) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">내 정보 관리</h1>
        <p className="text-sm text-gray-500 mt-1">계정 정보 확인 및 보안 설정을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 왼쪽: 기본 정보 + QR */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <User size={18} className="text-blue-600" />
              기본 프로필
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">이름</label>
                <p className="text-sm font-medium text-gray-800">{adminUser.name}</p>
              </div>
              <div className="pt-3 border-t border-gray-50">
                <label className="text-xs text-gray-400 block mb-1">이메일 (ID)</label>
                <div className="flex items-center gap-1.5">
                  <Mail size={14} className="text-gray-400" />
                  <p className="text-sm font-medium text-gray-800">{adminUser.email}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-50">
                <label className="text-xs text-gray-400 block mb-1">권한</label>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-gray-400" />
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                    {adminUser.role === 'system_admin' ? '시스템 관리자' : '지점 관리자'}
                  </span>
                </div>
              </div>
              {adminUser.store_name && (
                <div className="pt-3 border-t border-gray-50">
                  <label className="text-xs text-gray-400 block mb-1">소속 라스브러리</label>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-800">
                      [{adminUser.store_code}] {adminUser.store_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 직원 QR 카드 */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {generatingQr ? (
              <div className="py-16 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">QR 생성 중...</p>
              </div>
            ) : qrImageUrl ? (
              <div className="space-y-4 p-4">
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <img src={qrImageUrl} alt="직원 QR" className="w-full" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={downloadQR}
                    className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors text-sm"
                  >
                    <Download size={18} />
                    이미지 저장
                  </button>
                  <button
                    onClick={printQR}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <Printer size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 px-4">
                <QrIcon size={48} className="mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">고유코드 없음</p>
                <p className="text-xs text-gray-400 mt-1">
                  las-mgmt에 등록된 고유코드(referral_code)가 필요합니다.
                </p>
              </div>
            )}
            {/* 하단 정보 요약 */}
            {adminUser && (
              <div className="px-4 pb-4 flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                <div>
                  <p className="text-gray-500 text-xs">사용자</p>
                  <p className="font-bold">{adminUser.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">고유코드</p>
                  <p className="font-mono font-bold text-teal-600">
                    {employeeCode || '—'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 비밀번호 변경 */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Lock size={18} className="text-blue-600" />
              비밀번호 변경
            </h2>

            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {message.type === 'success' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">현재 비밀번호</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="보안을 위해 기존 비번을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">새 비밀번호</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="최소 6자 이상"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">새 비밀번호 확인</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="한 번 더 입력하세요"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {updating ? '업데이트 중...' : '비밀번호 저장'}
                </button>
              </div>
            </div>
          </form>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              보안 안내
            </h3>
            <ul className="text-xs text-blue-700 space-y-1.5 list-disc ml-4">
              <li>초기 부여된 비밀번호(123456)는 보안을 위해 반드시 변경해 주시기 바랍니다.</li>
              <li>비밀번호는 영문, 숫자 조합으로 6자 이상을 권장합니다.</li>
              <li>로그인 아이디는 변경이 불가능하므로, 오탈자가 있을 경우 시스템 관리자에게 문의하세요.</li>
            </ul>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
