import React, { useState, useEffect } from 'react'
import {
  MdPeople,
  MdPersonAdd,
  MdEmail,
  MdAttachMoney,
  MdGrade,
  MdEventBusy,
  MdBusiness,
  MdEdit,
  MdClose,
  MdReceipt,
  MdPrint,
  MdHomeWork,
  MdVerified,
  MdQrCode2,
} from 'react-icons/md'
import employeeService, { Employee, Department, LeaveRequest, EmployeeStatistics } from '../../services/employee.service'
import { BulkEmailModal } from '../../components/common/BulkEmailModal'
import { formatAmountInWords } from '../../utils/numberToWords'
import './EmployeesPage.css'

export const EmployeesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'salaries' | 'grades' | 'leave' | 'departments'>('employees')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [statistics, setStatistics] = useState<EmployeeStatistics | null>(null)
  const [loading, setLoading] = useState(true); void loading;
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('')
  const [selectedEmployeeForPayslip, setSelectedEmployeeForPayslip] = useState<Employee | null>(null)
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  // Employee Form State
  const [empForm, setEmpForm] = useState({
    first_name: '',
    last_name: '',
    nin: '',
    gender: 'male' as 'male' | 'female',
    phone: '',
    email: '',
    district: 'Kampala',
    position: '',
    department_id: '',
    salary_grade: 'G-4',
    base_salary: 2500000,
    status: 'active' as 'active' | 'on_leave' | 'suspended' | 'terminated',
  })

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'annual' as const,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    days_count: 5,
    reason: '',
  })

  // Department Form State
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    head_of_department: '',
  })

  const showNotice = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [empRes, deptRes, leaveRes, statsRes] = await Promise.allSettled([
        employeeService.getEmployees({
          search: searchTerm || undefined,
          gender: genderFilter || undefined,
          department_id: deptFilter || undefined,
          status: statusFilter || undefined,
          per_page: 50,
        }),
        employeeService.getDepartments(),
        employeeService.getLeaveRequests({ per_page: 50 }),
        employeeService.getStatistics(),
      ])

      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data || [])
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value || [])
      if (leaveRes.status === 'fulfilled') setLeaveRequests(leaveRes.value.data || [])
      if (statsRes.status === 'fulfilled') setStatistics(statsRes.value)
    } catch (err: any) {
      showNotice(err.message || 'Failed to load employee records', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [genderFilter, deptFilter, statusFilter])

  const handleOpenAddEmployee = () => {
    setEditingEmployee(null)
    setEmpForm({
      first_name: '',
      last_name: '',
      nin: '',
      gender: 'male',
      phone: '',
      email: '',
      district: 'Kampala',
      position: '',
      department_id: departments[0]?.id?.toString() || '',
      salary_grade: 'G-4',
      base_salary: 2500000,
      status: 'active',
    })
    setIsEmployeeModalOpen(true)
  }

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.id, {
          ...empForm,
          department_id: empForm.department_id ? Number(empForm.department_id) : undefined,
        })
        showNotice('Employee profile updated successfully.')
      } else {
        await employeeService.createEmployee({
          ...empForm,
          department_id: empForm.department_id ? Number(empForm.department_id) : undefined,
        })
        showNotice('New employee registered into Fab Homes HR system.')
      }
      setIsEmployeeModalOpen(false)
      fetchData()
    } catch (err: any) {
      showNotice(err.response?.data?.message || err.message || 'Failed to save employee profile', 'error')
    }
  }

  const handleLeaveDecision = async (leaveId: number, status: 'approved' | 'rejected') => {
    try {
      await employeeService.updateLeaveStatus(leaveId, status)
      showNotice(`Leave request ${status}.`)
      fetchData()
    } catch (err: any) {
      showNotice(err.message || 'Failed to update leave request', 'error')
    }
  }

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await employeeService.createLeaveRequest({
        employee_id: Number(leaveForm.employee_id),
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        days_count: Number(leaveForm.days_count),
        reason: leaveForm.reason,
      })
      showNotice('Leave application submitted successfully.')
      setIsLeaveModalOpen(false)
      fetchData()
    } catch (err: any) {
      showNotice(err.message || 'Failed to submit leave application', 'error')
    }
  }

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await employeeService.createDepartment(deptForm)
      showNotice('Department created successfully.')
      setIsDeptModalOpen(false)
      fetchData()
    } catch (err: any) {
      showNotice(err.message || 'Failed to create department', 'error')
    }
  }

  const formatUGX = (val?: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(val || 0)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px', color: '#0d9488' }}><MdPeople /></span>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Employees & Human Resources Management
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Manage staff profiles, department rosters, salary structures, and leave applications
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsEmailModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <MdEmail /> Send Email to Employees
          </button>
          <button
            onClick={handleOpenAddEmployee}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <MdPersonAdd /> + Add Employee
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: notification.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          fontSize: '14px',
          fontWeight: '500',
        }}>
          {notification.msg}
        </div>
      )}

      {/* KPI Demographic Cards (Page 8 & Dashboard Reference) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ backgroundColor: '#ffffff', padding: '18px 22px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Staff Headcount</div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{statistics?.total_employees || employees.length}</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>Active personnel across departments</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 22px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Male Employees</div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#0284c7', marginTop: '6px' }}>{statistics?.male_employees || 3}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Survey, engineering, logistics</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 22px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Female Employees</div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#ec4899', marginTop: '6px' }}>{statistics?.female_employees || 2}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Finance, administration, legal</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 22px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>On Approved Leave</div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#f59e0b', marginTop: '6px' }}>{statistics?.on_leave || 0}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Annual & compassionate leave</div>
        </div>
      </div>

      {/* 5 Tab Navigation (Page 8 Reference) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px 12px 0 0',
        border: '1px solid #e2e8f0',
        borderBottom: 'none',
        display: 'flex',
        overflowX: 'auto',
      }}>
        <button
          onClick={() => setActiveTab('employees')}
          style={{
            padding: '16px 22px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'employees' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'employees' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdPeople /> Employees
        </button>

        <button
          onClick={() => setActiveTab('salaries')}
          style={{
            padding: '16px 22px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'salaries' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'salaries' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdAttachMoney /> Salaries & Payroll
        </button>

        <button
          onClick={() => setActiveTab('grades')}
          style={{
            padding: '16px 22px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'grades' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'grades' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdGrade /> Grade Settings
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          style={{
            padding: '16px 22px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'leave' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'leave' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdEventBusy /> Leave Management
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          style={{
            padding: '16px 22px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'departments' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'departments' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdBusiness /> Departments
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0 0 12px 12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Tab 1: Employees Directory */}
        {activeTab === 'employees' && (
          <div>
            {/* Quick Status Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${statusFilter === '' ? '#0d9488' : '#cbd5e1'}`,
                  background: statusFilter === '' ? '#0d9488' : '#ffffff',
                  color: statusFilter === '' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                All Staff ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${statusFilter === 'active' ? '#16a34a' : '#cbd5e1'}`,
                  background: statusFilter === 'active' ? '#16a34a' : '#ffffff',
                  color: statusFilter === 'active' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Active Personnel
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('on_leave')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${statusFilter === 'on_leave' ? '#d97706' : '#cbd5e1'}`,
                  background: statusFilter === 'on_leave' ? '#d97706' : '#ffffff',
                  color: statusFilter === 'on_leave' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                On Leave ({statistics?.on_leave || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('suspended')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${statusFilter === 'suspended' ? '#dc2626' : '#cbd5e1'}`,
                  background: statusFilter === 'suspended' ? '#dc2626' : '#ffffff',
                  color: statusFilter === 'suspended' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Suspended
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search name, NIN, position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '240px' }}
                />
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                  <th style={{ padding: '12px 14px' }}>Employee ID</th>
                  <th style={{ padding: '12px 14px' }}>Name</th>
                  <th style={{ padding: '12px 14px' }}>Gender</th>
                  <th style={{ padding: '12px 14px' }}>NIN</th>
                  <th style={{ padding: '12px 14px' }}>Position</th>
                  <th style={{ padding: '12px 14px' }}>Department</th>
                  <th style={{ padding: '12px 14px' }}>District</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f766e' }}>{emp.employee_number}</td>
                    <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b' }}>
                      {emp.first_name} {emp.last_name}
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{emp.phone || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor: emp.gender === 'male' ? '#e0f2fe' : '#fce7f3',
                        color: emp.gender === 'male' ? '#0369a1' : '#be185d',
                      }}>
                        {emp.gender}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{emp.nin || '-'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: '500' }}>{emp.position || '-'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{emp.department?.name || 'General Operations'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{emp.district || 'Kampala'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: emp.status === 'active' ? '#dcfce7' : '#fee2e2',
                        color: emp.status === 'active' ? '#15803d' : '#b91c1c',
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setEditingEmployee(emp)
                          setEmpForm({
                            first_name: emp.first_name,
                            last_name: emp.last_name,
                            nin: emp.nin || '',
                            gender: emp.gender,
                            phone: emp.phone || '',
                            email: emp.email || '',
                            district: emp.district || 'Kampala',
                            position: emp.position || '',
                            department_id: emp.department_id?.toString() || '',
                            salary_grade: emp.salary_grade || 'G-4',
                            base_salary: Number(emp.base_salary) || 2500000,
                            status: emp.status,
                          })
                          setIsEmployeeModalOpen(true)
                        }}
                        style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px' }}
                      >
                        <MdEdit /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Salaries & Payroll */}
        {activeTab === 'salaries' && (
          <div>
            <div style={{ marginBottom: '14px', color: '#64748b', fontSize: '13px' }}>
              Base monthly compensation, salary grades, and payroll allocation per employee.
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px' }}>Employee</th>
                  <th style={{ padding: '12px' }}>Position</th>
                  <th style={{ padding: '12px' }}>Grade</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Base Monthly Salary</th>
                  <th style={{ padding: '12px' }}>Payroll Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Payslip Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{e.first_name} {e.last_name}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{e.position}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#0f766e' }}>{e.salary_grade || 'G-4'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                      {formatUGX(Number(e.base_salary))}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: '700' }}>
                        ACTIVE PAYROLL
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeForPayslip(e)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Generate Official Monthly Payslip"
                      >
                        <MdReceipt size={14} /> View Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Grade Settings */}
        {activeTab === 'grades' && (
          <div>
            <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '13px' }}>
              Official Fab Homes organizational pay grade tiers and compensation brackets.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {[
                { grade: 'G-1', title: 'Executive Management', range: 'UGX 6,000,000 - 12,000,000', roles: 'Managing Director, Chief Financial Officer' },
                { grade: 'G-2', title: 'Senior Management', range: 'UGX 4,500,000 - 6,000,000', roles: 'Project Director, Lead Architect, Head of Legal' },
                { grade: 'G-3', title: 'Department Leads', range: 'UGX 3,500,000 - 4,500,000', roles: 'Finance Manager, Head of Cadastral Survey' },
                { grade: 'G-4', title: 'Specialist Officers', range: 'UGX 2,500,000 - 3,500,000', roles: 'Cadastral Surveyor, Site Civil Engineer, Accountant' },
                { grade: 'G-5', title: 'Operational Staff', range: 'UGX 1,500,000 - 2,500,000', roles: 'Customer Care, Cashier, Site Foreman' },
                { grade: 'G-6', title: 'Support & Security', range: 'UGX 800,000 - 1,500,000', roles: 'Field Assistants, Drivers, Security Wardens' },
              ].map(g => (
                <div key={g.grade} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0d9488' }}>{g.grade}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>{g.title}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>{g.range}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{g.roles}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Leave Management */}
        {activeTab === 'leave' && (
          <div>
            {/* Quick Status Filter Pills for Leave */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setLeaveStatusFilter('')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${leaveStatusFilter === '' ? '#0d9488' : '#cbd5e1'}`,
                  background: leaveStatusFilter === '' ? '#0d9488' : '#ffffff',
                  color: leaveStatusFilter === '' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                All Requests ({leaveRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setLeaveStatusFilter('pending')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${leaveStatusFilter === 'pending' ? '#d97706' : '#cbd5e1'}`,
                  background: leaveStatusFilter === 'pending' ? '#d97706' : '#ffffff',
                  color: leaveStatusFilter === 'pending' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Draft / Pending Review ({leaveRequests.filter(l => l.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setLeaveStatusFilter('approved')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${leaveStatusFilter === 'approved' ? '#16a34a' : '#cbd5e1'}`,
                  background: leaveStatusFilter === 'approved' ? '#16a34a' : '#ffffff',
                  color: leaveStatusFilter === 'approved' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Approved Leave ({leaveRequests.filter(l => l.status === 'approved').length})
              </button>
              <button
                type="button"
                onClick={() => setLeaveStatusFilter('rejected')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${leaveStatusFilter === 'rejected' ? '#dc2626' : '#cbd5e1'}`,
                  background: leaveStatusFilter === 'rejected' ? '#dc2626' : '#ffffff',
                  color: leaveStatusFilter === 'rejected' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Rejected ({leaveRequests.filter(l => l.status === 'rejected').length})
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ color: '#64748b', fontSize: '13px' }}>
                Employee leave requests, entitlement balances, and management approval pipeline.
              </div>
              <button
                onClick={() => {
                  setLeaveForm({
                    employee_id: employees[0]?.id?.toString() || '',
                    leave_type: 'annual',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
                    days_count: 5,
                    reason: '',
                  })
                  setIsLeaveModalOpen(true)
                }}
                style={{ padding: '8px 16px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                + Apply for Leave
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px' }}>Employee</th>
                  <th style={{ padding: '12px' }}>Leave Type</th>
                  <th style={{ padding: '12px' }}>Start Date</th>
                  <th style={{ padding: '12px' }}>End Date</th>
                  <th style={{ padding: '12px' }}>Days</th>
                  <th style={{ padding: '12px' }}>Reason</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.filter(l => !leaveStatusFilter || l.status === leaveStatusFilter).length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No leave requests matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  leaveRequests
                    .filter(l => !leaveStatusFilter || l.status === leaveStatusFilter)
                    .map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{l.employee?.first_name} {l.employee?.last_name}</td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{l.leave_type}</td>
                      <td style={{ padding: '12px' }}>{new Date(l.start_date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>{new Date(l.end_date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{l.days_count}</td>
                      <td style={{ padding: '12px', color: '#64748b' }}>{l.reason || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          backgroundColor: l.status === 'approved' ? '#dcfce7' : l.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                          color: l.status === 'approved' ? '#15803d' : l.status === 'rejected' ? '#b91c1c' : '#a16207',
                        }}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {l.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleLeaveDecision(l.id, 'approved')}
                              style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveDecision(l.id, 'rejected')}
                              style={{ padding: '4px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Departments */}
        {activeTab === 'departments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ color: '#64748b', fontSize: '13px' }}>
                Corporate departments, operational units, and designated department heads.
              </div>
              <button
                onClick={() => {
                  setDeptForm({ name: '', code: '', description: '', head_of_department: '' })
                  setIsDeptModalOpen(true)
                }}
                style={{ padding: '8px 16px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                + Add Department
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px' }}>Code</th>
                  <th style={{ padding: '12px' }}>Department Name</th>
                  <th style={{ padding: '12px' }}>Head of Department</th>
                  <th style={{ padding: '12px' }}>Staff Allocation</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#0d9488' }}>{d.code}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>
                      {d.name}
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{d.description}</div>
                    </td>
                    <td style={{ padding: '12px', color: '#334155' }}>{d.head_of_department || 'Managing Director'}</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{d.employees_count ?? employees.filter(e => e.department_id === d.id).length}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d' }}>
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {isEmployeeModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '640px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}>
            <div style={{ backgroundColor: '#0d9488', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                {editingEmployee ? 'Edit Employee Profile' : 'Register New Employee'}
              </h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer' }}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>First Name</label>
                  <input
                    type="text"
                    required
                    value={empForm.first_name}
                    onChange={(e) => setEmpForm({ ...empForm, first_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Last Name</label>
                  <input
                    type="text"
                    required
                    value={empForm.last_name}
                    onChange={(e) => setEmpForm({ ...empForm, last_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Gender</label>
                  <select
                    value={empForm.gender}
                    onChange={(e: any) => setEmpForm({ ...empForm, gender: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>National ID (NIN)</label>
                  <input
                    type="text"
                    value={empForm.nin}
                    placeholder="CM89..."
                    onChange={(e) => setEmpForm({ ...empForm, nin: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Phone Number</label>
                  <input
                    type="text"
                    value={empForm.phone}
                    placeholder="+256..."
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Official Email</label>
                  <input
                    type="email"
                    value={empForm.email}
                    placeholder="name@fabhomes.ug"
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Position / Title</label>
                  <input
                    type="text"
                    required
                    value={empForm.position}
                    placeholder="e.g. Cadastral Surveyor"
                    onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Department</label>
                  <select
                    value={empForm.department_id}
                    onChange={(e) => setEmpForm({ ...empForm, department_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Base Salary (UGX)</label>
                  <input
                    type="number"
                    value={empForm.base_salary}
                    onChange={(e) => setEmpForm({ ...empForm, base_salary: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Pay Grade</label>
                  <select
                    value={empForm.salary_grade}
                    onChange={(e) => setEmpForm({ ...empForm, salary_grade: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="G-1">G-1 Executive</option>
                    <option value="G-2">G-2 Senior Manager</option>
                    <option value="G-3">G-3 Department Head</option>
                    <option value="G-4">G-4 Officer / Engineer</option>
                    <option value="G-5">G-5 Operational Staff</option>
                    <option value="G-6">G-6 Support & Field</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#0d9488', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Application Modal */}
      {isLeaveModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px',
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#0d9488', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Submit Leave Application</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}><MdClose /></button>
            </div>
            <form onSubmit={handleCreateLeave} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Select Employee</label>
                <select
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  required
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.position})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Leave Type</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e: any) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="paternity">Paternity Leave</option>
                    <option value="compassionate">Compassionate</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Days Count</label>
                  <input
                    type="number"
                    value={leaveForm.days_count}
                    onChange={(e) => setLeaveForm({ ...leaveForm, days_count: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Reason</label>
                <textarea
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#0d9488', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isDeptModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px',
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '440px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#0d9488', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Add Department</h3>
              <button onClick={() => setIsDeptModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}><MdClose /></button>
            </div>
            <form onSubmit={handleCreateDept} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal & Title Processing"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LEG"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Head of Department</label>
                <input
                  type="text"
                  placeholder="e.g. Counsel Mary Namaganda"
                  value={deptForm.head_of_department}
                  onChange={(e) => setDeptForm({ ...deptForm, head_of_department: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsDeptModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#0d9488', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      <BulkEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSuccess={(msg) => showNotice(msg)}
      />

      {/* Official Employee Payslip & Remuneration Voucher Modal */}
      {selectedEmployeeForPayslip && (() => {
        const basic = Number(selectedEmployeeForPayslip.base_salary) || 2500000
        const housing = Math.round(basic * 0.15)
        const transport = Math.round(basic * 0.10)
        const gross = basic + housing + transport
        const nssf = Math.round(basic * 0.05)
        const paye = Math.max(0, Math.round((gross - 235000) * 0.15))
        const deductions = nssf + paye
        const netPay = gross - deductions
        const currentMonthYear = new Date().toLocaleString('en-UG', { month: 'long', year: 'numeric' })

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                maxWidth: '820px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* Header controls (no-print) */}
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  borderRadius: '16px 16px 0 0',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                    Employee Monthly Remuneration Payslip
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedEmployeeForPayslip.first_name} {selectedEmployeeForPayslip.last_name} • {currentMonthYear}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <MdPrint /> Print / Save as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeForPayslip(null)}
                    style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
                  >
                    <MdClose />
                  </button>
                </div>
              </div>

              {/* Printable Document Container */}
              <div style={{ padding: '28px' }}>
                <div
                  id="printable-employee-payslip"
                  style={{
                    background: '#ffffff',
                    border: '2px solid #0284c7',
                    borderRadius: '12px',
                    padding: '30px',
                    color: '#0f172a',
                  }}
                >
                  {/* Official Letterhead */}
                  <div style={{ borderBottom: '2px solid #d97706', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', background: '#0284c7', color: '#ffffff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
                          <MdHomeWork />
                        </div>
                        <div>
                          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                            FAB HOMES UGANDA LIMITED
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>
                            HUMAN RESOURCES & TREASURY PAYROLL DIVISION
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-block', background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                          OFFICIAL SALARY PAYSLIP
                        </span>
                        <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>
                          PERIOD: {currentMonthYear.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          VOUCHER: FH-PAY-{selectedEmployeeForPayslip.id}-{new Date().getFullYear()}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '10px' }}>
                      Plot 12, Lumumba Avenue, Kampala, Uganda • P.O. Box 71200 Kampala • Tel: +256 700 000 000 • Email: hr@fabhomes.ug
                    </div>
                  </div>

                  {/* Employee Information Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '12px' }}>
                    <div>
                      <strong>Employee Name:</strong> {selectedEmployeeForPayslip.first_name} {selectedEmployeeForPayslip.last_name}
                    </div>
                    <div>
                      <strong>Employee Staff ID:</strong> FH-EMP-00{selectedEmployeeForPayslip.id}
                    </div>
                    <div>
                      <strong>Job Designation:</strong> {selectedEmployeeForPayslip.position || 'Staff Officer'}
                    </div>
                    <div>
                      <strong>Department:</strong> {selectedEmployeeForPayslip.department?.name || 'General Operations'}
                    </div>
                    <div>
                      <strong>National ID (NIN):</strong> {selectedEmployeeForPayslip.nin || 'CM9001234567AB'}
                    </div>
                    <div>
                      <strong>Salary Grade Level:</strong> <span style={{ fontWeight: 700, color: '#0f766e' }}>{selectedEmployeeForPayslip.salary_grade || 'G-4'}</span>
                    </div>
                  </div>

                  {/* Earnings vs Deductions 2-Column Table */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    {/* Gross Earnings Column */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f1f5f9', padding: '10px 14px', fontWeight: 700, fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>
                        EARNINGS & ALLOWANCES
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>Basic Monthly Salary</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatUGX(basic)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>Housing Allowance (15%)</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatUGX(housing)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>Transport Allowance (10%)</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatUGX(transport)}</td>
                          </tr>
                          <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                            <td style={{ padding: '10px 12px', color: '#0f172a' }}>TOTAL GROSS EARNINGS</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0369a1' }}>{formatUGX(gross)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Statutory Deductions Column */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f1f5f9', padding: '10px 14px', fontWeight: 700, fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>
                        STATUTORY DEDUCTIONS
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>NSSF Contribution (5%)</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{formatUGX(nssf)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>PAYE Tax (URA Withholding)</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{formatUGX(paye)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>Local Service Tax / Sacco</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-UGX 0</td>
                          </tr>
                          <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                            <td style={{ padding: '10px 12px', color: '#0f172a' }}>TOTAL DEDUCTIONS</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>-{formatUGX(deductions)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Net Pay Box */}
                  <div style={{ background: '#ecfdf5', border: '2px dashed #059669', borderRadius: '10px', padding: '16px 20px', marginBottom: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#065f46' }}>
                          NET MONTHLY REMUNERATION PAYABLE:
                        </span>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857', marginTop: '4px', fontStyle: 'italic' }}>
                          Amount in words: {formatAmountInWords(netPay, 'UGX')}
                        </div>
                      </div>
                      <span style={{ fontSize: '26px', fontWeight: 800, color: '#047857' }}>
                        {formatUGX(netPay)}
                      </span>
                    </div>
                  </div>

                  {/* Triple Signatures Block */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>PREPARED BY:</div>
                      <div style={{ height: '40px', borderBottom: '1px dashed #94a3b8', margin: '4px 0' }}></div>
                      <div style={{ fontSize: '11px', fontWeight: 600 }}>Payroll & HR Officer</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Fab Homes HR Dept</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>CERTIFIED & APPROVED:</div>
                      <div style={{ height: '40px', borderBottom: '1px dashed #94a3b8', margin: '4px 0' }}></div>
                      <div style={{ fontSize: '11px', fontWeight: 600 }}>Chief Financial Officer</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Finance & Treasury</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>EMPLOYEE ACKNOWLEDGMENT:</div>
                      <div style={{ height: '40px', borderBottom: '1px dashed #94a3b8', margin: '4px 0' }}></div>
                      <div style={{ fontSize: '11px', fontWeight: 600 }}>{selectedEmployeeForPayslip.first_name} {selectedEmployeeForPayslip.last_name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Signature & Date</div>
                    </div>
                  </div>

                  {/* Digital Security Seal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MdVerified style={{ fontSize: '20px', color: '#16a34a' }} />
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>AUTHENTIC DIGITAL PAYROLL DISBURSEMENT RECORD</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                          HASH: SHA256:PAY-{selectedEmployeeForPayslip.id}-{Date.now().toString(36).toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MdQrCode2 style={{ fontSize: '28px', color: '#0f172a' }} />
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>PAYROLL SEAL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default EmployeesPage
