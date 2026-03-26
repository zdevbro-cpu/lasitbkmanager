import { useAuth, ROLE_LABELS } from '../../context/AuthContext';

const ROLE_BADGE_COLORS: Record<string, string> = {
  system_admin: 'bg-purple-100 text-purple-700',
  store_manager: 'bg-blue-100 text-blue-700',
  young_creator: 'bg-green-100 text-green-700',
};

export default function Header({ title }: { title?: string }) {
  const { adminUser, logout } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="text-base font-semibold text-gray-800">{title || ''}</h2>
      <div className="flex items-center gap-3">
        {adminUser && (
          <>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE_COLORS[adminUser.role] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {ROLE_LABELS[adminUser.role]}
            </span>
            <span className="text-sm text-gray-700 font-medium">{adminUser.name}</span>
          </>
        )}
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
