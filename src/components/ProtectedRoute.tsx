import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-400">加载中…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
