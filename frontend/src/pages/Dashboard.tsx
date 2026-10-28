import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../App';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuth(); // Guaranteed to be non-null by ProtectedRoute

  const handleLogout = async () => {
    await authApi.logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-base text-text p-8 font-sans">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex items-center gap-4 bg-panel p-6 rounded-xl border border-border shadow-2xl">
          <img src={user?.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-accent" />
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome, {user?.username}!</h1>
            <p className="text-white/60 text-sm">Authenticated successfully via GitHub.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="ml-auto px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors font-medium text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
