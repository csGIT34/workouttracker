import { useEffect, useState } from 'react';
import { WeightUnit, HeightUnit, Gender, UpdateProfileDto } from '@workout-tracker/shared';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function UserProfileModal({ isOpen, onClose, onSave }: UserProfileModalProps) {
  const { user, refreshUser } = useAuth();
  const [weight, setWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(WeightUnit.LBS);
  const [height, setHeight] = useState<string>('');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(HeightUnit.INCHES);
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setWeight(user.weight?.toString() || '');
      setWeightUnit(user.weightUnit || WeightUnit.LBS);
      setHeight(user.height?.toString() || '');
      setHeightUnit(user.heightUnit || HeightUnit.INCHES);
      setAge(user.age?.toString() || '');
      setGender(user.gender || '');
    }
  }, [user]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile form submitted');
    setError(null);
    setLoading(true);

    try {
      const data: UpdateProfileDto = {
        ...(weight && { weight: parseFloat(weight) }),
        weightUnit,
        ...(height && { height: parseFloat(height) }),
        heightUnit,
        ...(age && { age: parseInt(age) }),
        ...(gender && { gender: gender as Gender }),
      };

      console.log('Sending profile data:', data);
      const response = await api.patch('/api/v1/users/profile', data);
      console.log('Profile update response:', response);

      await refreshUser();

      if (onSave) {
        onSave();
      }

      onClose();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      console.error('Error details:', err.response);
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
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
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          maxWidth: '32rem',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--text)',
          }}
        >
          Update Profile
        </h2>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Set your biometric data to enable calorie tracking during workouts.
        </p>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: 'var(--danger)',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Weight */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text)',
              }}
            >
              Weight (Required for calorie tracking)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight"
                className="input"
                style={{ flex: 1 }}
              />
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                className="input"
                style={{ width: '100px' }}
              >
                <option value={WeightUnit.LBS}>LBS</option>
                <option value={WeightUnit.KG}>KG</option>
              </select>
            </div>
          </div>

          {/* Height */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text)',
              }}
            >
              Height (Optional)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                step="0.1"
                min="0"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Enter height"
                className="input"
                style={{ flex: 1 }}
              />
              <select
                value={heightUnit}
                onChange={(e) => setHeightUnit(e.target.value as HeightUnit)}
                className="input"
                style={{ width: '120px' }}
              >
                <option value={HeightUnit.INCHES}>Inches</option>
                <option value={HeightUnit.CM}>CM</option>
              </select>
            </div>
          </div>

          {/* Age */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text)',
              }}
            >
              Age (Optional)
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter age"
              className="input"
            />
          </div>

          {/* Gender */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text)',
              }}
            >
              Gender (Optional)
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="input"
            >
              <option value="">Select gender</option>
              <option value={Gender.MALE}>Male</option>
              <option value={Gender.FEMALE}>Female</option>
              <option value={Gender.OTHER}>Other</option>
              <option value={Gender.PREFER_NOT_TO_SAY}>Prefer not to say</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{
                padding: '0.5rem 1rem',
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
              }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
