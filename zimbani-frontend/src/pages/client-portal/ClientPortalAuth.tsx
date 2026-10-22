import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdConstruction,
  MdLock,
  MdVpnKey,
  MdPersonAdd,
  MdFingerprint,
  MdArrowForward,
} from 'react-icons/md'
import { clientPortalAuthService } from '../../services/client-portal-auth.service'
import './ClientPortalLayout.css'

export const ClientPortalAuth: React.FC = () => {
  const navigate = useNavigate()

  const [authMode, setAuthMode] = useState<'signin_pin' | 'signin_password' | 'register'>('signin_pin')
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Registration State
  const [regForm, setRegForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    pin: '',
    city: 'Kampala',
  })

  // Handle PIN Sign In
  const handlePinSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const data = await clientPortalAuthService.pinLogin({
        login: loginIdentifier,
        pin,
      })

      // Store token and user
      localStorage.setItem('zimbani_token', data.token)
      localStorage.setItem('zimbani_user', JSON.stringify(data.user))

      // Trigger custom auth event so AuthContext updates instantly
      window.dispatchEvent(new CustomEvent('auth:refresh', { detail: data.user }))

      navigate('/client-portal')
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Quick-PIN sign-in failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Password Sign In
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const data = await clientPortalAuthService.login({
        login: loginIdentifier,
        password,
      })

      localStorage.setItem('zimbani_token', data.token)
      localStorage.setItem('zimbani_user', JSON.stringify(data.user))
      window.dispatchEvent(new CustomEvent('auth:refresh', { detail: data.user }))

      navigate('/client-portal')
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Sign in failed. Check credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Biometric Login
  const handleBiometricSignIn = async () => {
    setErrorMessage(null)
    const storedCredId = localStorage.getItem('fab_biometric_cred_id')
    if (!storedCredId) {
      setErrorMessage('No biometric credential found on this device. Please sign in with password first.')
      return
    }

    setIsSubmitting(true)
    try {
      const data = await clientPortalAuthService.biometricLogin(storedCredId)

      localStorage.setItem('zimbani_token', data.token)
      localStorage.setItem('zimbani_user', JSON.stringify(data.user))
      window.dispatchEvent(new CustomEvent('auth:refresh', { detail: data.user }))

      navigate('/client-portal')
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Biometric authentication failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (regForm.password !== regForm.password_confirmation) {
      setErrorMessage('Passwords do not match.')
      return
    }

    if (regForm.pin && !/^[0-9]{4,6}$/.test(regForm.pin)) {
      setErrorMessage('Quick-PIN must be 4 to 6 numeric digits.')
      return
    }

    setIsSubmitting(true)
    try {
      const data = await clientPortalAuthService.register(regForm)

      localStorage.setItem('zimbani_token', data.token)
      localStorage.setItem('zimbani_user', JSON.stringify(data.user))
      window.dispatchEvent(new CustomEvent('auth:refresh', { detail: data.user }))

      navigate('/client-portal')
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Registration failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 16,
          padding: '28px 24px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            className="portal-logo-icon"
            style={{ width: 48, height: 48, margin: '0 auto 12px auto', fontSize: 24 }}
          >
            <MdConstruction />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0' }}>FAB HOMES CLIENT PORTAL</h2>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Savings Schemes • Plots • Construction Milestones
          </span>
        </div>

        {/* Mode Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#090d16',
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin_pin')
              setErrorMessage(null)
            }}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: authMode === 'signin_pin' ? '#1e293b' : 'transparent',
              color: authMode === 'signin_pin' ? '#fff' : '#94a3b8',
            }}
          >
            Quick-PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin_password')
              setErrorMessage(null)
            }}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: authMode === 'signin_password' ? '#1e293b' : 'transparent',
              color: authMode === 'signin_password' ? '#fff' : '#94a3b8',
            }}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register')
              setErrorMessage(null)
            }}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: authMode === 'register' ? '#1e293b' : 'transparent',
              color: authMode === 'register' ? '#fff' : '#94a3b8',
            }}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* QUICK PIN SIGN IN */}
        {authMode === 'signin_pin' && (
          <form onSubmit={handlePinSignIn}>
            <div className="portal-input-group">
              <label>Email, Phone, or Client ID</label>
              <input
                type="text"
                placeholder="e.g. 0772... or client@domain.com"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="portal-input"
                required
              />
            </div>

            <div className="portal-input-group">
              <label>4 to 6 Digit Quick-PIN</label>
              <input
                type="password"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="portal-input"
                style={{ letterSpacing: '0.3em', fontSize: 18 }}
                required
              />
            </div>

            <button
              type="submit"
              className="portal-btn-primary"
              style={{ width: '100%', marginTop: 12 }}
              disabled={isSubmitting}
            >
              <MdVpnKey /> {isSubmitting ? 'Unlocking...' : 'Sign In with Quick-PIN'}
            </button>

            {/* Biometric One-Tap Option */}
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleBiometricSignIn}
                className="portal-btn-secondary"
                style={{ width: '100%', fontSize: 12 }}
              >
                <MdFingerprint style={{ fontSize: 18, color: '#34d399' }} /> Use Biometrics (Face ID / Fingerprint)
              </button>
            </div>
          </form>
        )}

        {/* PASSWORD SIGN IN */}
        {authMode === 'signin_password' && (
          <form onSubmit={handlePasswordSignIn}>
            <div className="portal-input-group">
              <label>Email or Phone Number</label>
              <input
                type="text"
                placeholder="name@example.com or +256..."
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="portal-input"
                required
              />
            </div>

            <div className="portal-input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="portal-input"
                required
              />
            </div>

            <button
              type="submit"
              className="portal-btn-primary"
              style={{ width: '100%', marginTop: 12 }}
              disabled={isSubmitting}
            >
              <MdLock /> {isSubmitting ? 'Signing In...' : 'Sign In with Password'}
            </button>
          </form>
        )}

        {/* ONBOARDING REGISTRATION */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="portal-input-group">
                <label>First Name</label>
                <input
                  type="text"
                  placeholder="Kigozi"
                  value={regForm.first_name}
                  onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                  className="portal-input"
                  required
                />
              </div>
              <div className="portal-input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  placeholder="Mukasa"
                  value={regForm.last_name}
                  onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                  className="portal-input"
                  required
                />
              </div>
            </div>

            <div className="portal-input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                className="portal-input"
                required
              />
            </div>

            <div className="portal-input-group">
              <label>Mobile Phone (+256...)</label>
              <input
                type="tel"
                placeholder="+256 700 000 000"
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                className="portal-input"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="portal-input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Min 8 chars"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  className="portal-input"
                  required
                />
              </div>
              <div className="portal-input-group">
                <label>Confirm</label>
                <input
                  type="password"
                  placeholder="Repeat"
                  value={regForm.password_confirmation}
                  onChange={(e) => setRegForm({ ...regForm, password_confirmation: e.target.value })}
                  className="portal-input"
                  required
                />
              </div>
            </div>

            <div className="portal-input-group">
              <label>Initial 4-Digit Quick-PIN (Optional)</label>
              <input
                type="password"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="4-digit quick PIN"
                value={regForm.pin}
                onChange={(e) => setRegForm({ ...regForm, pin: e.target.value.replace(/[^0-9]/g, '') })}
                className="portal-input"
              />
            </div>

            <button
              type="submit"
              className="portal-btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={isSubmitting}
            >
              <MdPersonAdd /> {isSubmitting ? 'Creating Profile...' : 'Complete Self-Service Onboarding'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #1e293b', paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Staff & Administrator Login <MdArrowForward style={{ verticalAlign: 'middle' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClientPortalAuth
