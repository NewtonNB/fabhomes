import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  User,
  LoginCredentials,
  RegisterData,
  ProfileUpdateData,
  AuthContextType,
} from '../types/auth.types'

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Local storage keys
const TOKEN_KEY = 'zimbani_token'
const USER_KEY = 'zimbani_user'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY)
        const storedUser = localStorage.getItem(USER_KEY)

        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        // Clear invalid data
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth events from API interceptor
    const handleAuthLogout = () => {
      setUser(null)
      setToken(null)
      setIsLoading(false)
    }

    const handleAuthRefresh = (event: CustomEvent) => {
      if (event.detail) {
        setUser(event.detail)
      }
    }

    window.addEventListener('auth:logout', handleAuthLogout as EventListener)
    window.addEventListener('auth:refresh', handleAuthRefresh as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout as EventListener)
      window.removeEventListener('auth:refresh', handleAuthRefresh as EventListener)
    }
  }, [])

  // Persist token to localStorage whenever it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token])

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }, [user])

  // Login function
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      
      // Import auth service dynamically to avoid circular dependencies
      const { default: authService } = await import('../services/auth.service')
      const authResponse = await authService.login(credentials)
      
      // Set user and token
      setUser(authResponse.user)
      setToken(authResponse.token)
    } catch (error: any) {
      // Re-throw error for component to handle
      throw new Error(error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Register function
  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true)
      
      const { default: authService } = await import('../services/auth.service')
      const authResponse = await authService.register(data)
      
      // Set user and token
      setUser(authResponse.user)
      setToken(authResponse.token)
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true)
      
      const { default: authService } = await import('../services/auth.service')
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear state regardless of API call result
      setUser(null)
      setToken(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setIsLoading(false)
    }
  }

  // Update profile function
  const updateProfile = async (data: ProfileUpdateData) => {
    try {
      setIsLoading(true)
      
      const { default: authService } = await import('../services/auth.service')
      const updatedUser = await authService.updateProfile(data)
      
      // Update user in state
      setUser(updatedUser)
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    try {
      setIsLoading(true)
      
      const { default: authService } = await import('../services/auth.service')
      const updatedUser = await authService.getProfile()
      
      // Update user in state
      setUser(updatedUser)
    } catch (error: any) {
      // If refresh fails (e.g., token expired), logout
      console.error('Failed to refresh user:', error)
      await logout()
      throw new Error(error.message || 'Failed to refresh user data')
    } finally {
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    setUser,
    setToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

export default AuthContext
