import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'MANAGER') return <Navigate to="/workspace" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}
