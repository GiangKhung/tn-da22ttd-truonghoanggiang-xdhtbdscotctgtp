'use client';
import AppLayout from '../components/AppLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', fullname: '', role: 'TECHNICIAN' });

  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
            if (data.user.role !== 'ADMIN') {
                router.push('/dashboard');
            } else {
                setCurrentUser(data.user);
                fetchUsers();
            }
        }
      });
  }, [router]);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
        const data = await res.json();
        setUsers(data);
    }
    setLoading(false);
  };

  const handleEdit = (user) => {
    setFormData({ username: user.username, password: '', fullname: user.fullname, role: user.role });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if(!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
        toast.success('Xóa tài khoản thành công!');
        fetchUsers();
    } else {
        toast.error(data.error || 'Lỗi khi xóa!');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
        // Update user
        const res = await fetch(`/api/users/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            toast.success('Cập nhật thành công!');
            setShowForm(false);
            fetchUsers();
        } else {
            const data = await res.json();
            toast.error(data.error);
        }
    } else {
        // Create user
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            toast.success('Tạo tài khoản thành công!');
            setShowForm(false);
            fetchUsers();
        } else {
            const data = await res.json();
            toast.error(data.error);
        }
    }
  };

  if (!currentUser || currentUser.role !== 'ADMIN') return <AppLayout><div style={{padding: '2rem'}}>Đang xác thực quyền Admin...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Quản lý Nhân sự</h1>
        <button className="btn-primary" style={{ width: 'auto', marginTop: 0 }} onClick={() => {
            setFormData({ username: '', password: '', fullname: '', role: 'TECHNICIAN' });
            setEditingId(null);
            setShowForm(!showForm);
        }}>
          {showForm ? 'Hủy' : '+ Thêm nhân viên'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 style={{marginBottom: '1rem', color: 'var(--primary)'}}>{editingId ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Tên đăng nhập {editingId && '(Không thể đổi)'}</label>
                <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!editingId} />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Họ và tên (*)</label>
                <input required value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Mật khẩu {editingId && '(Để trống nếu không đổi)'}</label>
                <input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Chức vụ (*)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="TECHNICIAN">Kỹ thuật viên</option>
                    <option value="ADMIN">Quản trị viên</option>
                </select>
            </div>
            <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2' }}>{editingId ? 'Cập nhật' : 'Lưu tài khoản'}</button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? <p>Đang tải danh sách...</p> : (
            <div className="table-container">
            <table>
                <thead>
                <tr>
                    <th>Tên đăng nhập</th><th>Họ và tên</th><th>Chức vụ</th><th>Thao tác</th>
                </tr>
                </thead>
                <tbody>
                {users.map(u => (
                    <tr key={u.id}>
                        <td><strong>{u.username}</strong></td>
                        <td>{u.fullname}</td>
                        <td>{u.role === 'ADMIN' ? 'Quản trị viên' : 'Kỹ thuật viên'}</td>
                        <td>
                            <button onClick={() => handleEdit(u)} style={{background: 'none', color: 'var(--primary)', padding: 0, marginRight: '1rem', fontWeight: 500}}>Sửa</button>
                            {u.id !== currentUser.id && (
                                <button onClick={() => handleDelete(u.id)} style={{background: 'none', color: 'var(--error)', padding: 0, fontWeight: 500}}>Xóa</button>
                            )}
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
