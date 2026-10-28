import axiosClient from './axiosClient';

export interface User {
  id: number;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string;
  createdAt: Date;
}

export const authApi = {
  /**
   * Fetches the current user profile.
   */
  getMe: async (): Promise<User> => {
    const response = await axiosClient.get<User>('/api/auth/me');
    return response.data;
  },

  /**
   * Logs out the user on the backend.
   * The backend will clear the HttpOnly cookies.
   */
  logout: async (): Promise<void> => {
    try {
      await axiosClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Failed to logout on backend', error);
    }
  },
};

