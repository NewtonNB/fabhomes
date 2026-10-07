import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <h1 style={{ fontSize: '72px', color: '#1976d2' }}>404</h1>
      <h2>Page Not Found</h2>
      <p style={{ marginTop: '20px', marginBottom: '30px' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="btn btn-primary">
        Go to Dashboard
      </Link>
    </div>
  )
}

export default NotFound
