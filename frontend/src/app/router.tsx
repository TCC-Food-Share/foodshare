import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RoutePlaceholder } from '@/app/route-placeholder';
import { AppShell } from '@/components/layout/app-shell';
import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { SignUpPage } from '@/features/auth/sign-up/sign-up-page';
import { FeedPage } from '@/features/foods/feed-page';
import { FoodDetailPage } from '@/features/foods/food-detail-page';
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
        element: <AppShell />,
        children: [
          { path: '/feed', element: <FeedPage /> },
          {
            path: '/alimentos/:id',
            element: <FoodDetailPage />,
          },
          { path: '/pedidos', element: <RoutePlaceholder feature="F7" title="Pedidos" /> },
          {
            path: '/pedidos/:id',
            element: <RoutePlaceholder feature="F7" title="Detalhe do pedido" />,
          },
          { path: '/perfil', element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/feed" replace /> },
  { path: '*', element: <Navigate to="/feed" replace /> },
]);
