'use client';
import AppLayout from '../components/AppLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function PartsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', stockQuantity: 0, price: '' });

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
            }
        }
      });
  }, [router]);

  const fetchParts = async () => {
    const res = await fetch(`/api/parts?q=${search}`);
    if (res.ok) {
        const data = await res.json();
        setParts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
      if (currentUser?.role === 'ADMIN') {
          const timeout = setTimeout(() => {
             fetchParts();
          }, 300);
          return () => clearTimeout(timeout);
      }
  }, [currentUser, search]);

  const handleEdit = (part) => {
    setFormData({ name: part.name, category: part.category || '', stockQuantity: part.stockQuantity || 0, price: part.price });
    setEditingId(part.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if(!confirm('Bạn có chắc muốn xóa phụ tùng/vật tư này?')) return;
    
    const res = await fetch(`/api/parts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
        toast.success('Xóa thành công!');
        fetchParts();
    } else {
        toast.error(data.error || 'Lỗi khi xóa!');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId ? `/api/parts/${editingId}` : '/api/parts';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });

    if (res.ok) {
        toast.success(editingId ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setShowForm(false);
        fetchParts();
    } else {
        const data = await res.json();
        toast.error(data.error);
    }
  };

  if (!currentUser || currentUser.role !== 'ADMIN') return <AppLayout><div style={{padding: '2rem'}}>Đang xác thực quyền Admin...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Quản lý Phụ tùng / Vật tư</h1>
        <button className="btn-primary" style={{ width: 'auto', marginTop: 0 }} onClick={() => {
            setFormData({ name: '', category: '', stockQuantity: 0, price: '' });
            setEditingId(null);
            setShowForm(!showForm);
        }}>
          {showForm ? 'Hủy' : '+ Thêm Vật tư'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 style={{marginBottom: '1rem', color: 'var(--primary)'}}>{editingId ? 'Cập nhật Vật tư' : 'Thêm Vật tư mới'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Tên phụ tùng/vật tư (*)</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Dầu máy Castrol, Má phanh trước..." />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Nhóm vật tư</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                    <option value="">-- Chọn nhóm vật tư --</option>
                    <option value="Dầu nhớt & Chất lỏng">Dầu nhớt & Chất lỏng</option>
                    <option value="Lọc các loại">Lọc các loại</option>
                    <option value="Phanh & Khung gầm">Phanh & Khung gầm</option>
                    <option value="Động cơ & Hộp số">Động cơ & Hộp số</option>
                    <option value="Điện & Điều hòa">Điện & Điều hòa</option>
                    <option value="Ngoại thất & Nội thất">Ngoại thất & Nội thất</option>
                    <option value="Lốp & La-zăng">Lốp & La-zăng</option>
                    <option value="Phụ kiện & Đồ chơi">Phụ kiện & Đồ chơi</option>
                    <option value="Khác">Khác</option>
                </select>
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Số lượng tồn kho</label>
                <input type="number" min="0" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: parseInt(e.target.value) || 0})} placeholder="Ví dụ: 10" />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Đơn giá (VNĐ) (*)</label>
                <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Ví dụ: 150000" />
            </div>
            <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2' }}>{editingId ? 'Cập nhật' : 'Lưu Danh mục'}</button>
          </form>
        </div>
      )}

      <div className="card">
        <input 
          type="text" 
          placeholder="Tìm kiếm vật tư theo tên..." 
          style={{ marginBottom: '1.5rem' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {loading ? <p>Đang tải danh sách...</p> : (
            <div className="table-container">
            <table>
                <thead>
                <tr>
                    <th>Tên Vật tư / Phụ tùng</th><th>Nhóm vật tư</th><th>Tồn kho</th><th>Đơn giá</th><th>Thao tác</th>
                </tr>
                </thead>
                <tbody>
                {parts.map(p => (
                    <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.category || '—'}</td>
                        <td style={{ color: p.stockQuantity < 5 ? 'var(--error)' : 'inherit', fontWeight: p.stockQuantity < 5 ? 'bold' : 'normal' }}>
                            {p.stockQuantity || 0}
                            {p.stockQuantity < 5 && <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>SẮP HẾT</span>}
                        </td>
                        <td>{p.price.toLocaleString('vi-VN')} VNĐ</td>
                        <td>
                            <button onClick={() => handleEdit(p)} style={{background: 'none', color: 'var(--primary)', padding: 0, marginRight: '1rem', fontWeight: 500}}>Sửa</button>
                            <button onClick={() => handleDelete(p.id)} style={{background: 'none', color: 'var(--error)', padding: 0, fontWeight: 500}}>Xóa</button>
                        </td>
                    </tr>
                ))}
                {parts.length === 0 && <tr><td colSpan="5" style={{textAlign: 'center', padding: '1rem'}}>Không tìm thấy vật tư nào.</td></tr>}
                </tbody>
            </table>
            </div>
        )}
      </div>
    </AppLayout>
  );
}
