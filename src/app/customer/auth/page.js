'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const expired = searchParams.get('expired') === '1';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          phone,
          password,
          fullname: mode === 'register' ? fullname : undefined,
          licensePlate: mode === 'register' ? licensePlate : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Đã có lỗi xảy ra');
      } else {
        // Token đã được set vào cookie bởi API
        const redirectTo = searchParams.get('redirect') || '/customer/profile';
        router.push(redirectTo);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <Link href="/" style={styles.backLink}>← Trang chủ</Link>
        <h1 style={styles.title}>{mode === 'login' ? 'Khách hàng Đăng nhập' : 'Đăng ký Tài khoản'}</h1>
        <p style={styles.subtitle}>
          {mode === 'login' 
            ? 'Chào mừng quay trở lại Gara Trường Phát' 
            : 'Đăng ký để theo dõi lịch hẹn và lịch sử sửa chữa'}
        </p>
      </div>

      {expired && !error && <div style={styles.errorBox}>Phiên đăng nhập đã hết hạn.</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Số điện thoại</label>
          <input 
            type="tel" 
            style={styles.input} 
            placeholder="09xx xxx xxx"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />
        </div>

        {mode === 'register' && (
          <>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Họ và tên</label>
              <input 
                type="text" 
                style={styles.input} 
                placeholder="Nguyễn Văn A"
                value={fullname}
                onChange={e => setFullname(e.target.value)}
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Biển số xe (không bắt buộc)</label>
              <input 
                type="text" 
                style={styles.input} 
                placeholder="51G-xxxx"
                value={licensePlate}
                onChange={e => setLicensePlate(e.target.value)}
              />
            </div>
          </>
        )}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Mật khẩu</label>
          <input 
            type="password" 
            style={styles.input} 
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký ngay')}
        </button>
      </form>

      <div style={styles.footer}>
        {mode === 'login' ? (
          <p>Chưa có tài khoản? <span style={styles.toggle} onClick={() => setMode('register')}>Đăng ký ngay</span></p>
        ) : (
          <p>Đã có tài khoản? <span style={styles.toggle} onClick={() => setMode('login')}>Đăng nhập</span></p>
        )}
      </div>
    </div>
  );
}

export default function CustomerAuthPage() {
  return (
    <div style={styles.container}>
      <div style={styles.bgGlow}></div>
      <Suspense fallback={<div>Đang tải...</div>}>
        <AuthForm />
      </Suspense>
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#09090b',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
  },
  bgGlow: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(197, 168, 128, 0.1) 0%, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    background: 'rgba(18, 18, 20, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(197, 168, 128, 0.2)',
    padding: '40px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    animation: 'fadeInUp 0.6s ease-out',
    zIndex: 1,
    color: '#fff',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  backLink: {
    display: 'block',
    fontSize: '14px',
    color: '#c5a880',
    textDecoration: 'none',
    marginBottom: '16px',
    textAlign: 'left',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#a0a0a5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#cbd5e1',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '12px',
    background: '#121214',
    border: '1px solid rgba(197, 168, 128, 0.25)',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
  },
  button: {
    padding: '14px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg,#bf953f 0%,#fcf6ba 25%,#b38728 50%,#fbf5b7 75%,#aa771c 100%)',
    color: '#09090b',
    fontSize: '16px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'opacity 0.2s',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '12px',
    borderRadius: '10px',
    color: '#fca5a5',
    marginBottom: '20px',
    fontSize: '14px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
    color: '#a0a0a5',
  },
  toggle: {
    color: '#c5a880',
    fontWeight: '600',
    cursor: 'pointer',
  }
};
