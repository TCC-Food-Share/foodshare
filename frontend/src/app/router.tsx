import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { AdminHomePage } from '@/features/admin/admin-home-page';
import { AdminLayout } from '@/features/admin/admin-layout';
import { ADMIN_NAV_ITEMS } from '@/features/admin/admin-nav-items';
import { AdminPlaceholderPage } from '@/features/admin/admin-placeholder-page';
import { AdminCancellationReasonsPage } from '@/features/admin/lists/admin-cancellation-reasons-page';
import { AdminCategoriesPage } from '@/features/admin/lists/admin-categories-page';
import { AdminFoodItemsPage } from '@/features/admin/lists/admin-food-items-page';
import { AdminMeasurementUnitsPage } from '@/features/admin/lists/admin-measurement-units-page';
import { AdminProhibitedTermsPage } from '@/features/admin/lists/admin-prohibited-terms-page';
import { AdminSuggestionsPage } from '@/features/admin/suggestions/admin-suggestions-page';
import { ConfirmEmailPage } from '@/features/auth/confirm-email/confirm-email-page';
import { ForgotPasswordPage } from '@/features/auth/forgot-password/forgot-password-page';
import { ADMIN_HOME, INSTITUTION_ROLES } from '@/features/auth/home-path';
import { HomeRedirect } from '@/features/auth/home-redirect';
import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { RoleRoute } from '@/features/auth/role-route';
import { SignUpPage } from '@/features/auth/sign-up/sign-up-page';
import { FeedPage } from '@/features/foods/feed-page';
import { FoodDetailPage } from '@/features/foods/food-detail-page';
import { MyFoodsPage } from '@/features/foods/my-foods-page';
import { EntityProfilePage } from '@/features/institutions/entity-profile-page';
import { EstablishmentProfilePage } from '@/features/institutions/establishment-profile-page';
import { InstitutionsPage } from '@/features/institutions/institutions-page';
import { OrderDetailPage } from '@/features/orders/order-detail-page';
import { OrdersPage } from '@/features/orders/orders-page';
import { ProfilePage } from '@/features/profile/profile-page';

const ADMIN_LIST_PAGES: Record<string, ReactNode> = {
  '/admin/categorias': <AdminCategoriesPage />,
  '/admin/catalogo': <AdminFoodItemsPage />,
  '/admin/unidades': <AdminMeasurementUnitsPage />,
  '/admin/motivos': <AdminCancellationReasonsPage />,
  '/admin/termos-proibidos': <AdminProhibitedTermsPage />,
  '/admin/sugestoes': <AdminSuggestionsPage />,
};

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
    path: '/esqueci-senha',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/confirmar-email',
    element: <ConfirmEmailPage />,
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
              {
                element: <RoleRoute roles={['establishment']} />,
                children: [
                  { path: '/meus-alimentos', element: <MyFoodsPage /> },
                  {
                    path: '/entidades',
                    element: (
                      <InstitutionsPage key="beneficiary-entity" kind="beneficiary-entity" />
                    ),
                  },
                  { path: '/entidades/:id', element: <EntityProfilePage /> },
                ],
              },
              {
                element: <RoleRoute roles={['beneficiary']} />,
                children: [
                  {
                    path: '/estabelecimentos',
                    element: <InstitutionsPage key="establishment" kind="establishment" />,
                  },
                  { path: '/estabelecimentos/:id', element: <EstablishmentProfilePage /> },
                ],
              },
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
                element: ADMIN_LIST_PAGES[item.to] ?? <AdminPlaceholderPage title={item.label} />,
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
