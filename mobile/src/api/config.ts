/**
 * src/api/config.ts
 * Cấu hình URL gốc của API — không import bất cứ module nội bộ nào
 * để tránh circular dependency.
 */
import Constants from 'expo-constants';

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Fallback dev: tự suy IP host của Metro để gọi backend cùng máy.
  const host = (Constants.expoConfig as any)?.hostUri?.split(':')[0];
  if (host) return `http://${host}:3000`;
  return 'http://localhost:3000';
}

export const API_BASE_URL = resolveBaseUrl();
