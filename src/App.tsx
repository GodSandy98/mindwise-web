import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentsPage from './pages/StudentsPage';
import ExamsPage from './pages/ExamsPage';
import SubmitAnswersPage from './pages/SubmitAnswersPage';
import ExamScoresPage from './pages/ExamScoresPage';
import ReportPage from './pages/ReportPage';
import AdminPage from './pages/AdminPage';
import TaskCenterPage from './pages/TaskCenterPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {user && <Sidebar />}
      <main className={`flex-1 ${user ? 'ml-56' : ''}`}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Navigate to="/students" replace />} />
        <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
        <Route path="/exams" element={<ProtectedRoute><ExamsPage /></ProtectedRoute>} />
        <Route path="/exams/:id/submit" element={<ProtectedRoute><SubmitAnswersPage /></ProtectedRoute>} />
        <Route path="/exams/:id/scores" element={<ProtectedRoute><ExamScoresPage /></ProtectedRoute>} />
        <Route path="/reports/:studentId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TaskCenterPage /></ProtectedRoute>} />
        <Route path="/admin" element={
          <ProtectedRoute>
            {user?.role === 'super_admin' ? <AdminPage /> : <Navigate to="/students" replace />}
          </ProtectedRoute>
        } />
      </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
