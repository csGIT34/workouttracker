import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from './UserProfileModal';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 0',
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              Workout Tracker
            </h1>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link
                to="/dashboard"
                style={{
                  color: location.pathname === '/dashboard' ? 'var(--primary)' : 'var(--text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Dashboard
              </Link>
              <Link
                to="/templates"
                style={{
                  color: location.pathname.startsWith('/templates') ? 'var(--primary)' : 'var(--text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Templates
              </Link>
              <Link
                to="/exercises"
                style={{
                  color: location.pathname.startsWith('/exercises') ? 'var(--primary)' : 'var(--text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Exercises
              </Link>
              <Link
                to="/schedule"
                style={{
                  color: location.pathname === '/schedule' ? 'var(--primary)' : 'var(--text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Schedule
              </Link>
              <Link
                to="/progress"
                style={{
                  color: location.pathname === '/progress' ? 'var(--primary)' : 'var(--text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Progress
              </Link>
              <Link
                to="/history"
                style={{
                  color: location.pathname === '/history' ? 'var(--primary)' : 'var(--text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                History
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  style={{
                    color: location.pathname.startsWith('/admin') ? 'var(--primary)' : 'var(--text)',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Users
                </Link>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {user?.firstName} {user?.lastName}
              {user?.role === 'ADMIN' && <span style={{ color: 'var(--primary)', marginLeft: '0.5rem' }}>(Admin)</span>}
            </span>
            <button
              onClick={() => setProfileModalOpen(true)}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              ⚙️ Profile
            </button>
            <button onClick={handleLogout} className="btn btn-outline">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem 0' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}
