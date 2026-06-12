'use client';
import AppLayout from '../../components/AppLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function CustomersAdminPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  /* ── Kiểm tra quyền Admin ────────────────────────────────────── */
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.error || data.user?.role !== 'ADMIN') {
          router.push('/dashboard');
        } else {
          fetchCustomers();
        }
      });
  }, [router]);

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    if (res.ok) {
      const data = await res.json();
      setCustomers(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id, phone) => {
    if (!confirm(`Xóa tài khoản khách hàng ${phone}? Hành động này không thể hoàn tác.`)) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Đã xóa tài khoản khách hàng');
      fetchCustomers();
    } else {
      const data = await res.json();
      toast.error(data.error ?? 'Lỗi xóa');
    }
  };

  const handleToggleLock = async (id, isLocked, phone) => {
    const actionText = isLocked ? 'khóa' : 'mở khóa';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản ${phone}?`)) return;

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isLocked ? 'Đã khóa tài khoản thành công' : 'Đã mở khóa tài khoản thành công');
        fetchCustomers();
      } else {
        toast.error(data.error ?? 'Lỗi cập nhật');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    }
  };

  /* ── Filter ─────────────────────────────────────────────────── */
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.phone.includes(q) ||
      (c.fullname ?? '').toLowerCase().includes(q) ||
      (c.licensePlate ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Tài khoản Khách hàng</h1>
        <span style={{ fontSize:14, color:'var(--text-light)' }}>
          Tổng: <strong>{customers.length}</strong> tài khoản
        </span>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom:'1.25rem', padding:'1rem 1.25rem' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Tìm theo SĐT, họ tên, hoặc biển số xe..."
          style={{ width:'100%', border:'none', outline:'none', fontSize:15, background:'transparent' }}
        />
      </div>

      <div className="card">
        {loading ? (
          <p>Đang tải danh sách...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color:'var(--text-light)', textAlign:'center', padding:'2rem' }}>
            {search ? 'Không tìm thấy kết quả' : 'Chưa có tài khoản khách hàng nào'}
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Số điện thoại</th>
                  <th>Họ và tên</th>
                  <th>Biển số xe</th>
                  <th>Trạng thái</th>
                  <th>Ngày đăng ký</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color:'var(--text-light)', fontSize:13 }}>{i + 1}</td>
                    <td><strong>{c.phone}</strong></td>
                    <td>{c.fullname ?? <span style={{ color:'var(--text-light)' }}>Chưa cập nhật</span>}</td>
                    <td>
                      {c.licensePlate
                        ? <span style={{ background:'#eff6ff', color:'#2563eb', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>{c.licensePlate}</span>
                        : <span style={{ color:'var(--text-light)' }}>—</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: c.isLocked ? '#fee2e2' : '#dcfce7',
                          color: c.isLocked ? '#ef4444' : '#10b981'
                        }}>
                          {c.isLocked ? 'Đã khóa' : 'Hoạt động'}
                        </span>
                        {c.cancellationCount > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                            (Hủy: {c.cancellationCount} lần)
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize:13, color:'var(--text-light)' }}>
                      {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {c.isLocked ? (
                          <button
                            onClick={() => handleToggleLock(c.id, false, c.phone)}
                            style={{ background:'none', color:'#10b981', padding:0, fontWeight:500, border:'none', cursor:'pointer' }}
                          >
                            Mở khóa
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleLock(c.id, true, c.phone)}
                            style={{ background:'none', color:'#eab308', padding:0, fontWeight:500, border:'none', cursor:'pointer' }}
                          >
                            Khóa
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id, c.phone)}
                          style={{ background:'none', color:'var(--error)', padding:0, fontWeight:500, border:'none', cursor:'pointer' }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
