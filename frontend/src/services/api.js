import axios from 'axios'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '')

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// User authentication token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Admin authentication token
adminApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('adminToken')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Handle API errors
const handleApiError = (error, sessionType) => {
  if (error.response) {
    console.error(
      'API Error:',
      error.response.status,
      error.response.data
    )

    if (error.response.status === 401) {
      const tokenKey =
        sessionType === 'admin' ? 'adminToken' : 'token'

      const userKey =
        sessionType === 'admin' ? 'admin' : 'user'

      sessionStorage.removeItem(tokenKey)
      sessionStorage.removeItem(userKey)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new Event(
            sessionType === 'admin'
              ? 'adminAuthExpired'
              : 'userAuthExpired'
          )
        )
      }
    }
  } else if (error.request) {
    console.error(
      'API Error: No response received from server.'
    )
  } else {
    console.error('API Error:', error.message)
  }

  return Promise.reject(error)
}

// User API response interceptor
api.interceptors.response.use(
  response => response,
  error => handleApiError(error, 'user')
)

// Admin API response interceptor
adminApi.interceptors.response.use(
  response => response,
  error => handleApiError(error, 'admin')
)

export default api