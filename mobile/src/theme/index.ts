export const colors = {
  bg: '#f7f8fb',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  border: '#e2e8f0',
  primary: '#0f172a',
  primaryFg: '#ffffff',
  accent: '#2563eb',
  accentFg: '#ffffff',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  pending: '#f59e0b',
  confirmed: '#2563eb',
  completed: '#16a34a',
  cancelled: '#94a3b8',
  quoting: '#3b82f6',
  inProgress: '#f59e0b',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
};

export const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  QUOTING: 'Báo giá',
  IN_PROGRESS: 'Đang sửa',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const serviceLabels: Record<string, string> = {
  MAINTENANCE: 'Bảo dưỡng định kỳ',
  REPAIR: 'Sửa động cơ',
  WASHING: 'Rửa & nội thất',
  TIRE: 'Phanh & lốp',
};
