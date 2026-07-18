import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SplashScreen from './SplashScreen';

export default function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;
  if (user) return <Navigate to="/forum" replace />;

  return <Outlet />;
}
