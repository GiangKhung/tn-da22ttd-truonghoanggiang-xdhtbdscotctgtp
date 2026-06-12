export function formatVND(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('vi-VN') + 'đ';
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN');
}

export function formatDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const STATUS_VI = {
  PENDING: 'Chờ xử lý',
  QUOTING: 'Đang báo giá',
  IN_PROGRESS: 'Đang sửa',
  COMPLETED: 'Hoàn thành',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export function statusLabel(s) {
  return STATUS_VI[s] || s || '—';
}

const SERVICE_TYPE_VI = {
  MAINTENANCE: 'Bảo dưỡng',
  REPAIR: 'Sửa chữa',
  WASHING: 'Rửa xe',
  TIRE: 'Lốp',
};

export function serviceTypeLabel(t) {
  return SERVICE_TYPE_VI[t] || t || '—';
}

const APPT_STATUS_VI = {
  PENDING: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export function appointmentStatusLabel(s) {
  return APPT_STATUS_VI[s] || s || '—';
}

export function pct(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

export function safePct(part, whole) {
  if (!whole) return 0;
  return (Number(part) / Number(whole)) * 100;
}

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getPresetRange(key, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = today;
  let end = today;

  switch (key) {
    case 'today': {
      break;
    }
    case '7d': {
      start = new Date(today);
      start.setDate(today.getDate() - 6);
      break;
    }
    case '30d': {
      start = new Date(today);
      start.setDate(today.getDate() - 29);
      break;
    }
    case 'mtd': {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    }
    case 'qtd': {
      const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qStartMonth, 1);
      break;
    }
    case 'ytd': {
      start = new Date(today.getFullYear(), 0, 1);
      break;
    }
    default:
      break;
  }

  return { startDate: toYMD(start), endDate: toYMD(end) };
}
