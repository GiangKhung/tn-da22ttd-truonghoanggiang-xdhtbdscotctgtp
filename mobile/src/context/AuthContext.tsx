import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  apiLogin,
  apiRegister,
  apiUpdateProfile,
  apiVerifyToken,
  clearToken,
  loadToken,
  saveToken,
  saveCustomerInfo,
  type CustomerInfo,
} from '@/storage/auth';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; customer: CustomerInfo; token: string };

type AuthContextValue = {
  state: AuthState;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, fullname?: string, licensePlate?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { fullname?: string; licensePlate?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // Khôi phục session khi mở app (Bỏ khôi phục session, mỗi lần mở app bắt buộc đăng nhập bằng mật khẩu)
  useEffect(() => {
    (async () => {
      await clearToken();
      setState({ status: 'unauthenticated' });
    })();
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const { token, customer } = await apiLogin(phone, password);
    await saveToken(token);
    await saveCustomerInfo(customer);
    setState({ status: 'authenticated', customer, token });
  }, []);

  const register = useCallback(
    async (phone: string, password: string, fullname?: string, licensePlate?: string) => {
      const { token, customer } = await apiRegister(phone, password, fullname, licensePlate);
      await saveToken(token);
      await saveCustomerInfo(customer);
      setState({ status: 'authenticated', customer, token });
    },
    []
  );

  const logout = useCallback(async () => {
    await clearToken();
    setState({ status: 'unauthenticated' });
  }, []);

  const updateProfile = useCallback(
    async (data: { fullname?: string; licensePlate?: string }) => {
      const token = await loadToken();
      if (!token) throw new Error('Chưa đăng nhập');
      const customer = await apiUpdateProfile(token, data);
      await saveCustomerInfo(customer);
      setState((prev) =>
        prev.status === 'authenticated'
          ? { ...prev, customer }
          : prev
      );
    },
    []
  );

  return (
    <AuthContext.Provider value={{ state, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
}

// Hook tiện ích - trả về customer nếu đã đăng nhập
export function useCustomer(): CustomerInfo | null {
  const { state } = useAuth();
  return state.status === 'authenticated' ? state.customer : null;
}
