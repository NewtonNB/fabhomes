import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Auth Provider
import { AuthProvider } from './contexts/AuthContext'

// Protected Route Component
import ProtectedRoute from './components/auth/ProtectedRoute'

// Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

// Company Pages
import CompaniesList from './pages/companies/CompaniesList'
import CompanyForm from './pages/companies/CompanyForm'
import CompanyDetails from './pages/companies/CompanyDetails'

// Layout
import Layout from './components/layout/Layout'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />

            {/* Companies Routes */}
            <Route path="companies" element={<CompaniesList />} />
            <Route path="companies/create" element={<CompanyForm />} />
            <Route path="companies/:id" element={<CompanyDetails />} />
            <Route path="companies/:id/edit" element={<CompanyForm isEdit={true} />} />

            {/* Projects Routes */}
            <Route path="projects" element={<div>Projects List (Coming Soon)</div>} />
            <Route path="projects/create" element={<div>Create Project (Coming Soon)</div>} />
            <Route path="projects/:id" element={<div>Project Details (Coming Soon)</div>} />
            <Route path="projects/:id/edit" element={<div>Edit Project (Coming Soon)</div>} />

            {/* Sites Routes */}
            <Route path="sites" element={<div>Sites List (Coming Soon)</div>} />
            <Route path="sites/create" element={<div>Create Site (Coming Soon)</div>} />
            <Route path="sites/:id" element={<div>Site Details (Coming Soon)</div>} />
            <Route path="sites/:id/edit" element={<div>Edit Site (Coming Soon)</div>} />

            {/* Units Routes */}
            <Route path="units" element={<div>Units List (Coming Soon)</div>} />
            <Route path="units/create" element={<div>Create Unit (Coming Soon)</div>} />
            <Route path="units/:id" element={<div>Unit Details (Coming Soon)</div>} />
            <Route path="units/:id/edit" element={<div>Edit Unit (Coming Soon)</div>} />

            {/* Admin Routes */}
            <Route path="admin/users" element={<div>Users Management (Coming Soon)</div>} />
            <Route path="admin/roles" element={<div>Roles Management (Coming Soon)</div>} />
            <Route path="admin/activities" element={<div>Activity Logs (Coming Soon)</div>} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
