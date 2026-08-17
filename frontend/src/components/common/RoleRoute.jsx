import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/authStore';

export function RoleRoute({ role }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
  }
  return <Outlet />;
}
