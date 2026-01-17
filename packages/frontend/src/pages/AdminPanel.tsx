import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.users.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmMessage('');
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmMessage('');
    setConfirmAction(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    showConfirm(`Change user role to ${newRole}?`, async () => {
      try {
        await adminAPI.users.updateRole(userId, newRole);
        fetchUsers();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to update role');
      }
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            User Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage user roles and permissions
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Loading...
          </div>
        ) : (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      {u.firstName} {u.lastName}
                    </td>
                    <td style={{ padding: '1rem' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: u.role === 'ADMIN' ? 'var(--primary)' : 'var(--border)',
                        color: u.role === 'ADMIN' ? 'white' : 'var(--text-secondary)'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleRoleChange(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                          className="btn btn-outline"
                          style={{ fontSize: '0.875rem' }}
                        >
                          Make {u.role === 'ADMIN' ? 'User' : 'Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelConfirm}
        >
          <div
            className="card"
            style={{
              maxWidth: '400px',
              width: '90%',
              padding: '2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: 'var(--text)',
            }}>
              Confirm Action
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              lineHeight: '1.5',
            }}>
              {confirmMessage}
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCancelConfirm}
                className="btn btn-outline"
                style={{
                  padding: '0.5rem 1.5rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '0.5rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
