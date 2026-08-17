import './App.css';
import { useEffect } from 'react';
import LoginPage from './pages/auth/LoginPage';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import { useAuthStore } from './features/auth/authStore';

function App() {
  const { status, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  if (status === 'loading') {
    return <div className="loading-screen"><div className="sana-orb">S</div><p>Соединяемся с SANAQ API…</p></div>;
  }
  return status === 'authenticated' ? <StudentDashboardPage /> : <LoginPage />;
}

export default App;
