'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ── Inner form (cần Suspense vì dùng useSearchParams) ─────────────────────────
function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đăng nhập thất bại');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      {/* Logo / Header */}
      <div style={styles.header}>
        <div style={styles.logoWrap}>
          <span style={styles.logoIcon}>🔧</span>
        </div>
        <h1 style={styles.brand}>Gara Trường Phát</h1>
        <p style={styles.subtitle}>Hệ thống quản lý nội bộ</p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Tên đăng nhập</label>
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon}>👤</span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
              autoComplete="username"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Mật khẩu</label>
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon}>🔑</span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
              style={{ ...styles.input, paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <span style={styles.loadingInner}>
              <span style={styles.spinner} />
              Đang đăng nhập…
            </span>
          ) : (
            'Đăng nhập'
          )}
        </button>
      </form>

      <p style={styles.footer}>© 2025 Gara Trường Phát · Hệ thống quản lý</p>
    </div>
  );
}

// ── Page export (bọc Suspense) ────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div style={styles.container}>
      {/* Background decoration */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <Suspense fallback={<div style={{ color: '#fff' }}>Đang tải…</div>}>
        <LoginForm />
      </Suspense>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        input:focus {
          outline: none !important;
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.05); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(1.08); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
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
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '1rem',
  },
  bgOrb1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, transparent 70%)',
    top: '-100px',
    left: '-150px',
    animation: 'float1 8s ease-in-out infinite',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
    bottom: '-80px',
    right: '-100px',
    animation: 'float2 10s ease-in-out infinite',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '24px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
    animation: 'fadeInUp 0.6s ease-out',
    position: 'relative',
    zIndex: 1,
  },
  header: { textAlign: 'center', marginBottom: '2rem' },
  logoWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    fontSize: '28px',
    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
  },
  logoIcon: { lineHeight: 1 },
  brand: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: '-0.02em',
    marginBottom: '0.25rem',
  },
  subtitle: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: '0.02em',
  },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: {
    position: 'absolute',
    left: '0.875rem',
    fontSize: '14px',
    pointerEvents: 'none',
    userSelect: 'none',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.5rem',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '0.9375rem',
    transition: 'all 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    lineHeight: 1,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(220, 38, 38, 0.15)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    color: '#fca5a5',
    fontSize: '0.875rem',
  },
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.875rem',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
  },
  loadingInner: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.3)',
  },
};
