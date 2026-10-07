import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

const Header = () => {
  const { isAuthenticated, user, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoading) {
    return (
      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo">
            <h1>ZIMBANI</h1>
            <span className="logo-subtitle">FAB HOMES UGANDA</span>
          </Link>
          <div>Loading...</div>
        </div>
      </header>
    )
  }

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>ZIMBANI</h1>
          <span className="logo-subtitle">FAB HOMES UGANDA</span>
        </Link>
        
        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <div className="user-menu">
                <span className="user-info">
                  {user?.name || user?.email}
                </span>
                <button 
                  onClick={handleLogout}
                  className="btn-logout"
                  title="Logout"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link btn-login">Login</Link>
              <Link to="/register" className="nav-link btn-register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
