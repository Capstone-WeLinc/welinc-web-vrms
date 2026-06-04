import api from './axios';
import { User } from '../../types';

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', { username, password, system: 'VRMS' });
  return response.data;
}
