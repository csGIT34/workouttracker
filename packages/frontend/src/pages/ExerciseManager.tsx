import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exerciseAPI, adminAPI } from '../services/api';
import { Exercise } from '@workout-tracker/shared';
import { useAuth } from '../contexts/AuthContext';

type FilterType = 'all' | 'custom' | 'global' | 'muscle-groups' | 'categories';

interface MuscleGroup {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function ExerciseManager() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, [filter]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      if (filter === 'muscle-groups') {
        const response = await adminAPI.muscleGroups.getAll();
        setMuscleGroups(response.data);
      } else if (filter === 'categories') {
        const response = await adminAPI.categories.getAll();
        setCategories(response.data);
      } else {
        const response = await exerciseAPI.getAll();
        setExercises(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string, isGlobal: boolean) => {
    const warning = isGlobal && isAdmin
      ? `Delete "${name}"? This cannot be undone.\n\nWARNING: This is a GLOBAL exercise used by all users!`
      : `Delete "${name}"? This cannot be undone.`;

    showConfirm(warning, async () => {
      try {
        if (isAdmin) {
          await exerciseAPI.admin.delete(id);
        } else {
          await exerciseAPI.delete(id);
        }
        setExercises(exercises.filter((e) => e.id !== id));
      } catch (error: any) {
        console.error('Failed to delete exercise:', error);
        alert(error.response?.data?.message || 'Failed to delete exercise');
      }
    });
  };

  const handleCreateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      if (filter === 'muscle-groups') {
        await adminAPI.muscleGroups.create(newName);
      } else if (filter === 'categories') {
        await adminAPI.categories.create(newName);
      }
      setNewName('');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create');
    }
  };

  const handleUpdateMetadata = async (id: string) => {
    if (!editName.trim()) return;

    try {
      if (filter === 'muscle-groups') {
        await adminAPI.muscleGroups.update(id, editName);
      } else if (filter === 'categories') {
        await adminAPI.categories.update(id, editName);
      }
      setEditingId(null);
      setEditName('');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update');
    }
  };

  const handleDeleteMetadata = async (id: string, name: string) => {
    showConfirm(`Delete "${name}"? This cannot be undone.`, async () => {
      try {
        if (filter === 'muscle-groups') {
          await adminAPI.muscleGroups.delete(id);
        } else if (filter === 'categories') {
          await adminAPI.categories.delete(id);
        }
        fetchData();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to delete');
      }
    });
  };

  const filteredExercises = exercises.filter((exercise) => {
    if (filter === 'custom') return exercise.userId !== null;
    if (filter === 'global') return exercise.userId === null;
    return true;
  });

  const customExercises = exercises.filter((e) => e.userId !== null);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
          Loading exercises...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Exercise Library
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'Manage all exercises and the global library' : 'Manage your custom exercises and browse the global library'}
          </p>
        </div>
        <button
          onClick={() => navigate('/exercises/new')}
          className="btn btn-primary"
          style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
        >
          + Create {isAdmin ? 'Exercise' : 'Custom Exercise'}
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid var(--border)'
      }}>
        {(['all', 'custom', 'global', ...(isAdmin ? ['muscle-groups', 'categories'] as FilterType[] : [])] as FilterType[]).map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'transparent',
              color: filter === filterType ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: filter === filterType ? 600 : 400,
              fontSize: '1rem',
              cursor: 'pointer',
              borderBottom: filter === filterType ? '2px solid var(--primary)' : 'none',
              marginBottom: '-2px',
              textTransform: 'capitalize'
            }}
          >
            {filterType === 'all' ? `All (${exercises.length})` :
             filterType === 'custom' ? `Custom (${customExercises.length})` :
             filterType === 'global' ? `Global (${exercises.length - customExercises.length})` :
             filterType === 'muscle-groups' ? `Muscle Groups (${muscleGroups.length})` :
             filterType === 'categories' ? `Categories (${categories.length})` :
             filterType}
          </button>
        ))}
      </div>

      {/* Muscle Groups & Categories Management */}
      {(filter === 'muscle-groups' || filter === 'categories') ? (
        <div className="card">
          <form onSubmit={handleCreateMetadata} style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              fontWeight: 500,
              marginBottom: '0.5rem'
            }}>
              Add New {filter === 'muscle-groups' ? 'Muscle Group' : 'Category'}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter name..."
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newName.trim()}
              >
                Add
              </button>
            </div>
          </form>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            {(filter === 'muscle-groups' ? muscleGroups : categories).map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      marginRight: '0.5rem'
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => handleUpdateMetadata(item.id)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditName('');
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditName(item.name);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMetadata(item.id, item.name)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid var(--danger)',
                          borderRadius: '0.375rem',
                          backgroundColor: 'transparent',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center',
          padding: '4rem 2rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {filter === 'custom' ? '💪' : '🔍'}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            {filter === 'custom' ? 'No Custom Exercises' : 'No Exercises Found'}
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            maxWidth: '500px',
            margin: '0 auto 2rem'
          }}>
            {filter === 'custom'
              ? 'Create your own custom exercises to track movements not in the global library.'
              : 'No exercises match your current filter.'}
          </p>
          {filter === 'custom' && (
            <button
              onClick={() => navigate('/exercises/new')}
              className="btn btn-primary"
              style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            >
              Create Your First Exercise
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredExercises.map((exercise) => {
            const isCustom = exercise.userId !== null;

            return (
              <div
                key={exercise.id}
                className="card"
                style={{
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Badge */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: isCustom ? 'var(--primary)' : 'var(--border)',
                  color: isCustom ? 'white' : 'var(--text-secondary)'
                }}>
                  {isCustom ? 'Custom' : 'Global'}
                </div>

                {/* Content */}
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: 'var(--text)',
                    paddingRight: '5rem'
                  }}>
                    {exercise.name}
                  </h3>

                  {exercise.description && (
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '1rem',
                      lineHeight: 1.5,
                      maxHeight: '3em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {exercise.description}
                    </p>
                  )}

                  {/* Type and Details */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: exercise.type === 'STRENGTH' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: exercise.type === 'STRENGTH' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)'
                    }}>
                      {exercise.type === 'STRENGTH' ? '💪 Strength' : '🏃 Cardio'}
                    </span>
                    {exercise.muscleGroup && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-secondary)'
                      }}>
                        {exercise.muscleGroup.name.charAt(0) + exercise.muscleGroup.name.slice(1).toLowerCase()}
                      </span>
                    )}
                    {exercise.category && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-secondary)'
                      }}>
                        {exercise.category.name.charAt(0) + exercise.category.name.slice(1).toLowerCase()}
                      </span>
                    )}
                  </div>

                  {/* Actions - Show for custom exercises, or all exercises if admin */}
                  {(isCustom || isAdmin) && (
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border)'
                    }}>
                      <button
                        onClick={() => navigate(isAdmin ? `/admin/exercises/${exercise.id}/edit` : `/exercises/${exercise.id}/edit`)}
                        className="btn btn-outline"
                        style={{ flex: 1, fontSize: '0.875rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(exercise.id, exercise.name, !isCustom)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid var(--danger)',
                          borderRadius: '0.375rem',
                          backgroundColor: 'transparent',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--danger)';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--danger)';
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              maxWidth: '500px',
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
              whiteSpace: 'pre-line',
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
