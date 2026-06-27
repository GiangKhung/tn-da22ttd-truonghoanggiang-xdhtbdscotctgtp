export const colors = {
  bg: '#09090b',
  card: '#121214',
  text: '#ffffff',
  textMuted: '#a0a0a5',
  textSubtle: '#64748b',
  border: 'rgba(197, 168, 128, 0.15)',
  primary: '#c5a880',
  primaryFg: '#09090b',
  accent: '#c5a880',
  accentFg: '#09090b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#f43f5e',
  pending: '#f59e0b',
  confirmed: '#c5a880',
  completed: '#10b981',
  cancelled: '#64748b',
  quoting: '#c5a880',
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
  sm: 4,
  md: 4,
  lg: 4,
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
