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

export async function getInventoryItems() {
  const response = await api.get('/inventory')
  return response.data
}

export async function createInventoryItem(item) {
  const response = await api.post('/inventory', item)
  return response.data
}

export async function updateInventoryItem(id, item) {
  const response = await api.put(`/inventory/${id}`, item)
  return response.data
}

export async function deleteInventoryItem(id) {
  const response = await api.delete(`/inventory/${id}`)
  return response.data
}


export async function getHousehold() {
  const response = await api.get('/household')
  return response.data
}

export async function saveHousehold(household) {
  const response = await api.put('/household', household)
  return response.data
}

export async function getSimulations() {
  const response = await api.get('/simulations')
  return response.data
}


export async function runSimulation(scenario) {
  const response = await api.post('/simulations', {
    scenario
  })

  return response.data
}


export async function getRecommendations(resultId) {
  const response = await api.get(`/simulations/${resultId}/recommendations`)
  return response.data
}

export async function getChecklistItems() {
  const response = await api.get('/checklist')
  return response.data
}

export async function addChecklistItem(item) {
  const response = await api.post('/checklist', item)
  return response.data
}

export async function updateChecklistItem(id, changes) {
  const response = await api.patch(`/checklist/${id}`, changes)
  return response.data
}

export async function deleteChecklistItem(id) {
  const response = await api.delete(`/checklist/${id}`)
  return response.data
}

export async function getLeaderboard(scenario = 'powerOutage') {
  const response = await api.get('/leaderboard', {
    params: { scenario }
  })

  return response.data
}


export default api
