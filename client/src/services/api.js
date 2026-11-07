import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
})

export async function loginUser({ email, password }) {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export async function registerUser({ name, email, password }) {
  const response = await api.post('/auth/register', { name, email, password })
  return response.data
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me')
  return response.data
}

export async function logoutUser() {
  const response = await api.post('/auth/logout')
  return response.data
}

export default api
