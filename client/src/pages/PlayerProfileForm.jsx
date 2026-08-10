import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function PlayerProfileForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, playerProfile, setPlayerProfile, fetchPlayerProfile } = useAuth();
  const fileInputRef = useRef(null);

  const isEditMode = location.pathname === '/player/profile/edit';

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    admissionNumber: '',
    departmentName: '',
    phoneNumber: '',
    position: '',
    jerseyNumber: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch config (departments & positions)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [deptRes, posRes] = await Promise.all([
          api.get('/config/departments'),
          api.get('/config/positions'),
        ]);
        setDepartments(deptRes.data.departments);
        setPositions(posRes.data.positions);
      } catch {
        setServerError('Failed to load configuration. Please refresh.');
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && playerProfile) {
      setFormData({
        name: playerProfile.name || '',
        admissionNumber: playerProfile.admissionNumber || '',
        departmentName: playerProfile.departmentName || '',
        phoneNumber: playerProfile.phoneNumber || '',
        position: playerProfile.position || '',
        jerseyNumber: playerProfile.jerseyNumber?.toString() || '',
      });
      if (playerProfile.photo) {
        setPhotoPreview(`http://localhost:5000${playerProfile.photo}`);
      }
    } else if (!isEditMode && user) {
      // Pre-fill name from auth user for new profile
      setFormData((prev) => ({ ...prev, name: user.name || '' }));
    }
  }, [isEditMode, playerProfile, user]);

  // Redirect if creating but profile already exists
  useEffect(() => {
    if (!isEditMode && playerProfile) {
      navigate('/player/profile', { replace: true });
    }
  }, [isEditMode, playerProfile, navigate]);

  // Redirect if editing but no profile exists
  useEffect(() => {
    if (isEditMode && !playerProfile && !loading) {
      navigate('/player/profile/create', { replace: true });
    }
  }, [isEditMode, playerProfile, loading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
    if (successMsg) setSuccessMsg('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: 'Only JPEG, PNG, and WebP images are allowed.' }));
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: 'File size must be less than 2MB.' }));
      return;
    }

    setPhotoFile(file);
    setRemovePhoto(false);
    setErrors((prev) => ({ ...prev, photo: '' }));

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required.';
    }

    if (!isEditMode) {
      if (!formData.admissionNumber.trim()) {
        newErrors.admissionNumber = 'Admission number is required.';
      } else if (formData.admissionNumber.trim().length < 2) {
        newErrors.admissionNumber = 'Admission number must be at least 2 characters.';
      }

      if (!formData.departmentName) {
        newErrors.departmentName = 'Department is required.';
      }
    }

    if (formData.phoneNumber && !/^[0-9]{10}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Phone number must be a valid 10-digit number.';
    }

    if (!formData.position) {
      newErrors.position = 'Position is required.';
    }

    if (!formData.jerseyNumber) {
      newErrors.jerseyNumber = 'Jersey number is required.';
    } else {
      const num = parseInt(formData.jerseyNumber, 10);
      if (isNaN(num) || num < 1 || num > 99) {
        newErrors.jerseyNumber = 'Jersey number must be between 1 and 99.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');

    if (!validate()) return;

    setLoading(true);
    try {
      const data = new FormData();

      if (isEditMode) {
        // Only send editable fields
        data.append('name', formData.name.trim());
        if (formData.phoneNumber) data.append('phoneNumber', formData.phoneNumber.trim());
        else data.append('phoneNumber', '');
        data.append('position', formData.position);
        data.append('jerseyNumber', formData.jerseyNumber);
        if (removePhoto) data.append('removePhoto', 'true');
      } else {
        // Send all fields for creation
        data.append('name', formData.name.trim());
        data.append('admissionNumber', formData.admissionNumber.trim());
        data.append('departmentName', formData.departmentName);
        if (formData.phoneNumber) data.append('phoneNumber', formData.phoneNumber.trim());
        data.append('position', formData.position);
        data.append('jerseyNumber', formData.jerseyNumber);
      }

      if (photoFile) {
        data.append('photo', photoFile);
      }

      let res;
      if (isEditMode) {
        res = await api.put('/players/me', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/players/profile', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setPlayerProfile(res.data.player);
      setSuccessMsg(res.data.message);

      // Navigate to profile view after a brief delay
      setTimeout(() => {
        navigate('/player/profile', { replace: true });
      }, 800);
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (configLoading) {
    return (
      <div className="dashboard-layout">
        <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <div className="brand-icon-sm">⚽</div>
          <h1>Nutmeg Manager</h1>
        </div>
        <div className="dashboard-header-actions">
          <span className="role-badge player">🏃 Player</span>
          <button
            className="btn btn-ghost"
            onClick={() => navigate(isEditMode ? '/player/profile' : '/player/dashboard')}
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="dashboard-content">
        <div className="profile-form-container glass-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
          <div className="brand-header">
            <h1 className="brand-title" style={{ fontSize: 'var(--font-size-2xl)' }}>
              {isEditMode ? 'Edit Profile' : 'Complete Your Profile'}
            </h1>
            <p className="brand-subtitle">
              {isEditMode
                ? 'Update your player information'
                : 'Set up your football profile to get started'}
            </p>
          </div>

          {/* Alerts */}
          {serverError && <div className="alert alert-error">{serverError}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Photo Upload */}
            <div className="form-group">
              <label className="form-label">Profile Photo</label>
              <div className="photo-upload-area">
                <div
                  className="photo-preview-container"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" className="photo-preview-img" />
                  ) : (
                    <div className="photo-placeholder">
                      <span className="photo-placeholder-icon">📷</span>
                      <span className="photo-placeholder-text">Click to upload</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
                <div className="photo-upload-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleRemovePhoto}
                      disabled={loading}
                      style={{ color: 'var(--color-error)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span className="photo-hint">JPEG, PNG, or WebP · Max 2MB</span>
              </div>
              {errors.photo && <span className="form-error">{errors.photo}</span>}
            </div>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="profile-name" className="form-label">
                Full Name <span className="required-star">*</span>
              </label>
              <input
                id="profile-name"
                name="name"
                type="text"
                className={`form-input${errors.name ? ' error' : ''}`}
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            {/* Admission Number */}
            <div className="form-group">
              <label htmlFor="profile-admission" className="form-label">
                Admission Number <span className="required-star">*</span>
                {isEditMode && (
                  <span className="field-locked-badge">🔒 Locked</span>
                )}
              </label>
              <input
                id="profile-admission"
                name="admissionNumber"
                type="text"
                className={`form-input${errors.admissionNumber ? ' error' : ''}${isEditMode ? ' readonly' : ''}`}
                placeholder="e.g. RIT2024MCA001"
                value={formData.admissionNumber}
                onChange={handleChange}
                disabled={loading || isEditMode}
                readOnly={isEditMode}
              />
              {errors.admissionNumber && (
                <span className="form-error">{errors.admissionNumber}</span>
              )}
              {isEditMode && (
                <span className="field-hint">Admission number cannot be changed after creation.</span>
              )}
            </div>

            {/* Department */}
            <div className="form-group">
              <label htmlFor="profile-department" className="form-label">
                Department <span className="required-star">*</span>
                {isEditMode && (
                  <span className="field-locked-badge">🔒 Locked</span>
                )}
              </label>
              <select
                id="profile-department"
                name="departmentName"
                className={`form-input form-select${errors.departmentName ? ' error' : ''}${isEditMode ? ' readonly' : ''}`}
                value={formData.departmentName}
                onChange={handleChange}
                disabled={loading || isEditMode}
              >
                <option value="">Select your department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.departmentName && (
                <span className="form-error">{errors.departmentName}</span>
              )}
              {isEditMode && (
                <span className="field-hint">Department cannot be changed (team eligibility).</span>
              )}
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="profile-phone" className="form-label">
                Phone Number
              </label>
              <input
                id="profile-phone"
                name="phoneNumber"
                type="tel"
                className={`form-input${errors.phoneNumber ? ' error' : ''}`}
                placeholder="10-digit phone number"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={loading}
                maxLength={10}
              />
              {errors.phoneNumber && (
                <span className="form-error">{errors.phoneNumber}</span>
              )}
            </div>

            {/* Position & Jersey — side by side */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="profile-position" className="form-label">
                  Position <span className="required-star">*</span>
                </label>
                <select
                  id="profile-position"
                  name="position"
                  className={`form-input form-select${errors.position ? ' error' : ''}`}
                  value={formData.position}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select position</option>
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                {errors.position && (
                  <span className="form-error">{errors.position}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="profile-jersey" className="form-label">
                  Jersey Number <span className="required-star">*</span>
                </label>
                <input
                  id="profile-jersey"
                  name="jerseyNumber"
                  type="number"
                  min="1"
                  max="99"
                  className={`form-input${errors.jerseyNumber ? ' error' : ''}`}
                  placeholder="1-99"
                  value={formData.jerseyNumber}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.jerseyNumber && (
                  <span className="form-error">{errors.jerseyNumber}</span>
                )}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
              {loading ? (
                <>
                  <span className="spinner" />
                  {isEditMode ? 'Saving...' : 'Creating Profile...'}
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Create Profile'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default PlayerProfileForm;
