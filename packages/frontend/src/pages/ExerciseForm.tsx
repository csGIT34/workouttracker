import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exerciseAPI } from '../services/api';
import { ExerciseType } from '@workout-tracker/shared';

export default function ExerciseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ExerciseType>(ExerciseType.STRENGTH);
  const [muscleGroup, setMuscleGroup] = useState('');
  const [category, setCategory] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<Array<{id: string, name: string}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    fetchMetadata();
    if (id) {
      fetchExercise();
    }
  }, [id]);

  const fetchMetadata = async () => {
    try {
      const [mgResponse, catResponse] = await Promise.all([
        exerciseAPI.getMuscleGroups(),
        exerciseAPI.getCategories(),
      ]);
      setMuscleGroups(mgResponse.data);
      setCategories(catResponse.data);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    }
  };

  const fetchExercise = async () => {
    if (!id) return;
    try {
      const response = await exerciseAPI.getById(id);
      const exercise = response.data;
      setName(exercise.name);
      setDescription(exercise.description || '');
      setType(exercise.type);
      setMuscleGroup(exercise.muscleGroupId || '');
      setCategory(exercise.categoryId || '');
    } catch (error) {
      console.error('Failed to fetch exercise:', error);
      alert('Failed to fetch exercise');
      navigate('/exercises');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        name,
        description: description || undefined,
        type,
        muscleGroupId: muscleGroup || undefined,
        categoryId: category || undefined,
      };

      if (id) {
        await exerciseAPI.update(id, data);
      } else {
        await exerciseAPI.create(data);
      }
      navigate('/exercises');
    } catch (error: any) {
      console.error('Failed to save exercise:', error);
      alert(error.response?.data?.message || 'Failed to save exercise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {id ? 'Edit Exercise' : 'Create Exercise'}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {id
            ? 'Update your custom exercise details'
            : 'Create a new custom exercise for your workout library'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: 'var(--text)'
              }}
            >
              Exercise Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Barbell Bench Press"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                backgroundColor: 'var(--background)',
                color: 'var(--text)'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              style={{
                display: 'block',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: 'var(--text)'
              }}
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the exercise..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                backgroundColor: 'var(--background)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Type */}
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 500,
                marginBottom: '0.75rem',
                color: 'var(--text)'
              }}
            >
              Exercise Type <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[ExerciseType.STRENGTH, ExerciseType.CARDIO].map((exerciseType) => (
                <label
                  key={exerciseType}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    border: `2px solid ${type === exerciseType ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: type === exerciseType ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={exerciseType}
                    checked={type === exerciseType}
                    onChange={(e) => {
                      setType(e.target.value as ExerciseType);
                      // Clear muscle-specific fields when switching to cardio
                      if (e.target.value === ExerciseType.CARDIO) {
                        setMuscleGroup('');
                        setCategory('');
                      }
                    }}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>
                    {exerciseType === ExerciseType.STRENGTH ? '💪' : '🏃'}
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    {exerciseType === ExerciseType.STRENGTH ? 'Strength' : 'Cardio'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Muscle Group - Only for Strength */}
          {type === ExerciseType.STRENGTH && (
            <div>
              <label
                htmlFor="muscleGroup"
                style={{
                  display: 'block',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                  color: 'var(--text)'
                }}
              >
                Muscle Group
              </label>
              <select
                id="muscleGroup"
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text)'
                }}
              >
                <option value="">Select muscle group...</option>
                {muscleGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name.charAt(0) + group.name.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category - Only for Strength */}
          {type === ExerciseType.STRENGTH && (
            <div>
              <label
                htmlFor="category"
                style={{
                  display: 'block',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                  color: 'var(--text)'
                }}
              >
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text)'
                }}
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name.charAt(0) + cat.name.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}>
            <button
              type="button"
              onClick={() => navigate('/exercises')}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {loading ? 'Saving...' : id ? 'Update Exercise' : 'Create Exercise'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
