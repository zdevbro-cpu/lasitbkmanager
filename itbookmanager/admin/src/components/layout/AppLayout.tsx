import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/members': '회원관리',
  '/tablets': '태블릿관리',
  '/content': '콘텐츠관리',
  '/lms': '학습관리',
  '/payments': '결제/환불',
};

export default function AppLayout() {
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = PAGE_TITLES[base] || '';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
