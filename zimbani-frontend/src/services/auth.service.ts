import api from '../config/api'
import {
  User,
  LoginCredentials,
  RegisterData,
  ProfileUpdateData,
  ApiResponse,
  AuthResponse,
} from '../types/auth.types'

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
class AuthService {
  /**
   * Login user with email/phone and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>(
        '/login',
        credentials
      )
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Login failed')
    } catch (error: any) {
      // Handle validation errors
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const firstError = Object.values(errors)[0] as string[]
        throw new Error(firstError[0] || 'Validation failed')
      }
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        throw new Error(error.response.data.message || 'Invalid credentials')
      }
      
      // Handle account status errors
      if (error.response?.status === 403) {
        throw new Error(error.response.data.message || 'Account is not active')
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Login failed')
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>(
        '/register',
        data
      )
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Registration failed')
    } catch (error: any) {
      // Handle validation errors
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        
        // Collect all error messages
        Object.keys(errors).forEach(field => {
          errorMessages.push(...errors[field])
        })
        
        throw new Error(errorMessages.join('. '))
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Registration failed')
    }
  }

  /**
   * Logout user (revoke current token)
   */
  async logout(): Promise<void> {
    try {
      await api.post('/logout')
    } catch (error: any) {
      // Even if API call fails, we'll clear local state
      console.error('Logout API error:', error)
    }
  }

  /**
   * Get current authenticated user profile
   */
  async getProfile(): Promise<User> {
    try {
      const response = await api.get<ApiResponse<{ user: User }>>('/user')
      
      if (response.data.success && response.data.data?.user) {
        return response.data.data.user
      }
      
      throw new Error('Failed to fetch user profile')
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch profile')
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<User> {
    try {
      const response = await api.put<ApiResponse<{ user: User }>>(
        '/user/profile',
        data
      )
      
      if (response.data.success && response.data.data?.user) {
        return response.data.data.user
      }
      
      throw new Error(response.data.message || 'Profile update failed')
    } catch (error: any) {
      // Handle validation errors
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        
        Object.keys(errors).forEach(field => {
          errorMessages.push(...errors[field])
        })
        
        throw new Error(errorMessages.join('. '))
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Profile update failed')
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse<null>>('/password/forgot', {
        email,
      })
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send reset link')
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const firstError = Object.values(errors)[0] as string[]
        throw new Error(firstError[0] || 'Invalid email address')
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Failed to send reset link')
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, email: string, password: string, passwordConfirmation: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse<null>>('/password/reset', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Password reset failed')
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        
        Object.keys(errors).forEach(field => {
          errorMessages.push(...errors[field])
        })
        
        throw new Error(errorMessages.join('. '))
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Password reset failed')
    }
  }
}

// Export singleton instance
export default new AuthService()
