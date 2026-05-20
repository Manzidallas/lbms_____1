import axios from 'axios'

const baseURL = import.meta.env.PROD ? 'https://lbms-aj17.onrender.com' : (import.meta.env.VITE_API_URL?.trim() || 'http://localhost:5000')

export const api = axios.create({
  baseURL,
  withCredentials: true,
})
