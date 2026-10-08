import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { AdminHomePage } from '@/features/admin/admin-home-page';
import { AdminLayout } from '@/features/admin/admin-layout';
import { ADMIN_NAV_ITEMS } from '@/features/admin/admin-nav-items';
import { AdminPlaceholderPage } from '@/features/admin/admin-placeholder-page';
import { ADMIN_HOME, INSTITUTION_ROLES } from '@/features/auth/home-path';
import { HomeRedirect } from '@/features/auth/home-redirect';
import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { RoleRoute } from '@/features/auth/role-route';
import { SignUpPage } from '@/features/auth/sign-up/sign-up-page';
import { FeedPage } from '@/features/foods/feed-page';
import { FoodDetailPage } from '@/features/foods/food-detail-page';
import { OrderDetailPage } from '@/features/orders/order-detail-page';
import { OrdersPage } from '@/features/orders/orders-page';
import { ProfilePage } from '@/features/profile/profile-page';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/cadastro',
    element: <SignUpPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute roles={INSTITUTION_ROLES} />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/feed', element: <FeedPage /> },
              {
                path: '/alimentos/:id',
                element: <FoodDetailPage />,
              },
              { path: '/pedidos', element: <OrdersPage /> },
              { path: '/pedidos/:id', element: <OrderDetailPage /> },
              { path: '/perfil', element: <ProfilePage /> },
            ],
          },
        ],
      },
      {
        element: <RoleRoute roles={['administrator']} />,
        children: [
          {
            path: ADMIN_HOME,
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminHomePage /> },
              ...ADMIN_NAV_ITEMS.map((item) => ({
                path: item.to,
                element: <AdminPlaceholderPage title={item.label} />,
              })),
              { path: '*', element: <Navigate to={ADMIN_HOME} replace /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <HomeRedirect /> },
  { path: '*', element: <HomeRedirect /> },
]);
