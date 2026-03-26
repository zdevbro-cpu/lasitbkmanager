import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/Login.page';
import HomePage from '../pages/Home.page';
import ContentListPage from '../pages/content/ContentList.page';
import ContentViewerPage from '../pages/content/ContentViewer.page';

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">로딩중...</div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <Navigate to="/home" replace /> },
  {
    path: '/home',
    element: <RequireAuth><HomePage /></RequireAuth>,
  },
  {
    path: '/content/:packageId',
    element: <RequireAuth><ContentListPage /></RequireAuth>,
  },
  {
    path: '/content/:packageId/item/:itemId',
    element: <RequireAuth><ContentViewerPage /></RequireAuth>,
  },
]);
