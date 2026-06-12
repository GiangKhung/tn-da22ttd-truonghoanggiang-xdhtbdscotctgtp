'use client';
import AppLayout from '../components/AppLayout';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';

function MaintenanceListContent() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [filter, setFilter] = useState({ status: '', search: initialSearch });
  const [stats, setStats] = useState({ total: 0, page: 1, limit: 20 });
  const router = useRouter();

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({
      ...filter,
      page: page.toString(),
      limit: stats.limit.toString()
    });
    
    try {
      const res = await fetch(`/api/maintenance?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.data);
        setStats({ ...stats, total: data.total, page: data.page });
      } else {
        toast.error(data.error || 'Lỗi lấy dữ liệu');
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="badge badge-pending">🕒 Chờ duyệt</span>;
      case 'QUOTING': return <span className="badge badge-quoting">📄 Báo giá</span>;
      case 'IN_PROGRESS': return <span className="badge badge-progress">🔧 Đang sửa</span>;
      case 'COMPLETED': return <span className="badge badge-completed">✅ Hoàn thành</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Quản lý Phiếu Bảo dưỡng</h1>
        <Link href="/maintenance/new" className="btn-primary" style={{ width: 'auto', marginTop: 0 }}>
          <Plus size={18} style={{ marginRight: '8px' }} /> Lập phiếu mới
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '250px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} />
            <input 
              type="text" 
              placeholder="Tìm biển số hoặc tên chủ xe..." 
              style={{ paddingLeft: '40px' }}
              value={filter.search}
              onChange={e => setFilter({ ...filter, search: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && fetchRecords(1)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
              <option value="">-- Tất cả trạng thái --</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="QUOTING">Báo giá</option>
              <option value="IN_PROGRESS">Đang sửa</option>
              <option value="COMPLETED">Hoàn thành</option>
            </select>
          </div>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => fetchRecords(1)}>
            Lọc dữ liệu
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>Đang tải danh sách...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ngày lập</th>
                  <th>Xe / Biển số</th>
                  <th>Chủ xe</th>
                  <th>Kỹ thuật viên</th>
                  <th>Tiến độ</th>
                  <th>Trạng thái</th>
                  <th>Tổng chi phí</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => {
                  const tasks = record.maintenanceTasks || [];
                  const done = tasks.filter(t => t.isCompleted).length;
                  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
                  
                  return (
                    <tr key={record.id}>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(record.date).toLocaleDateString('vi-VN')}<br/>
                        <span style={{ color: 'var(--secondary)' }}>{new Date(record.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td>
                        <strong>{record.car.licensePlate}</strong><br/>
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>{record.car.brand} {record.car.model}</span>
                      </td>
                      <td>{record.car.ownerName}</td>
                      <td>{record.technician?.fullname || 'N/A'}</td>
                      <td>
                        <div style={{ width: '100px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                            <span>{done}/{tasks.length}</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : '#3b82f6', borderRadius: '2px' }}></div>
                          </div>
                        </div>
                      </td>
                      <td>{getStatusBadge(record.status)}</td>
                      <td style={{ fontWeight: 'bold' }}>{(record.cost || 0).toLocaleString()}đ</td>
                      <td>
                        <button 
                          onClick={() => router.push(`/maintenance/${record.id}`)}
                          style={{ background: 'none', color: 'var(--primary)', padding: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={16} /> Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)' }}>
                      Không tìm thấy phiếu bảo dưỡng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {stats.total > stats.limit && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button 
              disabled={stats.page === 1} 
              onClick={() => fetchRecords(stats.page - 1)}
              className="btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }}
            >
              Trang trước
            </button>
            <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>Trang {stats.page} / {Math.ceil(stats.total / stats.limit)}</span>
            <button 
              disabled={stats.page >= Math.ceil(stats.total / stats.limit)} 
              onClick={() => fetchRecords(stats.page + 1)}
              className="btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }}
            >
              Trang sau
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .badge {
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .badge-pending { background: #f1f5f9; color: #475569; }
        .badge-quoting { background: #eff6ff; color: #3b82f6; }
        .badge-progress { background: #fffbeb; color: #b45309; }
        .badge-completed { background: #ecfdf5; color: #10b981; }
      `}</style>
    </AppLayout>
  );
}

export default function MaintenanceListPage() {
  return (
    <Suspense fallback={<AppLayout><div style={{ padding: '2rem' }}>Đang tải...</div></AppLayout>}>
      <MaintenanceListContent />
    </Suspense>
  );
}
