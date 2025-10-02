import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'inactive';
  group?: {
    id: number;
    name: string;
    permissions: string[];
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

interface SignupData {
  password: string;
  name: string;
  email: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 토큰 확인
    const token = localStorage.getItem('authToken');
    if (token) {
      // 토큰 검증 및 사용자 정보 로드
      validateToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      // 백엔드 API 호출하여 토큰 검증 및 사용자 정보 조회
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      // 백엔드 API 호출
      const response = await api.post('/auth/login', {
        email: username,  // username이 실제로는 email
        password: password
      });

      // 토큰 저장
      localStorage.setItem('authToken', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);

      // 사용자 정보 조회
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('로그인 실패');
    }
  };

  const signup = async (data: SignupData) => {
    try {
      // 백엔드 API 호출
      const response = await api.post('/auth/signup', {
        email: data.email,
        password: data.password,
        name: data.name
      });

      // 회원가입 성공 후 자동 로그인
      if (response.data.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);

        // 사용자 정보 조회
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data);
      }
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('회원가입 실패');
    }
  };

  const logout = async () => {
    try {
      // 백엔드 로그아웃 API 호출
      await api.post('/auth/logout');
    } catch (error) {
      // 로그아웃 실패해도 로컬 상태는 초기화
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // 승인 대기 상태의 사용자는 대시보드만 접근 가능
    if (user.status === 'pending' && permission !== 'dashboard') {
      return false;
    }
    // 그룹이 없는 경우 권한 없음
    if (!user.group || !user.group.permissions) {
      return false;
    }
    return user.group.permissions.includes(permission);
  };

  // 사용자 정보를 새로고침하는 함수
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      signup,
      logout,
      hasPermission,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};