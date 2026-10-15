import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Auth Provider
import { AuthProvider } from './contexts/AuthContext'

// Protected Route Component
import ProtectedRoute from './components/auth/ProtectedRoute'
import PermissionRoute from './components/auth/PermissionRoute'

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
import ProjectDetails from './pages/projects/ProjectDetails'

// Site Pages
import SitesList from './pages/sites/SitesList'
import SiteForm from './pages/sites/SiteForm'
import SiteDetails from './pages/sites/SiteDetails'

// Unit Pages
import UnitsList from './pages/units/UnitsList'
import UnitForm from './pages/units/UnitForm'
import UnitDetails from './pages/units/UnitDetails'

// Client Pages
import ClientsList from './pages/clients/ClientsList'
import ClientForm from './pages/clients/ClientForm'
import ClientDetails from './pages/clients/ClientDetails'

// Payment Pages
import PaymentsList from './pages/payments/PaymentsList'
import PaymentForm from './pages/payments/PaymentForm'
import PaymentDetails from './pages/payments/PaymentDetails'

// Document Pages
import DocumentsPage from './pages/documents/DocumentsPage'

// Task Pages
import TasksList from './pages/tasks/TasksList'
import TaskForm from './pages/tasks/TaskForm'
import TaskDetails from './pages/tasks/TaskDetails'

// Material & Inventory Pages
import MaterialsList from './pages/materials/MaterialsList'
import MaterialForm from './pages/materials/MaterialForm'

// Admin Pages
import UsersList from './pages/admin/UsersList'
import RolesList from './pages/admin/RolesList'
import ActivityLogs from './pages/admin/ActivityLogs'

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
            <Route
              path="companies"
              element={
                <PermissionRoute permission="view companies">
                  <CompaniesList />
                </PermissionRoute>
              }
            />
            <Route
              path="companies/create"
              element={
                <PermissionRoute permission="create companies">
                  <CompanyForm />
                </PermissionRoute>
              }
            />
            <Route
              path="companies/:id"
              element={
                <PermissionRoute permission="view companies">
                  <CompanyDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="companies/:id/edit"
              element={
                <PermissionRoute permission="edit companies">
                  <CompanyForm isEdit={true} />
                </PermissionRoute>
              }
            />

            {/* Projects Routes */}
            <Route
              path="projects"
              element={
                <PermissionRoute permission="view projects">
                  <ProjectsList />
                </PermissionRoute>
              }
            />
            <Route
              path="projects/create"
              element={
                <PermissionRoute permission="create projects">
                  <ProjectForm />
                </PermissionRoute>
              }
            />
            <Route
              path="projects/:id"
              element={
                <PermissionRoute permission="view projects">
                  <ProjectDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="projects/:id/edit"
              element={
                <PermissionRoute permission="edit projects">
                  <ProjectForm isEdit={true} />
                </PermissionRoute>
              }
            />

            {/* Sites Routes */}
            <Route
              path="sites"
              element={
                <PermissionRoute permission="view sites">
                  <SitesList />
                </PermissionRoute>
              }
            />
            <Route
              path="sites/new"
              element={
                <PermissionRoute permission="create sites">
                  <SiteForm />
                </PermissionRoute>
              }
            />
            <Route
              path="sites/:id"
              element={
                <PermissionRoute permission="view sites">
                  <SiteDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="sites/:id/edit"
              element={
                <PermissionRoute permission="edit sites">
                  <SiteForm />
                </PermissionRoute>
              }
            />

            {/* Units Routes */}
            <Route
              path="units"
              element={
                <PermissionRoute permission="view units">
                  <UnitsList />
                </PermissionRoute>
              }
            />
            <Route
              path="units/new"
              element={
                <PermissionRoute permission="create units">
                  <UnitForm />
                </PermissionRoute>
              }
            />
            <Route
              path="units/:uuid"
              element={
                <PermissionRoute permission="view units">
                  <UnitDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="units/:uuid/edit"
              element={
                <PermissionRoute permission="edit units">
                  <UnitForm />
                </PermissionRoute>
              }
            />

            {/* Clients Routes */}
            <Route
              path="clients"
              element={
                <PermissionRoute permission="view clients">
                  <ClientsList />
                </PermissionRoute>
              }
            />
            <Route
              path="clients/new"
              element={
                <PermissionRoute permission="create clients">
                  <ClientForm />
                </PermissionRoute>
              }
            />
            <Route
              path="clients/:uuid"
              element={
                <PermissionRoute permission="view clients">
                  <ClientDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="clients/edit/:uuid"
              element={
                <PermissionRoute permission="edit clients">
                  <ClientForm />
                </PermissionRoute>
              }
            />

            {/* Payments Routes */}
            <Route
              path="payments"
              element={
                <PermissionRoute permission="view payments">
                  <PaymentsList />
                </PermissionRoute>
              }
            />
            <Route
              path="payments/new"
              element={
                <PermissionRoute permission="create payments">
                  <PaymentForm />
                </PermissionRoute>
              }
            />
            <Route
              path="payments/:uuid"
              element={
                <PermissionRoute permission="view payments">
                  <PaymentDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="payments/:uuid/edit"
              element={
                <PermissionRoute permission="edit payments">
                  <PaymentForm isEdit={true} />
                </PermissionRoute>
              }
            />

            {/* Documents Routes */}
            <Route
              path="documents"
              element={
                <PermissionRoute permission="view documents">
                  <DocumentsPage />
                </PermissionRoute>
              }
            />

            {/* Tasks & Milestones Routes */}
            <Route
              path="tasks"
              element={
                <PermissionRoute permission="view tasks">
                  <TasksList />
                </PermissionRoute>
              }
            />
            <Route
              path="tasks/new"
              element={
                <PermissionRoute permission="create tasks">
                  <TaskForm />
                </PermissionRoute>
              }
            />
            <Route
              path="tasks/:id"
              element={
                <PermissionRoute permission="view tasks">
                  <TaskDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="tasks/:id/edit"
              element={
                <PermissionRoute permission="edit tasks">
                  <TaskForm />
                </PermissionRoute>
              }
            />

            {/* Materials & Inventory Routes */}
            <Route
              path="materials"
              element={
                <PermissionRoute permission="view materials">
                  <MaterialsList />
                </PermissionRoute>
              }
            />
            <Route
              path="materials/new"
              element={
                <PermissionRoute permission="create materials">
                  <MaterialForm />
                </PermissionRoute>
              }
            />
            <Route
              path="materials/:id/edit"
              element={
                <PermissionRoute permission="edit materials">
                  <MaterialForm />
                </PermissionRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="admin/users"
              element={
                <PermissionRoute roles={['Super Admin', 'Admin']}>
                  <UsersList />
                </PermissionRoute>
              }
            />
            <Route
              path="admin/roles"
              element={
                <PermissionRoute roles={['Super Admin', 'Admin']}>
                  <RolesList />
                </PermissionRoute>
              }
            />
            <Route
              path="admin/activities"
              element={
                <PermissionRoute roles={['Super Admin', 'Admin']}>
                  <ActivityLogs />
                </PermissionRoute>
              }
            />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
