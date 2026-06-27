'use client';
import AppLayout from '../components/AppLayout';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, CarFront, Wrench, FileText, Users, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Calendar, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalCars: 0,
    totalMaintenance: 0,
    totalRevenue: 0,
    newCustomers: 0,
    monthlyStats: [],
    activeRecords: [],
    inProgressMaintenance: 0,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (!data.error && data.user) setCurrentUser(data.user); });

    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => { if (!data.error) setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

  const myJobs = stats.activeRecords?.filter(r =>
    r.status === 'IN_PROGRESS' && r.technicianId === currentUser?.id
  ) || [];

  const pendingInvoice = stats.activeRecords?.filter(r => r.status === 'COMPLETED') || [];

  return (
    <AppLayout>
      <div className="topbar">
        <div className="search-bar">
          <Search size={18} color="var(--secondary)" />
          <input 
            type="text" 
            placeholder="Tìm biển số, tên khách khách (Nhấn Enter)..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                router.push(`/maintenance?search=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
          />
        </div>
        <div className="user-profile">
          <button style={{ background: 'transparent', padding: '0.5rem' }}>
            <Bell size={20} color="var(--secondary)" />
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{currentUser?.fullname || currentUser?.username || '...'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>{isAdmin ? 'Quản trị viên' : 'Kỹ thuật viên'}</div>
          </div>
          <div className="avatar">
            {(currentUser?.fullname?.[0] || currentUser?.username?.[0] || 'A').toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Tổng quan hệ thống</h1>
        <p style={{ color: 'var(--secondary)', marginTop: '0.5rem' }}>
          Xin chào! Bạn đang đăng nhập với quyền {isAdmin ? 'Quản trị viên' : 'Kỹ thuật viên'}.
        </p>
      </div>

      {isAdmin && stats.lowStockCount > 0 && (
        <div style={{ padding: '1rem 1.5rem', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#991b1b' }}>
          <AlertCircle size={24} />
          <div style={{ flex: 1 }}>
            <strong>Cảnh báo kho:</strong> Hiện có <strong>{stats.lowStockCount}</strong> loại phụ tùng sắp hết hàng (tồn kho dưới 5).
          </div>
          <Link href="/parts" style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#b91c1c' }}>Kiểm tra ngay →</Link>
        </div>
      )}

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <>
          {/* ===== TECHNICIAN VIEW: My assigned jobs ===== */}
          {!isAdmin && (
            <div className="card" style={{ marginBottom: '2rem', border: myJobs.length > 0 ? '2px solid #3b82f6' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>
                  🔧 Công việc được giao cho bạn
                </h2>
                <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {myJobs.length} việc đang chờ
                </span>
              </div>

              {myJobs.length === 0 ? (
                <p style={{ color: 'var(--secondary)', textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
                  ✅ Bạn không có công việc nào đang chờ xử lý.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myJobs.map(record => {
                    const total = record.maintenanceTasks?.length || 0;
                    const done = record.maintenanceTasks?.filter(t => t.isCompleted).length || 0;
                    const pct = total > 0 ? Math.round(done / total * 100) : 0;
                    return (
                      <div key={record.id} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1rem 1.25rem', borderRadius: '12px',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }} onClick={() => router.push(`/maintenance/${record.id}`)}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#eff6ff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Wrench size={20} color="#3b82f6" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                            {record.car?.licensePlate} — {record.car?.brand} {record.car?.model}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {record.description}
                          </div>
                          {total > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                                <span>Tiến độ: {done}/{total} hạng mục</span>
                                <span style={{ fontWeight: 'bold', color: pct === 100 ? '#10b981' : '#3b82f6' }}>{pct}%</span>
                              </div>
                              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : '#3b82f6', borderRadius: '3px', transition: 'width 0.5s' }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          className="btn-primary"
                          style={{ width: 'auto', padding: '0.5rem 1.25rem', margin: 0, fontSize: '0.85rem', flexShrink: 0, background: pct === 100 ? '#10b981' : undefined, borderColor: pct === 100 ? '#10b981' : undefined }}
                          onClick={e => { e.stopPropagation(); router.push(`/maintenance/${record.id}`); }}
                        >
                          {pct === 100 ? 'Gửi báo cáo ✓' : 'Tiếp tục →'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== ADMIN VIEW: Completed jobs waiting for invoice ===== */}
          {isAdmin && pendingInvoice.length > 0 && (
            <div className="card" style={{ marginBottom: '2rem', border: '2px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#10b981' }}>
                  🎉 Xe đã sửa xong — Chờ xuất hóa đơn & bàn giao
                </h2>
                <span style={{ background: '#ecfdf5', color: '#10b981', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {pendingInvoice.length} xe hoàn thành
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingInvoice.map(record => (
                  <div key={record.id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem', borderRadius: '12px',
                    background: '#f0fdf4', border: '1px solid #bbf7d0'
                  }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <CheckCircle size={20} color="#10b981" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {record.car?.licensePlate} — {record.car?.brand} {record.car?.model}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                        KTV: <strong>{record.technician?.fullname || 'N/A'}</strong>
                        &nbsp;·&nbsp;Ngày: {new Date(record.date).toLocaleDateString('vi-VN')}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#047857', marginTop: '4px' }}>
                        💰 Tổng chi phí: {(record.cost || 0).toLocaleString('vi-VN')} VNĐ
                      </div>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ width: 'auto', padding: '0.5rem 1.25rem', margin: 0, background: '#10b981', borderColor: '#10b981', flexShrink: 0 }}
                      onClick={() => router.push(`/cars/${record.carId}`)}
                    >
                      Xuất hóa đơn →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== STATS CARDS ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="modern-stat-card">
              <div className="stat-info">
                <div className="stat-title">Tổng số xe đã phục vụ</div>
                <div className="stat-value">{stats.totalCars.toLocaleString('vi-VN')}</div>
                <div className="stat-trend trend-up"><TrendingUp size={14} /> +12.5% <span style={{ color: 'var(--secondary)', marginLeft: '4px' }}>so với tháng trước</span></div>
              </div>
              <div className="stat-icon" style={{ background: '#dcfce7', color: '#10b981' }}><CarFront size={24} /></div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-info">
                <div className="stat-title">Xe đang bảo dưỡng</div>
                <div className="stat-value">{stats.inProgressMaintenance || 0}</div>
                <div className="stat-trend trend-down"><TrendingDown size={14} /> {stats.inProgressMaintenance || 0} xe đang xử lý</div>
              </div>
              <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><Wrench size={24} /></div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-info">
                <div className="stat-title">Doanh thu tháng này</div>
                <div className="stat-value">{stats.totalRevenue >= 1000000 ? (stats.totalRevenue / 1000000).toFixed(1).replace('.0', '') + 'M' : stats.totalRevenue.toLocaleString('vi-VN')}</div>
                <div className="stat-trend trend-up">
                    {stats.revenueGrowth !== null && stats.revenueGrowth !== undefined
                      ? <><TrendingUp size={14} /> {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}% <span style={{ color: 'var(--secondary)', marginLeft: '4px' }}>so với tháng trước</span></>
                      : <span style={{ color: 'var(--secondary)' }}>Tháng đầu tiên</span>
                    }
                  </div>
              </div>
              <div className="stat-icon" style={{ background: '#ecfccb', color: '#10b981' }}><FileText size={24} /></div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-info">
                <div className="stat-title">Khách hàng mới</div>
                <div className="stat-value">{stats.newCustomers || 0}</div>
                <div className="stat-trend trend-up">
                    {stats.carsGrowth !== null && stats.carsGrowth !== undefined
                      ? <><TrendingUp size={14} /> {stats.carsGrowth > 0 ? '+' : ''}{stats.carsGrowth}% <span style={{ color: 'var(--secondary)', marginLeft: '4px' }}>so với tháng trước</span></>
                      : <span style={{ color: 'var(--secondary)' }}>Tháng đầu tiên</span>
                    }
                  </div>
              </div>
              <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Users size={24} /></div>
            </div>
          </div>

          {/* ===== CHART + LIVE LIST ===== */}
          <div className="dashboard-grid">
            <div className="chart-card">
              <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Thống kê dịch vụ theo tháng</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={stats.monthlyStats || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                    <ChartTooltip cursor={{ fill: '#f8fafc', radius: 4 }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Bảo dưỡng" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Sửa chữa" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="list-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 600 }}>Lịch đặt gần đây</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Sắp tới</span>
              </div>
              <div className="live-list">
                {stats.recentAppointments && stats.recentAppointments.length > 0 ? (
                  stats.recentAppointments.map(appt => (
                    <div key={appt.id} className="live-item">
                      <div className="car-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><Calendar size={20} /></div>
                      <div className="live-info">
                        <div className="live-plate">{appt.licensePlate} - {appt.customerName}</div>
                        <div className="live-model">
                          <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          {new Date(appt.appointmentDate).toLocaleString('vi-VN', { 
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      <span style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: '#dcfce7',
                        color: '#10b981'
                      }}>
                        {appt.serviceType}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--secondary)', textAlign: 'center', padding: '1rem' }}>Chưa có lịch đặt nào mới.</p>
                )}
              </div>
            </div>

            <div className="list-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 600 }}>Xe mới tiếp nhận</h3>
                <Link href="/maintenance" style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 500 }}>Xem tất cả</Link>
              </div>
              <div className="live-list">
                {stats.activeRecords && stats.activeRecords.filter(r => r.status !== 'COMPLETED').length > 0 ? (
                  stats.activeRecords.filter(r => r.status !== 'COMPLETED').slice(0, 6).map(record => (
                    <div key={record.id} className="live-item" style={{ cursor: 'pointer' }} onClick={() => router.push(`/maintenance/${record.id}`)}>
                      <div className="car-icon"><CarFront size={20} /></div>
                      <div className="live-info">
                        <div className="live-plate">{record.car.licensePlate}</div>
                        <div className="live-model">{record.car.brand} {record.car.model}</div>
                      </div>
                      <span style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: record.status === 'PENDING' ? '#f1f5f9' : record.status === 'QUOTING' ? '#eff6ff' : '#fefcbf',
                        color: record.status === 'PENDING' ? '#475569' : record.status === 'QUOTING' ? '#3b82f6' : '#b45309'
                      }}>
                        {record.status === 'PENDING' ? 'Chờ duyệt' : record.status === 'QUOTING' ? 'Báo giá' : 'Đang sửa'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--secondary)' }}>Chưa có xe nào đang xử lý.</p>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </AppLayout>
  );
}
