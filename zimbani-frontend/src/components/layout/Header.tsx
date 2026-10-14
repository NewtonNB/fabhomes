import { Link, useNavigate } from 'react-router-dom'
import { MdMenu } from 'react-icons/md'
import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

interface HeaderProps {
  onToggleSidebar?: () => void
}

const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { isAuthenticated, user, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    logout()
    navigate('/login')
  }

  if (isLoading) {
    return (
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <Link to="/" className="logo">
              <h1>ZIMBANI</h1>
              <span className="logo-subtitle">FAB HOMES UGANDA</span>
            </Link>
          </div>
          <div>Loading...</div>
        </div>
      </header>
    )
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          {isAuthenticated && onToggleSidebar && (
            <button 
              type="button" 
              className="btn-menu-toggle" 
              onClick={onToggleSidebar}
              aria-label="Toggle navigation menu"
            >
              <MdMenu />
            </button>
          )}
          <Link to="/" className="logo">
            <h1>ZIMBANI</h1>
            <span className="logo-subtitle">FAB HOMES UGANDA</span>
          </Link>
        </div>
        
        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link nav-link-dashboard">Dashboard</Link>
              <Link to="/profile" className="nav-link nav-link-profile">Profile</Link>
              <div className="user-menu">
                <span className="user-info" title={user?.email}>
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
