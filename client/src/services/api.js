import axios from 'axios'

// In development, Vite proxies /api to http://localhost:5000.
// The backend currently exposes /api/health only. Auth routes are a proposed
// contract and must be confirmed with the backend developer before integration.
const api = axios.create({ baseURL: '/api', timeout: 10000 })

export async function loginUser({ email, password }) {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export async function registerUser({ name, email, password }) {
  const response = await api.post('/auth/register', { name, email, password })
  return response.data
}

export default api
