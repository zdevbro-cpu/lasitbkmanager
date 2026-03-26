import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: '대시보드', icon: '📊' },
  { to: '/members', label: '회원관리', icon: '👥' },
  { to: '/tablets', label: '태블릿관리', icon: '📱' },
  { to: '/content/packages', label: '콘텐츠관리', icon: '📚', roles: ['system_admin'] },
  { to: '/lms/report', label: '학습관리', icon: '🎓' },
  { to: '/payments', label: '결제/환불', icon: '💳' },
  { to: '/education', label: '교육세션', icon: '🏫' },
  { to: '/admin/staff', label: '직원관리', icon: '🔑', roles: ['system_admin'] },
  { to: '/admin/stores', label: '매장관리', icon: '🏪', roles: ['system_admin'] },
  { to: '/admin/profile', label: '내 정보 관리', icon: '👤' },
];

export default function Sidebar() {
  const { adminUser } = useAuth();
  const role = adminUser?.role;

  const visibleItems = NAV_ITEMS.filter(
    item => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-base font-bold text-white">IT북매니저</h1>
        <p className="text-xs text-gray-400 mt-0.5">관리자</p>
      </div>
      <nav className="flex-1 py-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
