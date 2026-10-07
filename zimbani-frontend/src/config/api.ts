import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'

// Token key (matching AuthContext)
export const TOKEN_KEY = 'zimbani_token'
export const USER_KEY = 'zimbani_user'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
})

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve()
    }
  })
  
  failedQueue = []
}

// Add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle response errors with token refresh logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest) {
      // Don't retry on login/register endpoints
      const publicEndpoints = ['/login', '/register', '/password/forgot', '/password/reset']
      const isPublicEndpoint = publicEndpoints.some(endpoint => 
        originalRequest.url?.includes(endpoint)
      )
      
      if (isPublicEndpoint) {
        return Promise.reject(error)
      }

      // If we've already tried to refresh, clear auth and redirect
      if (originalRequest._retry) {
        console.log('Token refresh failed, logging out...')
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        
        // Dispatch custom event to trigger logout in AuthContext
        window.dispatchEvent(new CustomEvent('auth:logout'))
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        
        return Promise.reject(error)
      }

      // Mark this request as retried
      originalRequest._retry = true

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      isRefreshing = true

      try {
        // Try to refresh user data (validates token)
        const response = await api.get('/user')
        
        if (response.data.success) {
          // Token is still valid, update user data
          const userData = response.data.data.user
          localStorage.setItem(USER_KEY, JSON.stringify(userData))
          
          // Dispatch event to update AuthContext
          window.dispatchEvent(new CustomEvent('auth:refresh', { 
            detail: userData 
          }))
          
          processQueue()
          isRefreshing = false
          
          // Retry original request
          return api(originalRequest)
        }
      } catch (refreshError) {
        processQueue(refreshError)
        isRefreshing = false
        
        console.log('Token validation failed, logging out...')
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('auth:logout'))
        
        // Redirect to login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      }
    }
    
    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded. Please try again later.')
    }
    
    return Promise.reject(error)
  }
)

export default api
