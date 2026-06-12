'use client';
import AppLayout from '../../components/AppLayout';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const [curPwd,  setCurPwd]  = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [cfmPwd,  setCfmPwd]  = useState('');
  const [loading, setLoading] = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCfm, setShowCfm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPwd !== cfmPwd) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPwd.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đổi mật khẩu thành công!');
        setCurPwd(''); setNewPwd(''); setCfmPwd('');
      } else {
        toast.error(data.error ?? 'Lỗi đổi mật khẩu');
      }
    } catch {
      toast.error('Không thể kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, val, setVal, show, setShow, placeholder }) => (
    <div style={S.group}>
      <label style={S.label}>{label}</label>
      <div style={S.inputWrap}>
        <input
          type={show ? 'text' : 'password'}
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          required
          minLength={6}
          style={S.input}
        />
        <button type="button" onClick={() => setShow(s => !s)} style={S.eyeBtn} title={show ? 'Ẩn' : 'Hiện'}>
          {show ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Đổi mật khẩu</h1>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <p style={{ color: 'var(--text-light)', fontSize: 14, marginBottom: '1.5rem' }}>
          Để bảo mật tài khoản, vui lòng đặt mật khẩu đủ mạnh (ít nhất 6 ký tự).
        </p>

        <form onSubmit={handleSubmit} style={S.form}>
          <Field
            label="Mật khẩu hiện tại"
            val={curPwd} setVal={setCurPwd}
            show={showCur} setShow={setShowCur}
            placeholder="Nhập mật khẩu hiện tại"
          />
          <Field
            label="Mật khẩu mới (ít nhất 6 ký tự)"
            val={newPwd} setVal={setNewPwd}
            show={showNew} setShow={setShowNew}
            placeholder="Nhập mật khẩu mới"
          />
          <Field
            label="Xác nhận mật khẩu mới"
            val={cfmPwd} setVal={setCfmPwd}
            show={showCfm} setShow={setShowCfm}
            placeholder="Nhập lại mật khẩu mới"
          />

          {/* Strength indicator */}
          {newPwd.length > 0 && (
            <div>
              <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{
                    flex:1, height:4, borderRadius:99,
                    background: newPwd.length > i * 3
                      ? (newPwd.length < 6 ? '#f59e0b' : newPwd.length < 10 ? '#3b82f6' : '#10b981')
                      : '#e2e8f0',
                    transition: 'background .3s',
                  }} />
                ))}
              </div>
              <p style={{ fontSize:12, color: newPwd.length < 6 ? '#f59e0b' : newPwd.length < 10 ? '#3b82f6' : '#10b981' }}>
                {newPwd.length < 6 ? 'Quá ngắn' : newPwd.length < 10 ? 'Trung bình' : 'Mạnh'}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}

const S = {
  form:     { display:'flex', flexDirection:'column', gap:'1.25rem' },
  group:    { display:'flex', flexDirection:'column', gap:'0.5rem' },
  label:    { fontSize:14, fontWeight:600, color:'var(--text)' },
  inputWrap:{ position:'relative', display:'flex', alignItems:'center' },
  input:    {
    width:'100%', padding:'0.7rem 3rem 0.7rem 0.875rem',
    border:'1.5px solid var(--border)', borderRadius:10,
    fontSize:15, outline:'none', fontFamily:'inherit',
    transition:'border-color .2s',
  },
  eyeBtn:   {
    position:'absolute', right:'0.75rem',
    background:'none', border:'none', cursor:'pointer', fontSize:16, padding:4, lineHeight:1,
  },
};
