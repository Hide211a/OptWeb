import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastBridge } from './context/ToastBridge';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { HomeRedirect } from './components/HomeRedirect';
import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const DirectoriesPage = lazy(() => import('./pages/DirectoriesPage').then((m) => ({ default: m.DirectoriesPage })));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const DocumentCreatePage = lazy(() => import('./pages/DocumentCreatePage').then((m) => ({ default: m.DocumentCreatePage })));
const DocumentEditPage = lazy(() => import('./pages/DocumentEditPage').then((m) => ({ default: m.DocumentEditPage })));
const DocumentDetailPage = lazy(() => import('./pages/DocumentDetailPage').then((m) => ({ default: m.DocumentDetailPage })));
const ManagerWorkspacePage = lazy(() => import('./pages/ManagerWorkspacePage').then((m) => ({ default: m.ManagerWorkspacePage })));
const AdminPanelPage = lazy(() => import('./pages/AdminPanelPage').then((m) => ({ default: m.AdminPanelPage })));
const StockPage = lazy(() => import('./pages/StockPage').then((m) => ({ default: m.StockPage })));
const BatchesPage = lazy(() => import('./pages/BatchesPage').then((m) => ({ default: m.BatchesPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function PageFallback() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          <ToastBridge />
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<HomeRedirect />} />
                    <Route path="admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPanelPage /></ProtectedRoute>} />
                    <Route path="workspace" element={<ProtectedRoute roles={['MANAGER']}><ManagerWorkspacePage /></ProtectedRoute>} />
                    <Route path="dashboard" element={<ProtectedRoute roles={['DIRECTOR', 'ADMIN']}><DashboardPage /></ProtectedRoute>} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="directories" element={<ProtectedRoute roles={['ADMIN']}><DirectoriesPage /></ProtectedRoute>} />
                    <Route path="documents" element={<DocumentsPage />} />
                    <Route path="documents/new" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><DocumentCreatePage /></ProtectedRoute>} />
                    <Route path="documents/:id/edit" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><DocumentEditPage /></ProtectedRoute>} />
                    <Route path="documents/:id" element={<DocumentDetailPage />} />
                    <Route path="stock" element={<StockPage />} />
                    <Route path="batches" element={<BatchesPage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="customers/:id" element={<CustomerDetailPage />} />
                    <Route path="reports" element={<ProtectedRoute roles={['DIRECTOR', 'ADMIN']}><ReportsPage /></ProtectedRoute>} />
                    <Route path="users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="audit" element={<ProtectedRoute roles={['ADMIN', 'DIRECTOR']}><AuditLogPage /></ProtectedRoute>} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
