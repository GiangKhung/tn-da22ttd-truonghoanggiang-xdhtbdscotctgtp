'use client';
import Sidebar from './Sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';

export default function AppLayout({ children }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.push('/login');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  if (!user) return <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="app-layout">
      <Toaster position="top-right" />
      <Sidebar role={user.role} />
      <div className="main-content">
        <div style={{ marginBottom: '2rem', textAlign: 'right', color: 'var(--secondary)' }}>
          Xin chào, <strong>{user.fullname}</strong>
        </div>
        {children}
      </div>
    </div>
  );
}
