// User related types matching Laravel backend API
export interface User {
  uuid: string
  name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  email_verified_at: string | null
  last_login_at: string | null
  metadata: Record<string, any> | null
  roles: string[]
  permissions?: string[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

// Login credentials
export interface LoginCredentials {
  login: string // email or phone
  password: string
}

// Registration data
export interface RegisterData {
  name: string
  email: string
  phone?: string
  password: string
  password_confirmation: string
}

// Profile update data
export interface ProfileUpdateData {
  name?: string
  email?: string
  phone?: string
  password?: string
  password_confirmation?: string
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errors?: Record<string, string[]>
}

// Auth response from login/register
export interface AuthResponse {
  user: User
  token: string
}

// Auth context state
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Auth context actions
export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: ProfileUpdateData) => Promise<void>
  refreshUser: () => Promise<void>
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
}
