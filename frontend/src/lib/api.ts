import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL?.trim() || (import.meta.env.PROD ? '' : 'http://localhost:5000')

export const api = axios.create({
  baseURL,
  withCredentials: true,
})
