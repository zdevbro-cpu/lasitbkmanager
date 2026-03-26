import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/auth/Login.page';
import DashboardPage from '../pages/dashboard/Dashboard.page';
import MemberListPage from '../pages/crm/MemberList.page';
import MemberCreatePage from '../pages/crm/MemberCreate.page';
import MemberDetailPage from '../pages/crm/MemberDetail.page';
import TabletListPage from '../pages/mdm/TabletList.page';
import TabletRegisterPage from '../pages/mdm/TabletRegister.page';
import TabletDetailPage from '../pages/mdm/TabletDetail.page';
import TabletLoanPage from '../pages/mdm/TabletLoan.page';
import PackageListPage from '../pages/cms/PackageList.page';
import PackageDetailPage from '../pages/cms/PackageDetail.page';
import LmsReportPage from '../pages/lms/LmsReport.page';
import PaymentListPage from '../pages/payments/PaymentList.page';
import RefundListPage from '../pages/payments/RefundList.page';
import EducationListPage from '../pages/education/EducationList.page';
import StaffListPage from '../pages/admin/StaffList.page';
import StoreListPage from '../pages/admin/StoreList.page';
import MyProfilePage from '../pages/admin/MyProfile.page';

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">로딩중...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },

      // Phase 2: CRM
      { path: 'members', element: <MemberListPage /> },
      { path: 'members/new', element: <MemberCreatePage /> },
      { path: 'members/:id', element: <MemberDetailPage /> },

      // Phase 3: MDM
      { path: 'tablets', element: <TabletListPage /> },
      { path: 'tablets/new', element: <TabletRegisterPage /> },
      { path: 'tablets/loan', element: <TabletLoanPage /> },
      { path: 'tablets/:id', element: <TabletDetailPage /> },

      // Phase 4: CMS + LMS
      { path: 'content/packages', element: <PackageListPage /> },
      { path: 'content/packages/:id', element: <PackageDetailPage /> },
      { path: 'lms/report', element: <LmsReportPage /> },

      // Phase 5: Payments
      { path: 'payments', element: <PaymentListPage /> },
      { path: 'payments/refunds', element: <RefundListPage /> },

      // Phase 6: Education Sessions
      { path: 'education', element: <EducationListPage /> },

      // Admin
      { path: 'admin/staff', element: <StaffListPage /> },
      { path: 'admin/stores', element: <StoreListPage /> },
      { path: 'admin/profile', element: <MyProfilePage /> },
    ],
  },
]);
