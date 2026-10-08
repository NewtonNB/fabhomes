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

// Project Pages
import ProjectsList from './pages/projects/ProjectsList'
import ProjectForm from './pages/projects/ProjectForm'

// Site Pages
import SitesList from './pages/sites/SitesList'
import SiteForm from './pages/sites/SiteForm'
import SiteDetails from './pages/sites/SiteDetails'

// Unit Pages
import UnitsList from './pages/units/UnitsList'
import UnitForm from './pages/units/UnitForm'
import UnitDetails from './pages/units/UnitDetails'

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
            <Route path="projects" element={<ProjectsList />} />
            <Route path="projects/create" element={<ProjectForm />} />
            <Route path="projects/:id" element={<div>Project Details (Coming Soon)</div>} />
            <Route path="projects/:id/edit" element={<ProjectForm isEdit={true} />} />

            {/* Sites Routes */}
            <Route path="sites" element={<SitesList />} />
            <Route path="sites/new" element={<SiteForm />} />
            <Route path="sites/:id" element={<SiteDetails />} />
            <Route path="sites/:id/edit" element={<SiteForm />} />

            {/* Units Routes */}
            <Route path="units" element={<UnitsList />} />
            <Route path="units/new" element={<UnitForm />} />
            <Route path="units/:uuid" element={<UnitDetails />} />
            <Route path="units/:uuid/edit" element={<UnitForm />} />

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
