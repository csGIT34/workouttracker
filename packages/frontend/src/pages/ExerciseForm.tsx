import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exerciseAPI } from '../services/api';
import { ExerciseType, Difficulty, Force, Mechanic } from '@workout-tracker/shared';

export default function ExerciseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ExerciseType>(ExerciseType.STRENGTH);
  const [muscleGroup, setMuscleGroup] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [force, setForce] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [secondaryMuscles, setSecondaryMuscles] = useState('');
  const [specificMuscle, setSpecificMuscle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [aliases, setAliases] = useState('');
  const [instructions, setInstructions] = useState('');
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

  const parseJsonArray = (value: string | null | undefined): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
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
      setDifficulty(exercise.difficulty || '');
      setForce(exercise.force || '');
      setMechanic(exercise.mechanic || '');
      setSecondaryMuscles(parseJsonArray(exercise.secondaryMuscles).join(', '));
      setSpecificMuscle(exercise.specificMuscle || '');
      setVideoUrl(exercise.videoUrl || '');
      setAliases(parseJsonArray(exercise.aliases).join(', '));
      setInstructions(exercise.instructions || '');
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
      const data: Record<string, any> = {
        name,
        description: description || undefined,
        type,
        muscleGroupId: muscleGroup || undefined,
        categoryId: category || undefined,
        difficulty: difficulty || undefined,
        force: force || undefined,
        mechanic: mechanic || undefined,
        specificMuscle: specificMuscle || undefined,
        videoUrl: videoUrl || undefined,
        instructions: instructions || undefined,
      };

      if (secondaryMuscles.trim()) {
        data.secondaryMuscles = JSON.stringify(
          secondaryMuscles.split(',').map((s) => s.trim()).filter(Boolean)
        );
      }
      if (aliases.trim()) {
        data.aliases = JSON.stringify(
          aliases.split(',').map((s) => s.trim()).filter(Boolean)
        );
      }

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

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border)',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    backgroundColor: 'var(--background)',
    color: 'var(--text)',
  };

  const labelStyle = {
    display: 'block' as const,
    fontWeight: 500,
    marginBottom: '0.5rem',
    color: 'var(--text)',
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
            <label htmlFor="name" style={labelStyle}>
              Exercise Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Barbell Bench Press"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" style={labelStyle}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the exercise..."
              style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' as const }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={{ ...labelStyle, marginBottom: '0.75rem' }}>
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
                      if (e.target.value === ExerciseType.CARDIO) {
                        setMuscleGroup('');
                        setCategory('');
                      }
                    }}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <span style={{ fontWeight: 500 }}>
                    {exerciseType === ExerciseType.STRENGTH ? 'Strength' : 'Cardio'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Muscle Group & Category - Only for Strength */}
          {type === ExerciseType.STRENGTH && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="muscleGroup" style={labelStyle}>Muscle Group</label>
                <select id="muscleGroup" value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} style={inputStyle}>
                  <option value="">Select muscle group...</option>
                  {muscleGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name.charAt(0) + group.name.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="category" style={labelStyle}>Category</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name.charAt(0) + cat.name.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Difficulty, Force, Mechanic */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="difficulty" style={labelStyle}>Difficulty</label>
              <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={inputStyle}>
                <option value="">Select...</option>
                {Object.values(Difficulty).map((d) => (
                  <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="force" style={labelStyle}>Force</label>
              <select id="force" value={force} onChange={(e) => setForce(e.target.value)} style={inputStyle}>
                <option value="">Select...</option>
                {Object.values(Force).map((f) => (
                  <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mechanic" style={labelStyle}>Mechanic</label>
              <select id="mechanic" value={mechanic} onChange={(e) => setMechanic(e.target.value)} style={inputStyle}>
                <option value="">Select...</option>
                {Object.values(Mechanic).map((m) => (
                  <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Specific Muscle */}
          <div>
            <label htmlFor="specificMuscle" style={labelStyle}>Specific Muscle</label>
            <input
              type="text"
              id="specificMuscle"
              value={specificMuscle}
              onChange={(e) => setSpecificMuscle(e.target.value)}
              placeholder="e.g., pectoralis major, latissimus dorsi"
              style={inputStyle}
            />
          </div>

          {/* Secondary Muscles */}
          <div>
            <label htmlFor="secondaryMuscles" style={labelStyle}>Secondary Muscles</label>
            <input
              type="text"
              id="secondaryMuscles"
              value={secondaryMuscles}
              onChange={(e) => setSecondaryMuscles(e.target.value)}
              placeholder="Comma-separated, e.g., triceps, anterior deltoid"
              style={inputStyle}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Separate multiple muscles with commas
            </p>
          </div>

          {/* Video URL */}
          <div>
            <label htmlFor="videoUrl" style={labelStyle}>Video URL</label>
            <input
              type="url"
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              style={inputStyle}
            />
          </div>

          {/* Aliases */}
          <div>
            <label htmlFor="aliases" style={labelStyle}>Alternate Names</label>
            <input
              type="text"
              id="aliases"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="Comma-separated, e.g., Flat Bench, Bench Press"
              style={inputStyle}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Other names this exercise is known by
            </p>
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="instructions" style={labelStyle}>Instructions</label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Step-by-step instructions for performing the exercise..."
              style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' as const }}
            />
          </div>

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
