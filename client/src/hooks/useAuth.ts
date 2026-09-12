import { useState, useEffect, useCallback } from 'react';
import { User, AuthState } from '../types';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const TOKEN_KEY = 'privex_token';
const USER_KEY  = 'privex_user';

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw   = localStorage.getItem(USER_KEY);
    const user  = raw ? (JSON.parse(raw) as User) : null;
    return { token, user, isAuthenticated: !!token && !!user };
  });

  useEffect(() => {
    if (state.token) {
      connectSocket(state.token);
    }
  }, [state.token]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ token, user, isAuthenticated: true });
    connectSocket(token);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { token, user } = await authApi.register({ email, password, name });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ token, user, isAuthenticated: true });
    connectSocket(token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    disconnectSocket();
    setState({ token: null, user: null, isAuthenticated: false });
  }, []);

  return { ...state, login, register, logout };
}
