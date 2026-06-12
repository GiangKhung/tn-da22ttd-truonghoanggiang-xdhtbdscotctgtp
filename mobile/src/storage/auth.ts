import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/api/config';

const TOKEN_KEY = 'gara.customer.token.v1';
const CUSTOMER_KEY = 'gara.customer.info.v1';

export type CustomerInfo = {
  id: number;
  phone: string;
  fullname: string | null;
  licensePlate: string | null;
};

// ── Token storage ────────────────────────────────────────────────────────────
export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function loadToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, CUSTOMER_KEY]);
}

// ── Customer info cache ──────────────────────────────────────────────────────
export async function saveCustomerInfo(info: CustomerInfo): Promise<void> {
  await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(info));
}

export async function loadCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── API calls ────────────────────────────────────────────────────────────────
export type AuthResult = {
  token: string;
  customer: CustomerInfo;
};

export async function apiRegister(
  phone: string,
  password: string,
  fullname?: string,
  licensePlate?: string
): Promise<AuthResult> {
  const res = await fetch(`${API_BASE_URL}/api/auth/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', phone, password, fullname, licensePlate }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
  return data as AuthResult;
}

export async function apiLogin(phone: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE_URL}/api/auth/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', phone, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
  return data as AuthResult;
}

export async function apiVerifyToken(token: string): Promise<CustomerInfo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/customer/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.customer as CustomerInfo;
  } catch {
    return null;
  }
}

export async function apiUpdateProfile(
  token: string,
  data: { fullname?: string; licensePlate?: string }
): Promise<CustomerInfo> {
  const res = await fetch(`${API_BASE_URL}/api/auth/customer/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Lỗi ${res.status}`);
  return json.customer as CustomerInfo;
}

