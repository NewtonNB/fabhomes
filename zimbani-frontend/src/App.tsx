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

// Equipment & Machinery Pages
import EquipmentList from './pages/equipment/EquipmentList'
import EquipmentForm from './pages/equipment/EquipmentForm'

// Site Quality Control & Inspection Pages
import InspectionsList from './pages/inspections/InspectionsList'
import InspectionForm from './pages/inspections/InspectionForm'
import InspectionDetails from './pages/inspections/InspectionDetails'

// Site Safety & Daily Logs Pages
import DailyLogsList from './pages/daily-logs/DailyLogsList'
import DailyLogForm from './pages/daily-logs/DailyLogForm'
import DailyLogDetails from './pages/daily-logs/DailyLogDetails'

// Savings Accounts Pages
import SavingsAccountsList from './pages/savings-accounts/SavingsAccountsList'
import SavingsAccountForm from './pages/savings-accounts/SavingsAccountForm'
import SavingsAccountDetails from './pages/savings-accounts/SavingsAccountDetails'

// Financial Transactions & Ledger Pages
import TransactionsList from './pages/transactions/TransactionsList'
import TransactionDetails from './pages/transactions/TransactionDetails'

// Subcontractor Contracts & Payment Certificates Pages
import ContractsList from './pages/contracts/ContractsList'
import ContractForm from './pages/contracts/ContractForm'
import ContractDetails from './pages/contracts/ContractDetails'
import CertificatesList from './pages/certificates/CertificatesList'
import CertificateForm from './pages/certificates/CertificateForm'
import CertificateDetails from './pages/certificates/CertificateDetails'

// Petty Cash & Expense Claims Pages (Phase 7 Day 4)
import { PettyCashList } from './pages/petty-cash/PettyCashList'
import { PettyCashForm } from './pages/petty-cash/PettyCashForm'
import { PettyCashDetails } from './pages/petty-cash/PettyCashDetails'
import { ExpenseClaimsList } from './pages/expenses/ExpenseClaimsList'
import { ExpenseClaimForm } from './pages/expenses/ExpenseClaimForm'
import { ExpenseClaimDetails } from './pages/expenses/ExpenseClaimDetails'

// Financial Reporting, Cost Accounting & Auditing (Phase 7 Day 5)
import { FinancialReportsDashboard } from './pages/financial-reports/FinancialReportsDashboard'

// Milestone Releases & Physical Verification Pages (Phase 8 Day 1)
import { MilestoneReleasesList } from './pages/milestone-releases/MilestoneReleasesList'

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

            {/* Savings Accounts Routes */}
            <Route
              path="savings-accounts"
              element={
                <PermissionRoute permission="accounts.view">
                  <SavingsAccountsList />
                </PermissionRoute>
              }
            />
            <Route
              path="savings-accounts/new"
              element={
                <PermissionRoute permission="accounts.create">
                  <SavingsAccountForm />
                </PermissionRoute>
              }
            />
            <Route
              path="savings-accounts/:id"
              element={
                <PermissionRoute permission="accounts.view">
                  <SavingsAccountDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="savings-accounts/:id/edit"
              element={
                <PermissionRoute permission="accounts.update">
                  <SavingsAccountForm />
                </PermissionRoute>
              }
            />

            {/* Financial Transactions & Ledger Routes */}
            <Route
              path="transactions"
              element={
                <PermissionRoute permission="transactions.view">
                  <TransactionsList />
                </PermissionRoute>
              }
            />
            <Route
              path="transactions/:id"
              element={
                <PermissionRoute permission="transactions.view">
                  <TransactionDetails />
                </PermissionRoute>
              }
            />

            {/* Subcontractor Contracts Routes */}
            <Route
              path="contracts"
              element={
                <PermissionRoute permission="view contracts">
                  <ContractsList />
                </PermissionRoute>
              }
            />
            <Route
              path="contracts/new"
              element={
                <PermissionRoute permission="create contracts">
                  <ContractForm />
                </PermissionRoute>
              }
            />
            <Route
              path="contracts/:id"
              element={
                <PermissionRoute permission="view contracts">
                  <ContractDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="contracts/:id/edit"
              element={
                <PermissionRoute permission="edit contracts">
                  <ContractForm />
                </PermissionRoute>
              }
            />

            {/* Payment Certificates & Valuations Routes */}
            <Route
              path="payment-certificates"
              element={
                <PermissionRoute permission="certificates.view">
                  <CertificatesList />
                </PermissionRoute>
              }
            />
            <Route
              path="certificates/new"
              element={
                <PermissionRoute permission="certificates.create">
                  <CertificateForm />
                </PermissionRoute>
              }
            />
            <Route
              path="payment-certificates/new"
              element={
                <PermissionRoute permission="certificates.create">
                  <CertificateForm />
                </PermissionRoute>
              }
            />
            <Route
              path="certificates/:id"
              element={
                <PermissionRoute permission="certificates.view">
                  <CertificateDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="payment-certificates/:id"
              element={
                <PermissionRoute permission="certificates.view">
                  <CertificateDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="certificates/:id/edit"
              element={
                <PermissionRoute permission="certificates.update">
                  <CertificateForm />
                </PermissionRoute>
              }
            />

            {/* Petty Cash Accounts & Float Ledger Routes (Phase 7 Day 4) */}
            <Route
              path="petty-cash"
              element={
                <PermissionRoute permission="view petty cash">
                  <PettyCashList />
                </PermissionRoute>
              }
            />
            <Route
              path="petty-cash/new"
              element={
                <PermissionRoute permission="create petty cash">
                  <PettyCashForm />
                </PermissionRoute>
              }
            />
            <Route
              path="petty-cash/:id"
              element={
                <PermissionRoute permission="view petty cash">
                  <PettyCashDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="petty-cash/:id/edit"
              element={
                <PermissionRoute permission="edit petty cash">
                  <PettyCashForm />
                </PermissionRoute>
              }
            />

            {/* Expense Claims & Direct Purchasing Routes (Phase 7 Day 4) */}
            <Route
              path="expenses"
              element={
                <PermissionRoute permission="view expenses">
                  <ExpenseClaimsList />
                </PermissionRoute>
              }
            />
            <Route
              path="expenses/new"
              element={
                <PermissionRoute permission="create expenses">
                  <ExpenseClaimForm />
                </PermissionRoute>
              }
            />
            <Route
              path="expenses/:id"
              element={
                <PermissionRoute permission="view expenses">
                  <ExpenseClaimDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="expenses/:id/edit"
              element={
                <PermissionRoute permission="edit expenses">
                  <ExpenseClaimForm />
                </PermissionRoute>
              }
            />

            {/* Financial Reports, Auditing & Cost Accounting (Phase 7 Day 5) */}
            <Route
              path="financial-reports"
              element={
                <PermissionRoute roles={['Super Admin', 'Admin', 'Finance Manager', 'Finance Officer', 'Company Admin', 'Site Manager', 'Project Manager', 'Director']}>
                  <FinancialReportsDashboard />
                </PermissionRoute>
              }
            />

            {/* Milestone-Based Payment Releases & Construction Verification (Phase 8 Day 1) */}
            <Route
              path="milestone-releases"
              element={
                <PermissionRoute roles={['Super Admin', 'Admin', 'Finance Manager', 'Finance Officer', 'Company Admin', 'Site Manager', 'Project Manager', 'Director', 'Site Engineer', 'Quantity Surveyor']}>
                  <MilestoneReleasesList />
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

            {/* Equipment & Machinery Routes */}
            <Route
              path="equipment"
              element={
                <PermissionRoute permission="equipment.view">
                  <EquipmentList />
                </PermissionRoute>
              }
            />
            <Route
              path="equipment/new"
              element={
                <PermissionRoute permission="equipment.create">
                  <EquipmentForm />
                </PermissionRoute>
              }
            />
            <Route
              path="equipment/:id/edit"
              element={
                <PermissionRoute permission="equipment.update">
                  <EquipmentForm />
                </PermissionRoute>
              }
            />

            {/* Site Quality Control & Inspections Routes */}
            <Route
              path="inspections"
              element={
                <PermissionRoute permission="inspections.view">
                  <InspectionsList />
                </PermissionRoute>
              }
            />
            <Route
              path="inspections/new"
              element={
                <PermissionRoute permission="inspections.create">
                  <InspectionForm />
                </PermissionRoute>
              }
            />
            <Route
              path="inspections/:id"
              element={
                <PermissionRoute permission="inspections.view">
                  <InspectionDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="inspections/:id/edit"
              element={
                <PermissionRoute permission="inspections.update">
                  <InspectionForm />
                </PermissionRoute>
              }
            />

            {/* Site Daily Logs & Safety Routes */}
            <Route
              path="daily-logs"
              element={
                <PermissionRoute permission="daily-logs.view">
                  <DailyLogsList />
                </PermissionRoute>
              }
            />
            <Route
              path="daily-logs/new"
              element={
                <PermissionRoute permission="daily-logs.create">
                  <DailyLogForm />
                </PermissionRoute>
              }
            />
            <Route
              path="daily-logs/:id"
              element={
                <PermissionRoute permission="daily-logs.view">
                  <DailyLogDetails />
                </PermissionRoute>
              }
            />
            <Route
              path="daily-logs/:id/edit"
              element={
                <PermissionRoute permission="daily-logs.update">
                  <DailyLogForm />
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
