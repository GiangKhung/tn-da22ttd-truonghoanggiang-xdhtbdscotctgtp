import { loadToken } from '@/storage/auth';
import { API_BASE_URL } from './config';

export { API_BASE_URL };


type Json = Record<string, any> | Array<any> | null;

export class ApiError extends Error {
  status: number;
  data: Json;
  constructor(message: string, status: number, data: Json) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) || {}),
  };

  // Đính kèm JWT Bearer token cho các request cần xác thực
  if (withAuth) {
    const token = await loadToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err: any) {
    throw new ApiError(
      `Không kết nối được máy chủ (${API_BASE_URL}). Kiểm tra cùng mạng Wi-Fi và EXPO_PUBLIC_API_BASE_URL.`,
      0,
      null
    );
  }

  let body: Json = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!res.ok) {
    const msg =
      (body && typeof body === 'object' && 'error' in body && (body as any).error) ||
      `Lỗi máy chủ (${res.status})`;
    throw new ApiError(String(msg), res.status, body);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string, withAuth = false) => request<T>(path, {}, withAuth),
  post: <T>(path: string, data: unknown, withAuth = false) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }, withAuth),
  patch: <T>(path: string, data: unknown, withAuth = false) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }, withAuth),
  delete: <T>(path: string, withAuth = false) =>
    request<T>(path, { method: 'DELETE' }, withAuth),
};
