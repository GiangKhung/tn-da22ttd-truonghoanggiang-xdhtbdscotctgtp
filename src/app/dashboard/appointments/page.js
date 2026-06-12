'use client';

import AppLayout from '../../components/AppLayout';
import { useState, useEffect } from 'react';
import { Calendar, User, Phone, Car, Clock, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCars, setActiveCars] = useState([]);
  const [boardAppointments, setBoardAppointments] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardDate, setBoardDate] = useState(() => new Date().toISOString().split('T')[0]);

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();
      if (data.appointments) {
        setAppointments(data.appointments);
      }
      setLoading(false);
    } catch (err) {
      toast.error('Lỗi tải dữ liệu');
      setLoading(false);
    }
  };

  const fetchBoardAppointments = async () => {
    setBoardLoading(true);
    try {
      const response = await fetch(`/api/appointments?date=${boardDate}`);
      const data = await response.json();
      if (data.appointments) {
        setBoardAppointments(data.appointments);
      }
    } catch (err) {
      toast.error('Lỗi tải dữ liệu khung giờ đặt lịch');
    } finally {
      setBoardLoading(false);
    }
  };

  const fetchActiveCars = async () => {
    try {
      const response = await fetch(`/api/maintenance?date=${boardDate}&limit=50`);
      const payload = await response.json();
      if (payload.data) {
        // filter out COMPLETED if they only want currently active, but the instruction is "chỉ hiển thị các xe đã nhận trong này thôi"
        // Meaning cars accepted on this date.
        // We will deduplicate by carId so we don't show the same car multiple times.
        const uniqueCars = [];
        const seenCarIds = new Set();
        
        for (const record of payload.data) {
          // Chỉ lấy các xe ĐANG SỬA hoặc ĐANG BÁO GIÁ, CHỜ DUYỆT. Các xe đã sửa xong phải biến mất khỏi bảng.
          if (record.status === 'COMPLETED' || record.status === 'DELIVERED' || record.status === 'CANCELLED') {
              continue;
          }

          if (!seenCarIds.has(record.carId)) {
            seenCarIds.add(record.carId);
            uniqueCars.push(record);
          }
        }
        
        setActiveCars(uniqueCars.slice(0, 10));
      }
    } catch (err) {
      toast.error('Lỗi tải bảng xe ' + err.message);
    }
  };

  // call fetchActiveCars & fetchBoardAppointments whenever boardDate changes
  useEffect(() => {
    fetchActiveCars();
    fetchBoardAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardDate]);

  const updateStatus = async (id, status) => {
    try {
      let cancelReason = undefined;
      if (status === 'CANCELLED') {
        const reason = window.prompt('Nhập lý do hủy lịch hẹn (bắt buộc):');
        if (reason === null) return; // Admin nhấn hủy prompt
        const trimmed = reason.trim();
        if (!trimmed) {
          toast.error('Bạn phải nhập lý do hủy lịch hẹn.');
          return;
        }
        cancelReason = trimmed;
      }

      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancelReason })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Cập nhật trạng thái thành công');
        fetchAppointments();
        fetchBoardAppointments();
      } else {
        toast.error(data.error || 'Lỗi cập nhật');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    }
  };

  return (
    <AppLayout>
      <Toaster />
      <div className="page-header">
        <h1 className="page-title">Danh sách đặt lịch</h1>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        {loading ? (
          <p>Đang tải...</p>
        ) : appointments.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>Chưa có yêu cầu đặt lịch nào.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Thông tin xe</th>
                  <th>Thời gian hẹn</th>
                  <th>Dịch vụ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr key={appt.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} /> <strong>{appt.customerName}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={14} /> {appt.phoneNumber}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Car size={14} /> {appt.licensePlate}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={14} /> {new Date(appt.appointmentDate).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td>{appt.serviceType}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: appt.status === 'PENDING' ? '#f1f5f9' : appt.status === 'CANCELLED' ? '#fee2e2' : '#dcfce7',
                          color: appt.status === 'PENDING' ? '#475569' : appt.status === 'CANCELLED' ? '#ef4444' : '#10b981'
                        }}>
                          {appt.status === 'PENDING' ? 'Chờ xác nhận' : appt.status === 'CANCELLED' ? 'Đã hủy' : 'Đã xác nhận'}
                        </span>
                        {appt.status === 'CANCELLED' && appt.cancelReason && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: '#ef4444', 
                            maxWidth: '160px', 
                            wordBreak: 'break-word',
                            lineHeight: '1.2',
                            marginTop: '0.25rem',
                            opacity: 0.95
                          }} title={appt.cancelReason}>
                            Lý do: {appt.cancelReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {appt.status === 'PENDING' && (
                          <button 
                            onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                            style={{ background: '#10b981', color: 'white', padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                          >
                            Xác nhận
                          </button>
                        )}
                        {appt.status !== 'CANCELLED' && (
                          <button 
                            onClick={() => updateStatus(appt.id, 'CANCELLED')}
                            style={{ background: '#ef4444', color: 'white', padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bảng xem khung giờ đặt lịch mới */}
      <div className="card" style={{ marginBottom: '2rem', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} /> Bảng Khung Giờ Đặt Lịch Hẹn ({new Date(boardDate).toLocaleDateString('vi-VN')})
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
              Xem trước và quản lý danh sách khách đặt lịch theo các khung giờ trong ngày
            </p>
          </div>
          <span style={{ 
            background: 'var(--background)', 
            border: '1px solid var(--border)', 
            padding: '0.5rem 1rem', 
            borderRadius: '20px', 
            fontSize: '0.85rem', 
            fontWeight: '600',
            color: 'var(--text)'
          }}>
            Tổng số: {boardAppointments.filter(a => a.status !== 'CANCELLED').length} xe
          </span>
        </div>

        {boardLoading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>Đang tải khung giờ đặt lịch...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {timeSlots.map(slot => {
              const slotHour = parseInt(slot.split(':')[0]);
              const apptsInSlot = boardAppointments.filter(appt => {
                const apptHour = new Date(appt.appointmentDate).getHours();
                return apptHour === slotHour;
              });
              
              const activeInSlot = apptsInSlot.filter(a => a.status !== 'CANCELLED');
              const slotCount = activeInSlot.length;
              const isFull = slotCount >= 10;
              const hasBookings = slotCount > 0;

              return (
                <div 
                  key={slot}
                  style={{
                    background: isFull ? 'rgba(254, 226, 226, 0.4)' : hasBookings ? 'rgba(239, 246, 255, 0.4)' : 'transparent',
                    border: isFull ? '2px solid #fca5a5' : hasBookings ? '2px solid #93c5fd' : '2px dashed var(--border)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    transition: 'all 0.2s ease',
                    boxShadow: hasBookings ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '1.05rem', 
                      fontWeight: '700', 
                      color: isFull ? '#dc2626' : hasBookings ? 'var(--primary)' : 'var(--secondary)' 
                    }}>
                      🕒 {slot}
                    </span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px',
                      background: isFull ? '#fee2e2' : hasBookings ? '#dbeafe' : 'var(--background)',
                      color: isFull ? '#ef4444' : hasBookings ? 'var(--primary)' : 'var(--secondary)'
                    }}>
                      {slotCount}/10 xe
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: '60px' }}>
                    {apptsInSlot.length === 0 ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        flex: 1, 
                        color: 'var(--secondary)', 
                        fontSize: '0.85rem',
                        fontStyle: 'italic',
                        opacity: 0.6
                      }}>
                        Trống
                      </div>
                    ) : (
                      apptsInSlot.map(appt => {
                        const isCancelled = appt.status === 'CANCELLED';
                        return (
                          <div 
                            key={appt.id} 
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              padding: '0.75rem',
                              fontSize: '0.8rem',
                              opacity: isCancelled ? 0.6 : 1,
                              textDecoration: isCancelled ? 'line-through' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: isCancelled ? 'var(--secondary)' : 'var(--text)' }}>
                                🚗 {appt.licensePlate}
                              </strong>
                              <span style={{
                                padding: '0.15rem 0.4rem',
                                borderRadius: '8px',
                                fontSize: '0.65rem',
                                fontWeight: '600',
                                background: appt.status === 'PENDING' ? '#f1f5f9' : appt.status === 'CANCELLED' ? '#fee2e2' : '#dcfce7',
                                color: appt.status === 'PENDING' ? '#475569' : appt.status === 'CANCELLED' ? '#ef4444' : '#10b981'
                              }}>
                                {appt.status === 'PENDING' ? 'Chờ duyệt' : appt.status === 'CANCELLED' ? 'Đã hủy' : 'Đã xác nhận'}
                              </span>
                            </div>
                            
                            <div style={{ color: 'var(--secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.75rem' }}>
                              <span>👤 {appt.customerName}</span>
                              <span>📞 {appt.phoneNumber}</span>
                              <span style={{ fontStyle: 'italic', marginTop: '0.15rem' }}>🛠️ {appt.serviceType}</span>
                            </div>

                            {!isCancelled && (
                              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.4rem' }}>
                                {appt.status === 'PENDING' && (
                                  <button 
                                    onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                                    style={{ 
                                      background: '#10b981', 
                                      color: 'white', 
                                      padding: '0.2rem 0.4rem', 
                                      fontSize: '0.7rem', 
                                      borderRadius: '4px', 
                                      border: 'none', 
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Xác nhận
                                  </button>
                                )}
                                <button 
                                  onClick={() => updateStatus(appt.id, 'CANCELLED')}
                                  style={{ 
                                    background: '#ef4444', 
                                    color: 'white', 
                                    padding: '0.2rem 0.4rem', 
                                    fontSize: '0.7rem', 
                                    borderRadius: '4px', 
                                    border: 'none', 
                                    cursor: 'pointer' 
                                  }}
                                >
                                  Hủy
                                </button>
                              </div>
                            )}

                            {isCancelled && appt.cancelReason && (
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#ef4444', 
                                marginTop: '0.25rem',
                                lineHeight: '1.2'
                              }}>
                                Lý do: {appt.cancelReason}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* active cars layout section */}
      <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', background: 'var(--surface)' }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {Array.from({ length: 10 }).map((_, idx) => {
            const record = activeCars[idx];
            return (
              <div 
                key={idx}
                onClick={() => record ? window.location.href = `/maintenance/${record.id}` : null}
                style={{
                  aspectRatio: '1/1',
                  backgroundColor: record ? '#ebf8ff' : '#f8fafc',
                  border: record ? '2px solid var(--primary)' : '2px dashed var(--border)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: record ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  color: record ? 'var(--primary)' : 'var(--secondary)',
                  boxShadow: record ? '0 4px 12px rgba(43, 108, 176, 0.15)' : 'none'
                }}
                onMouseEnter={e => { if(record) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(43, 108, 176, 0.2)'; } }}
                onMouseLeave={e => { if(record) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(43, 108, 176, 0.15)'; } }}
              >
                {record ? (
                   <>
                     <span style={{ fontSize: '1.75rem', fontWeight: '800' }}>XE {idx + 1}</span>
                     <span style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: '600', textAlign: 'center', padding: '4px 8px', background: 'var(--primary)', color: 'white', borderRadius: '20px' }}>
                       {record.car?.licensePlate}
                     </span>
                   </>
                ) : (
                   <span style={{ fontSize: '1rem', opacity: 0.5 }}>Trống</span>
                )}
              </div>
            )
          })}
        </div>
        
        <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid var(--border)' }}>
           <div style={{ fontWeight: '600', color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '-0.5rem' }}>Chọn ngày xem:</div>
           <input 
              type="date" 
              value={boardDate} 
              onChange={e => setBoardDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontWeight: '500' }}
           />
           <button 
             className="btn-primary"
             onClick={() => {
               fetchActiveCars();
               fetchBoardAppointments();
             }}
             style={{ margin: 0, padding: '0.75rem', borderRadius: '8px' }}
           >
             Cập nhật bảng
           </button>
        </div>
      </div>
    </AppLayout>
  );
}
