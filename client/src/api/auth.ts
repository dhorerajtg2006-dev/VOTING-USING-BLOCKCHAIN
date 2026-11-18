import { apiGet, apiPost } from './client';

export const authApi = {
  adminLogin: (data: any) => apiPost('/auth/admin/login', data),
  voterLogin: (data: any) => apiPost('/auth/voter/login', data),
  voterRegister: (data: { roomNumber: string; voterId: string; fullName: string; email: string }) =>
    apiPost('/auth/voter/register', data),
  logout: () => apiPost('/auth/logout', {}),
  getCurrentUser: () => apiGet('/auth/me')
};
