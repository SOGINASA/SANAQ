import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/authStore';

export function RoleRoute({ role }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    const destination = user.role === 'admin' ? '/admin/dashboard' : user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    return <Navigate to={destination} replace />;
  }
  return <Outlet />;
}
