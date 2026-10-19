import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Customers
export const getCustomers = () => api.get('/vendor/customers').then((r) => r.data);
export const getCustomer = (id: string) => api.get(`/vendor/customers/${id}`).then((r) => r.data);
export const createCustomer = (data: { name: string; businessType: string }) =>
  api.post('/vendor/customers', data).then((r) => r.data);
export const updateConfig = (id: string, config: unknown) =>
  api.put(`/vendor/customers/${id}/config`, { config }).then((r) => r.data);

// Stripe & License Management
export const simulateStripeWebhook = (data: { customerId: string; action: string; paidUntil?: string }) =>
  api.post('/stripe/simulate-webhook', data).then((r) => r.data);

export const createStripeCheckout = (customerId: string, plan = 'standard') =>
  api.post('/stripe/create-checkout-session', { customerId, plan }).then((r) => r.data);

export const getSubscriptionStatus = (customerId: string) =>
  api.get(`/stripe/subscription-status/${customerId}`).then((r) => r.data);

