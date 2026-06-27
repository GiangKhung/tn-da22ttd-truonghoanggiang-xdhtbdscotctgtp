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

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new Error(`Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng hoặc ngrok tunnel.`);
  }
}

async function handleResponse(res: Response) {
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new Error(data?.error ?? `Lỗi máy chủ (${res.status})`);
  }

  if (data === null) {
    throw new Error('Phản hồi từ máy chủ không hợp lệ (Không phải JSON)');
  }

  return data;
}

export async function apiRegister(
  phone: string,
  password: string,
  fullname?: string,
  licensePlate?: string
): Promise<AuthResult> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ action: 'register', phone, password, fullname, licensePlate }),
  });
  return handleResponse(res);
}

export async function apiLogin(phone: string, password: string): Promise<AuthResult> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ action: 'login', phone, password }),
  });
  return handleResponse(res);
}

export async function apiVerifyToken(token: string): Promise<CustomerInfo | null> {
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/auth/customer/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
    });
    if (!res.ok) return null;
    const data = await handleResponse(res);
    return data.customer as CustomerInfo;
  } catch {
    return null;
  }
}

export async function apiUpdateProfile(
  token: string,
  data: { fullname?: string; licensePlate?: string }
): Promise<CustomerInfo> {
  const res = await safeFetch(`${API_BASE_URL}/api/auth/customer/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(data),
  });
  const json = await handleResponse(res);
  return json.customer as CustomerInfo;
}

