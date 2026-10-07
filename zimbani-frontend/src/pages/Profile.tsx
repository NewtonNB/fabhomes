import { useState, FormEvent, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Profile.css'

const Profile = () => {
  const { user, updateProfile, logout, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  })
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        password_confirmation: '',
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear messages when user types
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = (): boolean => {
    // Check required fields
    if (!formData.name || !formData.email) {
      setError('Name and email are required')
      return false
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    // If password is being changed, validate it
    if (formData.password) {
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long')
        return false
      }
      
      if (formData.password !== formData.password_confirmation) {
        setError('Passwords do not match')
        return false
      }
    }

    // Validate phone format if provided
    if (formData.phone && !formData.phone.match(/^\+256\d{9}$/)) {
      setError('Phone number must be in format: +256XXXXXXXXX')
      return false
    }

    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Prepare update data (only include fields that changed)
      const updateData: any = {}
      
      if (formData.name !== user?.name) {
        updateData.name = formData.name
      }
      
      if (formData.email !== user?.email) {
        updateData.email = formData.email
      }
      
      if (formData.phone !== user?.phone) {
        updateData.phone = formData.phone || undefined
      }
      
      if (formData.password) {
        updateData.password = formData.password
        updateData.password_confirmation = formData.password_confirmation
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        setError('No changes to save')
        setIsLoading(false)
        return
      }

      await updateProfile(updateData)
      
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        password: '',
        password_confirmation: '',
      }))
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form to current user data
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        password_confirmation: '',
      })
    }
    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (!user) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="page-title">My Profile</h1>

      <div className="profile-grid">
        {/* Profile Information Card */}
        <div className="card">
          <div className="card-header">
            <h3>Profile Information</h3>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="btn btn-secondary"
              >
                Edit Profile
              </button>
            )}
          </div>

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+256700000000"
                  disabled={isLoading}
                />
                <small>Format: +256XXXXXXXXX</small>
              </div>

              <div className="form-divider">
                <span>Change Password (Optional)</span>
              </div>

              <div className="form-group">
                <label htmlFor="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password_confirmation">Confirm New Password</label>
                <input
                  type="password"
                  id="password_confirmation"
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={handleCancel}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <div className="detail-row">
                <label>Full Name:</label>
                <span>{user.name}</span>
              </div>
              <div className="detail-row">
                <label>Email:</label>
                <span>{user.email}</span>
              </div>
              <div className="detail-row">
                <label>Phone:</label>
                <span>{user.phone || 'Not provided'}</span>
              </div>
              <div className="detail-row">
                <label>UUID:</label>
                <span className="uuid">{user.uuid}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span className={`status status-${user.status}`}>
                  {user.status}
                </span>
              </div>
              <div className="detail-row">
                <label>Last Login:</label>
                <span>
                  {user.last_login_at 
                    ? new Date(user.last_login_at).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Account Details Card */}
        <div className="card">
          <h3>Account Details</h3>
          
          <div className="profile-details">
            <div className="detail-row">
              <label>Roles:</label>
              <div className="badges">
                {user.roles?.map((role, index) => (
                  <span key={index} className="badge badge-primary">
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {user.permissions && user.permissions.length > 0 && (
              <div className="detail-row">
                <label>Permissions:</label>
                <span>{user.permissions.length} permissions</span>
              </div>
            )}

            <div className="detail-row">
              <label>Member Since:</label>
              <span>
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="detail-row">
              <label>Email Verified:</label>
              <span>
                {user.email_verified_at ? (
                  <span className="verified">✓ Verified</span>
                ) : (
                  <span className="unverified">Not verified</span>
                )}
              </span>
            </div>
          </div>

          <div className="danger-zone">
            <h4>Danger Zone</h4>
            <button 
              onClick={handleLogout}
              className="btn btn-danger"
              disabled={authLoading}
            >
              {authLoading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
