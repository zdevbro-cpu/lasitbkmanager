import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signIn(email, password);
      navigate('/home', { replace: true });
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📚</div>
          <h1 className="text-2xl font-bold text-white">IT북매니저</h1>
          <p className="text-blue-200 text-sm mt-1">AI 교육 학습 앱</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <form onSubmit={e => { void handleSubmit(e); }} className="space-y-4">
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">이메일</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" inputMode="email"
                className="w-full mt-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">비밀번호</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                className="w-full mt-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50">
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
