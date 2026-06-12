'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ role }) {
  const pathname = usePathname();
  
  return (
    <div className="sidebar">
      <div className="sidebar-title">Gara Trường Phát</div>
      <Link href="/dashboard" className="nav-link" data-active={pathname === '/dashboard'}>
        Thống kê
      </Link>
      <Link href="/dashboard/appointments" className="nav-link" data-active={pathname === '/dashboard/appointments'}>
        Lịch đặt hẹn
      </Link>
      <Link href="/cars" className="nav-link" data-active={pathname.startsWith('/cars')}>
        Quản lý Xe
      </Link>
      <Link href="/maintenance" className="nav-link" data-active={pathname === '/maintenance'}>
        Phiếu Bảo dưỡng
      </Link>
      <Link href="/maintenance/new" className="nav-link" data-active={pathname === '/maintenance/new'}>
        + Lập phiếu mới
      </Link>
      {role === 'ADMIN' && (
        <>
          <Link href="/parts" className="nav-link" data-active={pathname === '/parts'}>
            Kho Phụ tùng
          </Link>
          <Link href="/reports" className="nav-link" data-active={pathname === '/reports'}>
            Báo cáo & Thống kê
          </Link>
          <Link href="/users" className="nav-link" data-active={pathname === '/users'}>
            Nhân sự
          </Link>
          <Link href="/users/customers" className="nav-link" data-active={pathname === '/users/customers'}>
            Tài khoản KH
          </Link>
        </>
      )}
      <Link href="/users/change-password" className="nav-link" data-active={pathname === '/users/change-password'}>
        Đổi mật khẩu
      </Link>
      <div style={{ flex: 1 }}></div>
      <button 
        onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/login';
        }} 
        className="nav-link" 
        style={{ textAlign: 'left', background: 'none', border: 'none', width: '100%', color: 'var(--error)' }}
      >
        Đăng xuất
      </button>
    </div>
  );
}
