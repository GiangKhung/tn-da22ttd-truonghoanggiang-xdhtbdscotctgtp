'use client';
import AppLayout from '../../components/AppLayout';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';

export default function MaintenanceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      const res = await fetch(`/api/maintenance/${id}`);
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setRecord(data);
      }
    } catch (e) {
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    setProcessing(true);
    try {
        const res = await fetch(`/api/maintenance/${id}/tasks`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, isCompleted: true })
        });
        if (res.ok) {
            toast.success('Đã hoàn thành hạng mục!');
            await fetchRecord(); // Refresh to update active task
        }
    } catch (e) {
        toast.error('Lỗi kết nối');
    } finally {
        setProcessing(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
      try {
          const res = await fetch(`/api/maintenance/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
              setRecord(prev => ({...prev, status: newStatus}));
              toast.success('Đã gửi thông báo cho quản trị viên!');
              router.push('/dashboard');
          }
      } catch (e) {
          toast.error('Lỗi cập nhật');
      }
  };

  if (loading) return <AppLayout><p>Đang tải dữ liệu...</p></AppLayout>;
  if (!record) return <AppLayout><p>Không tìm thấy chứng từ này.</p></AppLayout>;

  const sortedTasks = [...(record.maintenanceTasks || [])].sort((a, b) => a.id - b.id);
  const firstIncompleteIdx = sortedTasks.findIndex(t => !t.isCompleted);
  const isAllDone = firstIncompleteIdx === -1 && sortedTasks.length > 0;
  
  const progressPercentage = sortedTasks.length > 0 
    ? Math.round((sortedTasks.filter(t => t.isCompleted).length / sortedTasks.length) * 100) 
    : 0;

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div>
            <span style={{ cursor: 'pointer', color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', marginBottom: '0.5rem'}} onClick={() => router.push('/dashboard')}>← Quay lại Dashboard</span> 
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>Lệnh sửa chữa: {record.car.licensePlate}</h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Kỹ thuật viên phụ trách: <strong style={{ color: 'var(--primary)' }}>{record.technician?.fullname}</strong></p>
        </div>
        
        <div style={{ textAlign: 'right' }}>
            <span style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '20px', 
                background: record.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                color: record.status === 'COMPLETED' ? '#10b981' : '#60a5fa',
                fontWeight: 'bold',
                fontSize: '0.9rem'
            }}>
                Trạng thái: {record.status}
            </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* WORKFLOW PIPELINE */}
        <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)' }}>Tiến độ sửa chữa</h2>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{progressPercentage}%</span>
            </div>
            
            <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', marginBottom: '3rem', position: 'relative' }}>
                <div style={{ width: `${progressPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                {sortedTasks.map((task, index) => {
                    const isActive = index === firstIncompleteIdx;
                    const isCompleted = task.isCompleted;
                    const isLocked = index > firstIncompleteIdx && firstIncompleteIdx !== -1;

                    return (
                        <div key={task.id} style={{ 
                            display: 'flex', 
                            gap: '1.5rem', 
                            opacity: isLocked ? 0.5 : 1,
                            position: 'relative'
                        }}>
                            {/* Vertical Line Connector */}
                            {index < sortedTasks.length - 1 && (
                                <div style={{ 
                                    position: 'absolute', 
                                    left: '15px', 
                                    top: '35px', 
                                    bottom: '-25px', 
                                    width: '2px', 
                                    background: isCompleted ? '#10b981' : 'rgba(255, 255, 255, 0.1)' 
                                }}></div>
                            )}

                            {/* Circle indicator */}
                            <div style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                background: isCompleted ? '#10b981' : isActive ? '#3b82f6' : 'var(--surface)',
                                border: `2px solid ${isCompleted ? '#10b981' : isActive ? '#3b82f6' : 'var(--border)'}`,
                                display: 'grid', 
                                placeItems: 'center',
                                color: isCompleted || isActive ? '#fff' : 'var(--text-muted)',
                                zIndex: 1,
                                fontWeight: 'bold'
                            }}>
                                {isCompleted ? '✓' : index + 1}
                            </div>

                            <div style={{ flex: 1, background: isActive ? 'rgba(255, 255, 255, 0.02)' : 'transparent', padding: isActive ? '1rem' : '0.2rem 0', borderRadius: '12px', border: isActive ? '1px solid var(--border)' : 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ 
                                        fontSize: '1.1rem', 
                                        fontWeight: isActive ? '700' : '500',
                                        color: isCompleted ? 'var(--text-muted)' : isActive ? 'var(--text)' : 'rgba(255, 255, 255, 0.3)',
                                        textDecoration: isCompleted ? 'line-through' : 'none'
                                    }}>
                                        {task.taskName}
                                    </span>
                                    {isCompleted && <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>HOÀN THÀNH</span>}
                                </div>
                                
                                {isActive && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <button 
                                            className="btn-primary" 
                                            onClick={() => handleCompleteTask(task.id)}
                                            disabled={processing}
                                            style={{ width: 'auto', padding: '0.6rem 2rem', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}
                                        >
                                            {processing ? 'Đang xử lý...' : 'XÁC NHẬN HOÀN THÀNH BƯỚC NÀY'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isAllDone && record.status !== 'COMPLETED' && (
                    <div style={{ 
                        marginTop: '2rem', 
                        padding: '2rem', 
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)', 
                        borderRadius: '16px', 
                        border: '2px dashed #10b981', 
                        textAlign: 'center',
                        animation: 'pulse 2s infinite'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                        <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Tuyệt vời! Bạn đã xong việc.</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Mọi hạng mục đã hoàn tất. Vui lòng gửi thông báo cho quản trị viên để làm thủ tục bàn giao xe.</p>
                        <button 
                            className="btn-primary" 
                            onClick={() => handleStatusChange('COMPLETED')}
                            style={{ background: '#10b981', borderColor: '#10b981', padding: '1rem 3rem', fontSize: '1.1rem' }}
                        >
                            GỬI THÔNG BÁO & KẾT THÚC
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* THÔNG TIN XE & VẬT TƯ */}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Thông tin Phiếu</h3>
                <p><strong>Xe:</strong> {record.car.brand} {record.car.model}</p>
                <p><strong>Ngày nhận:</strong> {new Date(record.date).toLocaleDateString('vi-VN')} {new Date(record.date).toLocaleTimeString('vi-VN')}</p>
                <p><strong>Kỹ thuật viên:</strong> {record.technician?.fullname || record.technician?.username}</p>
                <p><strong>Ghi chú:</strong> {record.description || 'Không có'}</p>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Vật tư đã dùng</h3>
                {record.maintenanceParts?.length > 0 ? (
                    <table style={{ width: '100%', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                                <th>Phụ tùng</th>
                                <th>SL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {record.maintenanceParts.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.5rem 0' }}>{p.part?.name}</td>
                                    <td style={{ padding: '0.5rem 0' }}>{p.quanty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ color: 'var(--secondary)', fontStyle: 'italic' }}>Chưa ghi nhận vật tư.</p>
                )}
            </div>
        </div>

      </div>
    </AppLayout>
  );
}
