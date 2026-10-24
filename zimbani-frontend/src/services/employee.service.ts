import api from '../config/api'

export interface Employee {
  id: number
  uuid: string
  employee_number: string
  user_id?: number
  department_id?: number
  first_name: string
  last_name: string
  full_name: string
  nin?: string
  gender: 'male' | 'female'
  phone?: string
  email?: string
  district?: string
  position?: string
  salary_grade?: string
  base_salary: number
  date_joined?: string
  status: 'active' | 'on_leave' | 'suspended' | 'terminated'
  digital_signature?: string
  department?: Department
  user?: { id: number; name: string; email: string }
  created_at: string
}

export interface Department {
  id: number
  name: string
  code: string
  description?: string
  head_of_department?: string
  is_active: boolean
  employees_count?: number
}

export interface LeaveRequest {
  id: number
  uuid: string
  employee_id: number
  leave_type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'compassionate' | 'unpaid'
  start_date: string
  end_date: string
  days_count: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: number
  approved_at?: string
  rejection_reason?: string
  employee?: Employee
  approver?: { id: number; name: string }
  created_at: string
}

export interface EmployeeStatistics {
  total_employees: number
  male_employees: number
  female_employees: number
  active_employees: number
  on_leave: number
}

class EmployeeService {
  async getEmployees(params?: any) {
    const res = await api.get('/employees', { params })
    return res.data
  }

  async getEmployee(id: string | number) {
    const res = await api.get(`/employees/${id}`)
    return res.data.data
  }

  async createEmployee(data: Partial<Employee>) {
    const res = await api.post('/employees', data)
    return res.data
  }

  async updateEmployee(id: string | number, data: Partial<Employee>) {
    const res = await api.put(`/employees/${id}`, data)
    return res.data
  }

  async deleteEmployee(id: string | number) {
    const res = await api.delete(`/employees/${id}`)
    return res.data
  }

  async getStatistics(): Promise<EmployeeStatistics> {
    const res = await api.get('/employees/statistics')
    return res.data.data
  }

  async getDepartments(): Promise<Department[]> {
    const res = await api.get('/employees/departments')
    return res.data.data
  }

  async createDepartment(data: Partial<Department>) {
    const res = await api.post('/employees/departments', data)
    return res.data
  }

  async getLeaveRequests(params?: any) {
    const res = await api.get('/employees/leave-requests', { params })
    return res.data
  }

  async createLeaveRequest(data: Partial<LeaveRequest>) {
    const res = await api.post('/employees/leave-requests', data)
    return res.data
  }

  async updateLeaveStatus(id: string | number, status: 'approved' | 'rejected', rejection_reason?: string) {
    const res = await api.post(`/employees/leave-requests/${id}/status`, { status, rejection_reason })
    return res.data
  }
}

export default new EmployeeService()
