import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RoutePlaceholder } from '@/app/route-placeholder';
import { AppShell } from '@/components/layout/app-shell';
import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/features/auth/protected-route';

// As telas reais chegam nas changes F1–F8; por ora cada rota renderiza um stub.
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/cadastro',
    element: <RoutePlaceholder feature="F2" title="Criar conta" />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/feed', element: <RoutePlaceholder feature="F4" title="Feed de alimentos" /> },
          {
            path: '/alimentos/:id',
            element: <RoutePlaceholder feature="F4" title="Detalhe do alimento" />,
          },
          { path: '/pedidos', element: <RoutePlaceholder feature="F7" title="Pedidos" /> },
          {
            path: '/pedidos/:id',
            element: <RoutePlaceholder feature="F7" title="Detalhe do pedido" />,
          },
          { path: '/perfil', element: <RoutePlaceholder feature="F3" title="Meu perfil" /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/feed" replace /> },
  { path: '*', element: <Navigate to="/feed" replace /> },
]);
