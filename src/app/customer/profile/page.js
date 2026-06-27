'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ─── STATUS helpers ─────────────────────────────────────────── */
const STATUS_MAP = {
  PENDING:    { label: 'Chờ xử lý',   bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
  QUOTING:    { label: 'Báo giá',     bg: 'rgba(197, 168, 128, 0.15)', color: '#c5a880' },
  IN_PROGRESS:{ label: 'Đang sửa',    bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  COMPLETED:  { label: 'Hoàn thành',  bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
  CANCELLED:  { label: 'Đã hủy',      bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
  CONFIRMED:  { label: 'Đã xác nhận', bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
};

const apptStatus = (s) => STATUS_MAP[s] ?? { label: s, bg: '#f1f5f9', color: '#475569' };

/* ─── Main Component ─────────────────────────────────────────── */
export default function CustomerProfile() {
  const router = useRouter();
  const [customer, setCustomer]         = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory]           = useState([]);
  const [carInfo, setCarInfo]           = useState(null);
  const [loading, setLoading]           = useState(true);

  /* Cars list state */
  const [cars, setCars]                 = useState([]);
  const [selectedHistoryPlate, setSelectedHistoryPlate] = useState('');

  /* Tab: 'info' | 'appointments' | 'history' | 'settings' | 'cars' | 'notifications' */
  const [tab, setTab] = useState('info');
  const [notifications, setNotifications] = useState([]);

  /* Edit info */
  const [editMode,   setEditMode]   = useState(false);
  const [editName,   setEditName]   = useState('');
  const [editPlate,  setEditPlate]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [infoMsg,    setInfoMsg]    = useState({ text: '', isError: false });

  /* Add car form */
  const [carAddMode, setCarAddMode] = useState(false);
  const [newPlate, setNewPlate]     = useState('');
  const [newBrand, setNewBrand]     = useState('');
  const [newModel, setNewModel]     = useState('');
  const [newYear, setNewYear]       = useState(new Date().getFullYear());
  const [newMileage, setNewMileage] = useState(0);
  const [newVin, setNewVin]         = useState('');
  const [newEngine, setNewEngine]   = useState('');
  const [newColor, setNewColor]     = useState('');
  const [carSaving, setCarSaving]   = useState(false);
  const [carMsg, setCarMsg]         = useState({ text: '', isError: false });

  /* Change password */
  const [curPwd,     setCurPwd]     = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [cfmPwd,     setCfmPwd]     = useState('');
  const [pwdSaving,  setPwdSaving]  = useState(false);
  const [pwdMsg,     setPwdMsg]     = useState({ text: '', isError: false });

  /* Cancel appointment */
  const [cancellingApptId, setCancellingApptId] = useState(null);
  const [cancelReason,     setCancelReason]     = useState('');
  const [cancelError,      setCancelError]      = useState('');

  /* ── Load Notifications ─────────────────────────────────────── */
  const loadNotifications = useCallback(async (phone) => {
    if (!phone) return;
    try {
      const res = await fetch(`/api/public/notifications?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Lỗi lấy thông báo:', err);
    }
  }, []);

  /* ── Fetch profile ──────────────────────────────────────────── */
  const loadProfile = useCallback(async () => {
    try {
      const res  = await fetch('/api/auth/customer/me');
      const data = await res.json();
      if (data.error) { router.push('/customer/auth'); return; }
      setCustomer(data.customer);
      setEditName(data.customer.fullname  ?? '');
      setEditPlate(data.customer.licensePlate ?? '');

      const { phone } = data.customer;

      /* Fetch cars list */
      const carsRes = await fetch('/api/public/cars');
      const carsData = await carsRes.json();
      const userCars = carsData.cars ?? [];
      setCars(userCars);

      /* Appointments */
      if (phone) {
        fetch(`/api/public/appointments?phone=${encodeURIComponent(phone)}`)
          .then(r => r.json()).then(d => setAppointments(d.appointments ?? []));
        loadNotifications(phone);
      }

      /* Maintenance history - default to customer's active license plate, or first car, or selectedHistoryPlate */
      const activePlate = selectedHistoryPlate || data.customer.licensePlate || userCars[0]?.licensePlate;
      if (activePlate) {
        if (!selectedHistoryPlate) setSelectedHistoryPlate(activePlate);
        fetch(`/api/public/history?phone=${encodeURIComponent(phone)}&licensePlate=${encodeURIComponent(activePlate)}`)
          .then(r => r.json()).then(d => {
            setCarInfo(d.car ?? null);
            setHistory(d.records ?? []);
          });
      } else {
        setCarInfo(null);
        setHistory([]);
      }
    } catch (e) {
      console.error(e);
      router.push('/customer/auth');
    } finally {
      setLoading(false);
    }
  }, [router, selectedHistoryPlate, loadNotifications]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* ── Add car ────────────────────────────────────────────────── */
  const handleAddCar = async (e) => {
    e.preventDefault();
    setCarSaving(true);
    setCarMsg({ text: '', isError: false });
    try {
      const res = await fetch('/api/public/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: newPlate,
          brand: newBrand,
          model: newModel,
          year: newYear,
          mileage: newMileage,
          vin: newVin,
          engineNumber: newEngine,
          color: newColor
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCarMsg({ text: 'Thêm xe mới thành công!', isError: false });
        setNewPlate('');
        setNewBrand('');
        setNewModel('');
        setNewYear(new Date().getFullYear());
        setNewMileage(0);
        setNewVin('');
        setNewEngine('');
        setNewColor('');
        setCarAddMode(false);
        loadProfile();
      } else {
        setCarMsg({ text: data.error ?? 'Lỗi thêm xe', isError: true });
      }
    } catch (err) {
      setCarMsg({ text: 'Lỗi kết nối máy chủ', isError: true });
    } finally {
      setCarSaving(false);
    }
  };

  /* ── Remove car ──────────────────────────────────────────────── */
  const handleRemoveCar = async (id, plate) => {
    if (!window.confirm(`Bạn có chắc muốn gỡ xe biển số ${plate} khỏi tài khoản không?`)) return;
    try {
      const res = await fetch(`/api/public/cars?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Gỡ xe thành công!');
        if (selectedHistoryPlate === plate) {
          setSelectedHistoryPlate('');
        }
        loadProfile();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi gỡ xe');
      }
    } catch {
      alert('Lỗi kết nối máy chủ');
    }
  };

  /* ── Save info ──────────────────────────────────────────────── */
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true); setInfoMsg({ text: '', isError: false });
    const res  = await fetch('/api/auth/customer/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullname: editName, licensePlate: editPlate }),
    });
    const data = await res.json();
    if (res.ok) {
      setCustomer(data.customer);
      setInfoMsg({ text: 'Cập nhật thành công!', isError: false });
      setEditMode(false);
      /* reload history if plate changed */
      if (editPlate !== customer.licensePlate) loadProfile();
    } else {
      setInfoMsg({ text: data.error ?? 'Lỗi cập nhật', isError: true });
    }
    setSaving(false);
  };

  /* ── Change password ────────────────────────────────────────── */
  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (newPwd !== cfmPwd) {
      setPwdMsg({ text: 'Mật khẩu xác nhận không khớp', isError: true });
      return;
    }
    setPwdSaving(true); setPwdMsg({ text: '', isError: false });
    const res  = await fetch('/api/auth/customer/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwdMsg({ text: 'Đổi mật khẩu thành công!', isError: false });
      setCurPwd(''); setNewPwd(''); setCfmPwd('');
    } else {
      setPwdMsg({ text: data.error ?? 'Lỗi đổi mật khẩu', isError: true });
    }
    setPwdSaving(false);
  };

  /* ── Cancel appointment ─────────────────────────────────────── */
  const handleCancelAppt = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy lịch.');
      return;
    }
    setCancelError('');

    const appt = appointments.find(x => x.id === cancellingApptId);
    if (!appt) return;

    try {
      const res = await fetch(`/api/public/appointments/${cancellingApptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customer.phone,
          licensePlate: appt.licensePlate || '',
          action: 'CANCEL',
          cancelReason: cancelReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCancellingApptId(null);
        // Reload appointments list
        fetch(`/api/public/appointments?phone=${customer.phone}&licensePlate=${customer.licensePlate || ''}`)
          .then(r => r.json())
          .then(apptData => {
            setAppointments(apptData.appointments || []);
          });
        // Reload customer profile data to sync cancellation count and isLocked
        loadProfile();
      } else {
        setCancelError(data.error || 'Lỗi hủy lịch hẹn');
      }
    } catch {
      setCancelError('Lỗi kết nối máy chủ');
    }
  };

  /* ── Logout ─────────────────────────────────────────────────── */
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  // Polling cho tiến độ sửa xe thời gian thực
  useEffect(() => {
    const activeRecord = history[0];
    const isRepairing = activeRecord && activeRecord.status !== 'DELIVERED' && activeRecord.status !== 'CANCELLED';

    if (isRepairing) {
      console.log('Phát hiện xe đang sửa chữa. Kích hoạt tự động đồng bộ thời gian thực mỗi 10 giây...');
      const interval = setInterval(() => {
        const { phone } = customer ?? {};
        const activePlate = selectedHistoryPlate || customer?.licensePlate || cars[0]?.licensePlate;
        if (phone && activePlate) {
          fetch(`/api/public/history?phone=${encodeURIComponent(phone)}&licensePlate=${encodeURIComponent(activePlate)}`)
            .then(r => r.json())
            .then(d => {
              if (d.records) {
                setHistory(d.records);
              }
            })
            .catch(err => console.error('Lỗi sync tiến độ sửa xe:', err));
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [history, customer, selectedHistoryPlate, cars]);

  const renderActiveRepairTracker = (record) => {
    if (!record || record.status !== 'PENDING' && record.status !== 'QUOTING' && record.status !== 'IN_PROGRESS' && record.status !== 'COMPLETED') return null;

    const steps = [
      { key: 'PENDING', label: 'Tiếp nhận xe', desc: 'Đã nhận xe tại gara' },
      { key: 'QUOTING', label: 'Báo giá dịch vụ', desc: 'Đang lập bảng báo giá linh kiện & tiền công' },
      { key: 'IN_PROGRESS', label: 'Đang sửa chữa', desc: 'Kỹ thuật viên đang tiến hành sửa chữa' },
      { key: 'COMPLETED', label: 'Bàn giao xe', desc: 'Xe đã sửa xong, sẵn sàng bàn giao cho quý khách' },
    ];

    const currentStatus = record.status;
    let currentStepIndex = 0;
    if (currentStatus === 'QUOTING') currentStepIndex = 1;
    else if (currentStatus === 'IN_PROGRESS') currentStepIndex = 2;
    else if (currentStatus === 'COMPLETED') currentStepIndex = 3;

    const tasks = record.maintenanceTasks || [];
    const doneTasks = tasks.filter(t => t.isCompleted).length;
    const taskPercentage = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

    return (
      <div className="card active-repair-tracker" style={{ 
        marginBottom: '24px', 
        border: '1px solid rgba(197, 168, 128, 0.2)', 
        padding: '24px', 
        background: '#121214', 
        borderRadius: '4px', 
        animation: 'fadeIn 0.3s ease-out', 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#10b981', 
              animation: 'pulsing 2s infinite' 
            }}></span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Theo dõi trực tuyến (Live Feed)
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#a0a0a5', fontStyle: 'italic' }}>Tự động làm mới mỗi 10 giây</span>
        </div>

        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tiến độ dịch vụ xe {carInfo?.licensePlate}
        </h3>

        {/* Stepper Steps */}
        <div className="stepper-horizontal" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '32px', marginTop: '16px' }}>
          <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '2px', background: '#27272a', zIndex: '1' }}></div>
          
          <div style={{ 
            position: 'absolute', 
            top: '15px', 
            left: '0', 
            width: `${(currentStepIndex / (steps.length - 1)) * 100}%`, 
            height: '2px', 
            background: '#c5a880', 
            zIndex: '2',
            transition: 'width 0.5s ease'
          }}></div>

          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;
            
            let bubbleStyle = {
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#121214',
              border: '2px solid #27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '12px',
              zIndex: '3',
              position: 'relative',
              transition: 'all 0.3s ease',
              color: '#a0a0a5'
            };

            if (isCompleted) {
              bubbleStyle.background = '#c5a880';
              bubbleStyle.borderColor = '#c5a880';
              bubbleStyle.color = '#09090b';
            } else if (isActive) {
              bubbleStyle.background = '#121214';
              bubbleStyle.borderColor = '#c5a880';
              bubbleStyle.color = '#c5a880';
            }

            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '22%', zIndex: '3' }}>
                <div style={bubbleStyle}>
                  {isCompleted ? (
                    <span style={{ color: '#09090b', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                  ) : (
                    <span style={{ color: isActive ? '#c5a880' : '#a0a0a5' }}>{idx + 1}</span>
                  )}
                </div>
                <span style={{ 
                  marginTop: '10px', 
                  fontSize: '11px', 
                  fontWeight: isActive ? '700' : '500', 
                  color: isActive ? '#ffffff' : isCompleted ? '#c5a880' : '#a0a0a5',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Detail Content */}
        <div style={{ background: '#18181c', padding: '20px', borderRadius: '4px', border: '1px solid rgba(197, 168, 128, 0.15)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Bước hiện tại: <span style={{ color: '#c5a880' }}>{steps[currentStepIndex].label}</span>
          </h4>
          <p style={{ fontSize: '13px', color: '#a0a0a5', marginBottom: '16px' }}>{steps[currentStepIndex].desc}</p>

          {currentStatus === 'QUOTING' && (
            <div style={{ background: 'rgba(197, 168, 128, 0.08)', border: '1px solid rgba(197, 168, 128, 0.2)', borderRadius: '4px', padding: '12px 16px' }}>
              <p style={{ fontSize: '13px', color: '#c5a880', fontWeight: '500', lineHeight: 1.5 }}>
                Hệ thống đang tiến hành chẩn đoán lỗi và lên bảng báo giá phụ tùng, công thợ chi tiết. Quý khách sẽ nhận được thông báo báo giá hoặc cuộc gọi từ nhân viên kỹ thuật sớm nhất.
              </p>
            </div>
          )}

          {currentStatus === 'IN_PROGRESS' && (
            <div>
              {/* Task progress percentage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiến độ: {doneTasks}/{tasks.length} hạng mục hoàn thành</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#c5a880' }}>{taskPercentage}%</span>
              </div>
              <div style={{ height: '6px', background: '#27272a', borderRadius: '3px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ width: `${taskPercentage}%`, height: '100%', background: '#c5a880', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
              </div>

              {/* Tasks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <span style={{ 
                      display: 'inline-block', 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: t.isCompleted ? '#10b981' : '#a0a0a5' 
                    }}></span>
                    <span style={{ color: t.isCompleted ? '#ffffff' : '#a0a0a5', fontWeight: t.isCompleted ? '600' : '400' }}>
                      {t.taskName} {t.isCompleted ? '(Đã hoàn thành)' : '(Đang thực hiện)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStatus === 'PENDING' && (
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '4px', padding: '12px 16px' }}>
              <p style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '500', lineHeight: 1.5 }}>
                Xe đã được tiếp nhận thành công vào khu vực xưởng bảo trì. Đang xếp hàng chờ phân công kỹ thuật viên đảm nhận kiểm tra chi tiết.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleMarkNotificationsAsRead = async () => {
    if (notifications.length === 0 || !customer?.phone) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch('/api/public/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customer.phone })
      });
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */
  if (loading) return (
    <div style={S.loadWrap}>
      <div style={S.spinner} />
      <p style={{ color: '#64748b', marginTop: 12 }}>Đang tải...</p>
    </div>
  );
  if (!customer) return null;

  const avatar = customer.fullname?.[0]?.toUpperCase() ?? 'K';

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif;background:#09090b;color:#ffffff}
        input,select,textarea{font-family:inherit;color:#ffffff}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulsing {
          0% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 0 0 rgba(197, 168, 128, 0.4); }
          70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 6px rgba(197, 168, 128, 0); }
          100% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 0 0 rgba(197, 168, 128, 0); }
        }
        .tab-btn{
          padding:10px 20px; border-radius:4px; border:none; background:transparent;
          cursor:pointer; font-size:14px; font-weight:600; color:#a0a0a5;
          transition:all .2s;
        }
        .tab-btn:hover{background:rgba(255,255,255,0.06);color:#ffffff}
        .tab-btn.active{background:#c5a880;color:#09090b}
        .input-field{
          width:100%; padding:11px 14px; border-radius:4px;
          border:1.5px solid rgba(197, 168, 128, 0.25); font-size:15px; background:#18181c;
          color:#ffffff; transition:all .2s; outline:none;
          font-family:inherit;
        }
        .input-field:focus{border-color:#c5a880;box-shadow:0 0 0 3px rgba(197, 168, 128, 0.15)}
        .btn-primary{
          padding:11px 22px; background:linear-gradient(135deg,#bf953f 0%,#fcf6ba 25%,#b38728 50%,#fbf5b7 75%,#aa771c 100%);
          color:#09090b; border:none; border-radius:4px; font-size:15px;
          font-weight:700; cursor:pointer; transition:opacity .2s;
        }
        .btn-primary:hover{opacity:.9}
        .btn-primary:disabled{opacity:.6;cursor:not-allowed}
        .btn-ghost{
          padding:10px 18px; background:rgba(255,255,255,0.05); color:#c5a880;
          border:1px solid rgba(197, 168, 128, 0.25); border-radius:4px; font-size:14px; font-weight:600;
          cursor:pointer; transition:background .2s;
        }
        .btn-ghost:hover{background:rgba(197, 168, 128, 0.1)}
        .msg-ok{color:#34d399;font-size:14px;font-weight:500;margin-top:8px}
        .msg-err{color:#f87171;font-size:14px;font-weight:500;margin-top:8px}
        .record-card{
          border:1px solid rgba(197, 168, 128, 0.15); border-radius:4px; padding:20px;
          background:#121214; animation:fadeIn .3s ease-out;
          transition:box-shadow .2s;
        }
        .record-card:hover{box-shadow:0 10px 30px rgba(0, 0, 0, 0.5)}
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <Link href="/" style={S.navLogo}>TRƯỜNG PHÁT AUTO</Link>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={S.navUser}>Xin chào, <strong>{customer.fullname ?? customer.phone}</strong></span>
          <button onClick={handleLogout} style={S.logoutBtn}>Đăng xuất</button>
        </div>
      </nav>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={S.body}>
        <div style={S.unifiedCard}>
          {/* Sidebar Left */}
          <aside style={S.sidebarLeft}>
            <div style={S.avatarWrap}>
              <div style={S.avatar}>{avatar}</div>
              <h2 style={S.userName}>{customer.fullname ?? 'Khách hàng'}</h2>
              <p style={S.userPhone}>{customer.phone}</p>
              {customer.licensePlate && (
                <span style={S.plateBadge}>{customer.licensePlate}</span>
              )}
            </div>

            <nav style={S.sideNav}>
              {[
                { key:'info',         label:'Thông tin cá nhân' },
                { key:'cars',         label:'Danh sách xe' },
                { key:'appointments', label:'Lịch đặt hẹn' },
                { key:'history',      label:'Lịch sử bảo dưỡng' },
                { key:'notifications',label:'Thông báo' },
                { key:'settings',     label:'Đổi mật khẩu' },
              ].map(t => {
                const unreadCount = notifications.filter(n => !n.isRead).length;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      ...S.sideNavBtn,
                      ...(tab === t.key ? S.sideNavActive : {}),
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%'
                    }}
                  >
                    <span>{t.label}</span>
                    {t.key === 'notifications' && unreadCount > 0 && (
                      <span style={{ 
                        marginLeft: 'auto', 
                        background: '#c5a880', 
                        color: '#09090b', 
                        borderRadius: '4px', 
                        padding: '2px 8px', 
                        fontSize: '11px', 
                        fontWeight: '800' 
                      }}>{unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <button
              onClick={() => router.push('/#booking')}
              style={S.bookBtn}
            >
              + Đặt lịch mới
            </button>
          </aside>

          {/* Main content Right */}
          <main style={S.mainRight}>

            {/* ── TAB: Thông tin ────────────────────────────────────── */}
            {tab === 'info' && (
              <div style={S.tabContent}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>Thông tin cá nhân</h3>
                {!editMode && (
                  <button className="btn-ghost" onClick={() => setEditMode(true)}>Chỉnh sửa</button>
                )}
              </div>

              {!editMode ? (
                <div style={S.infoGrid}>
                  {[
                    ['Số điện thoại', customer.phone],
                    ['Họ và tên',     customer.fullname  ?? 'Chưa cập nhật'],
                    ['Biển số xe',    customer.licensePlate ?? 'Chưa cập nhật'],
                  ].map(([k,v]) => (
                    <div key={k} style={S.infoRow}>
                      <span style={S.infoKey}>{k}</span>
                      <span style={S.infoVal}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleSaveInfo} style={{ ...S.form, maxWidth: 500 }}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Số điện thoại</label>
                    <input className="input-field" value={customer.phone} disabled
                      style={{ background: '#121214', color: '#64748b', borderColor: 'rgba(197, 168, 128, 0.1)' }} />
                    <p style={{ fontSize:12, color:'#a0a0a5', marginTop:4 }}>
                      Không thể thay đổi số điện thoại
                    </p>
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Họ và tên</label>
                    <input className="input-field" value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Nguyễn Văn A" />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Biển số xe</label>
                    <input className="input-field" value={editPlate}
                      onChange={e => setEditPlate(e.target.value)}
                      placeholder="VD: 51G-12345" />
                  </div>
                  {infoMsg.text && (
                    <p className={infoMsg.isError ? 'msg-err' : 'msg-ok'}>{infoMsg.text}</p>
                  )}
                  <div style={{ display:'flex', gap:12, marginTop:4 }}>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                    <button type="button" className="btn-ghost"
                      onClick={() => { setEditMode(false); setInfoMsg({ text: '', isError: false }); }}>
                      Hủy
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── TAB: Danh sách xe ─────────────────────────────────── */}
          {tab === 'cars' && (
            <div style={S.tabContent}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>Danh sách xe của bạn</h3>
                {!carAddMode && (
                  <button className="btn-primary" onClick={() => { setCarAddMode(true); setCarMsg({ text: '', isError: false }); }} style={{ fontSize:13, padding:'8px 16px' }}>
                    + Thêm xe mới
                  </button>
                )}
              </div>

              {carAddMode ? (
                <form onSubmit={handleAddCar} style={{ ...S.form, maxWidth: 800 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={S.formGroup}>
                      <label style={S.label}>Biển số xe *</label>
                      <input className="input-field" value={newPlate}
                        onChange={e => setNewPlate(e.target.value)}
                        placeholder="Ví dụ: 51G-12345" required />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Hãng xe *</label>
                      <input className="input-field" value={newBrand}
                        onChange={e => setNewBrand(e.target.value)}
                        placeholder="Ví dụ: Mazda" required />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Dòng xe *</label>
                      <input className="input-field" value={newModel}
                        onChange={e => setNewModel(e.target.value)}
                        placeholder="Ví dụ: Mazda 3" required />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Năm sản xuất</label>
                      <input className="input-field" type="number" value={newYear}
                        onChange={e => setNewYear(parseInt(e.target.value) || new Date().getFullYear())}
                        placeholder="Ví dụ: 2020" />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Số km đã đi (Mileage)</label>
                      <input className="input-field" type="number" step="any" value={newMileage}
                        onChange={e => setNewMileage(parseFloat(e.target.value) || 0)}
                        placeholder="Ví dụ: 15000" />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Màu xe</label>
                      <input className="input-field" value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                        placeholder="Ví dụ: Trắng" />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Số khung (VIN)</label>
                      <input className="input-field" value={newVin}
                        onChange={e => setNewVin(e.target.value)}
                        placeholder="Không bắt buộc" />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Số máy</label>
                      <input className="input-field" value={newEngine}
                        onChange={e => setNewEngine(e.target.value)}
                        placeholder="Không bắt buộc" />
                    </div>
                  </div>

                  {carMsg.text && (
                    <p className={carMsg.isError ? 'msg-err' : 'msg-ok'}>{carMsg.text}</p>
                  )}

                  <div style={{ display:'flex', gap:12, marginTop:8 }}>
                    <button type="submit" className="btn-primary" disabled={carSaving}>
                      {carSaving ? 'Đang lưu...' : 'Xác nhận thêm'}
                    </button>
                    <button type="button" className="btn-ghost"
                      onClick={() => { setCarAddMode(false); setCarMsg({ text: '', isError: false }); }}>
                      Hủy
                    </button>
                  </div>
                </form>
              ) : cars.length === 0 ? (
                <div style={S.empty}>
                  <p style={{ fontWeight:600, marginBottom:6, color:'#ffffff' }}>Chưa có xe nào được đăng ký</p>
                  <p style={{ color:'#a0a0a5', fontSize:14 }}>Thêm xe mới để đăng ký dịch vụ bảo dưỡng nhanh chóng</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {cars.map(c => (
                    <div key={c.id} className="record-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ 
                          background: 'rgba(197, 168, 128, 0.12)', 
                          color: '#c5a880', 
                          padding: '4px 10px', 
                          borderRadius: '2px', 
                          fontSize: '13px', 
                          fontWeight: '800', 
                          border: '1px solid rgba(197, 168, 128, 0.25)',
                          letterSpacing: '0.05em'
                        }}>
                          {c.licensePlate}
                        </span>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', marginTop: '8px', color: '#ffffff' }}>
                          {c.brand} {c.model} ({c.year})
                        </h4>
                        <p style={{ color:'#a0a0a5', fontSize:'13px', marginTop:'4px' }}>
                          Số km: {c.mileage?.toLocaleString('vi-VN')} km
                          {c.color && ` • Màu: ${c.color}`}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleRemoveCar(c.id, c.licensePlate)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      >
                        Gỡ xe
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Lịch hẹn ─────────────────────────────────────── */}
          {tab === 'appointments' && (
            <div style={S.tabContent}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>Lịch đặt hẹn của bạn</h3>
                <button className="btn-primary" onClick={() => router.push('/#booking')} style={{ fontSize:13, padding:'8px 16px' }}>
                  + Đặt lịch mới
                </button>
              </div>

              {appointments.length === 0 ? (
                <div style={S.empty}>
                  <p style={{ fontWeight:600, marginBottom:6, color:'#ffffff' }}>Chưa có lịch hẹn nào</p>
                  <p style={{ color:'#a0a0a5', fontSize:14 }}>Đặt lịch để được phục vụ nhanh hơn</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {appointments.map(a => {
                    const st = apptStatus(a.status);
                    return (
                      <div key={a.id} className="record-card">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <div>
                            <p style={{ fontWeight:700, fontSize:16, color:'#ffffff' }}>{a.serviceType}</p>
                            <p style={{ color:'#a0a0a5', fontSize:14, marginTop:4 }}>
                              Ngày hẹn: {new Date(a.appointmentDate).toLocaleString('vi-VN')}
                            </p>
                            <p style={{ color:'#cbd5e1', fontSize:14, marginTop:4 }}>
                              Biển số: {a.licensePlate} &nbsp;|&nbsp; Số điện thoại: {a.phoneNumber}
                            </p>
                            {a.note && <p style={{ color:'#a0a0a5', fontSize:13, marginTop:4, fontStyle:'italic' }}>&quot;{a.note}&quot;</p>}
                            {a.cancelReason && (
                              <p style={{ color:'#f87171', fontSize:13, marginTop:6, fontWeight:'600' }}>
                                Lý do hủy: &quot;{a.cancelReason}&quot;
                              </p>
                            )}
                            {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                              <button 
                                onClick={() => {
                                  setCancellingApptId(a.id);
                                  setCancelReason('');
                                  setCancelError('');
                                }}
                                className="btn-cancel-appt"
                                style={{
                                  marginTop: 12,
                                  padding: '6px 12px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                              >
                                Hủy đặt lịch
                              </button>
                            )}
                          </div>
                          <span style={{ background:st.bg, color:st.color, padding:'4px 12px', borderRadius:4, fontSize:12, fontWeight:700, whiteSpace:'nowrap', border:`1px solid ${st.color}40` }}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Lịch sử bảo dưỡng ───────────────────────────── */}
          {tab === 'history' && (
            <div style={S.tabContent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(197, 168, 128, 0.15)', paddingBottom: '1rem' }}>
                <h3 style={S.cardTitle}>Lịch sử bảo dưỡng</h3>
                {cars.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#a0a0a5' }}>Chọn xe:</span>
                    <select 
                      className="input-field" 
                      style={{ width: 'auto', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', background: '#18181c', color: '#ffffff', border: '1.5px solid rgba(197, 168, 128, 0.25)' }}
                      value={selectedHistoryPlate}
                      onChange={e => setSelectedHistoryPlate(e.target.value)}
                    >
                      {cars.map(c => (
                        <option key={c.id} value={c.licensePlate} style={{ background: '#18181c', color: '#ffffff' }}>
                          {c.licensePlate} - {c.brand} {c.model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {cars.length === 0 ? (
                <div style={S.empty}>
                  <p style={{ fontWeight:600, marginBottom:6, color:'#ffffff' }}>Chưa có xe nào được đăng ký</p>
                  <p style={{ color:'#a0a0a5', fontSize:14 }}>Vui lòng thêm xe trong tab &quot;Danh sách xe&quot; để xem lịch sử bảo dưỡng.</p>
                  <button className="btn-primary" style={{ marginTop:16 }} onClick={() => setTab('cars')}>
                    Quản lý xe
                  </button>
                </div>
              ) : carInfo ? (
                <>
                  {/* Car info banner */}
                  <div style={S.carBanner}>
                    <div>
                      <p style={{ fontSize:11, color:'#c5a880', fontWeight:600, letterSpacing:1, textTransform:'uppercase' }}>Xe của bạn</p>
                      <p style={{ fontSize:20, fontWeight:800, color:'#ffffff', marginTop:2 }}>
                        {carInfo.brand} {carInfo.model} {carInfo.year}
                      </p>
                    </div>
                    <span style={S.plateBig}>{carInfo.licensePlate}</span>
                  </div>

                  {renderActiveRepairTracker(history[0])}

                  {history.length === 0 ? (
                    <div style={S.empty}>
                      <p>Chưa có lịch sử bảo dưỡng nào cho xe này.</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {history.map(r => {
                        const st = apptStatus(r.status);
                        return (
                          <div key={r.id} className="record-card">
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                              <div>
                                <p style={{ fontWeight:700, fontSize:15, color:'#ffffff' }}>{r.description}</p>
                                <p style={{ color:'#a0a0a5', fontSize:13, marginTop:3 }}>
                                  Ngày thực hiện: {new Date(r.date).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })}
                                </p>
                              </div>
                              <div style={{ textAlign:'right' }}>
                                <span style={{ background:st.bg, color:st.color, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700, border:`1px solid ${st.color}40` }}>
                                  {st.label}
                                </span>
                                {r.cost != null && (
                                  <p style={{ fontSize:15, fontWeight:700, color:'#c5a880', marginTop:6 }}>
                                    {Number(r.cost).toLocaleString('vi-VN')}đ
                                  </p>
                                )}
                              </div>
                            </div>

                            {r.maintenanceTasks?.length > 0 && (
                              <div style={{ marginTop:8 }}>
                                <p style={{ fontSize:12, fontWeight:600, color:'#cbd5e1', marginBottom:6, letterSpacing: '0.05em' }}>CÔNG VIỆC THỰC HIỆN</p>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                  {r.maintenanceTasks.map((t,i) => (
                                    <span key={i} style={{
                                      background: t.isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                      color:      t.isCompleted ? '#10b981' : '#fbbf24',
                                      padding:'3px 10px', borderRadius:4, fontSize:12, fontWeight:500,
                                      border: t.isCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                                    }}>
                                      {t.isCompleted ? '✓ ' : '• '} {t.taskName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {r.maintenanceParts?.length > 0 && (
                              <div style={{ marginTop:10 }}>
                                <p style={{ fontSize:12, fontWeight:600, color:'#cbd5e1', marginBottom:6, letterSpacing: '0.05em' }}>PHỤ TÙNG THAY THẾ</p>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                  {r.maintenanceParts.map((p,i) => (
                                    <span key={i} style={{ background:'rgba(197, 168, 128, 0.08)', color:'#c5a880', padding:'3px 10px', borderRadius:4, fontSize:12, fontWeight:500, border:'1px solid rgba(197, 168, 128, 0.2)' }}>
                                      {p.part.name} ×{p.quanty}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div style={S.empty}>
                  <p style={{ fontWeight:600, marginBottom:6, color:'#ffffff' }}>Không tìm thấy dữ liệu xe</p>
                  <p style={{ color:'#a0a0a5', fontSize:14 }}>
                    Biển số <strong>{selectedHistoryPlate}</strong> chưa có lịch sử bảo dưỡng nào trong hệ thống.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Thông báo ───────────────────────────────────── */}
          {tab === 'notifications' && (
            <div style={S.tabContent}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>Hộp thư thông báo</h3>
                {notifications.some(n => !n.isRead) && (
                  <button className="btn-ghost" onClick={handleMarkNotificationsAsRead} style={{ fontSize: '13px', padding: '6px 12px' }}>
                    Đánh dấu đã đọc tất cả
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={S.empty}>
                  <p style={{ fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Chưa có thông báo nào</p>
                  <p style={{ color: '#a0a0a5', fontSize: 14 }}>Hộp thư của bạn đang trống.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className="record-card" 
                      style={{ 
                        borderLeft: n.isRead ? '1px solid rgba(197, 168, 128, 0.15)' : '4px solid #c5a880',
                        background: n.isRead ? '#121214' : '#18181c',
                        padding: '16px 20px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: n.isRead ? '600' : '800', color: '#ffffff' }}>
                            {n.title}
                          </h4>
                          <p style={{ color: '#cbd5e1', fontSize: '13.5px', marginTop: '6px', lineHeight: 1.5 }}>
                            {n.content}
                          </p>
                          <p style={{ color: '#a0a0a5', fontSize: '11.5px', marginTop: '8px' }}>
                            Thời gian: {new Date(n.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        {!n.isRead && (
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: '#c5a880', 
                            marginTop: '6px' 
                          }}></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Đổi mật khẩu ─────────────────────────────────── */}
          {tab === 'settings' && (
            <div style={S.tabContent}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>Đổi mật khẩu</h3>
              </div>
              <form onSubmit={handleChangePwd} style={{ ...S.form, maxWidth:440 }}>
                {[
                  { label:'Mật khẩu hiện tại', val:curPwd, set:setCurPwd },
                  { label:'Mật khẩu mới (≥6 ký tự)', val:newPwd, set:setNewPwd },
                  { label:'Xác nhận mật khẩu mới', val:cfmPwd, set:setCfmPwd },
                ].map(({ label, val, set }) => (
                  <div key={label} style={S.formGroup}>
                    <label style={S.label}>{label}</label>
                    <input className="input-field" type="password" value={val}
                      onChange={e => set(e.target.value)} required minLength={6}
                      placeholder="••••••••" />
                  </div>
                ))}
                {pwdMsg.text && (
                  <p className={pwdMsg.isError ? 'msg-err' : 'msg-ok'}>{pwdMsg.text}</p>
                )}
                <button type="submit" className="btn-primary" disabled={pwdSaving} style={{ marginTop:4 }}>
                  {pwdSaving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
              </form>
            </div>
          )}

          </main>
        </div>
      </div>

      {/* Modal Hủy lịch hẹn */}
      {cancellingApptId && (
        <div style={S.modalOverlay}>
          <div style={S.modalContent}>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:12, color:'#ffffff' }}>Hủy lịch đặt hẹn</h3>
            <p style={{ fontSize:14, color:'#a0a0a5', marginBottom:16 }}>
              Vui lòng nhập lý do hủy lịch hẹn (bắt buộc). Tài khoản của quý khách sẽ tạm dừng đặt lịch tự động nếu tự ý hủy quá nhiều lần liên tiếp.
            </p>
            <textarea
              className="input-field"
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy lịch..."
              style={{ width:'100%', resize:'none', marginBottom:12 }}
            />
            {cancelError && (
              <p style={{ color:'#f87171', fontSize:13, fontWeight:500, marginBottom:12 }}>
                {cancelError}
              </p>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCancellingApptId(null)}
                style={{ padding:'8px 16px', fontSize:14 }}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCancelAppt}
                style={{
                  background: '#ef4444',
                  padding: '8px 16px',
                  fontSize: 14,
                  boxShadow: 'none',
                  color: '#ffffff'
                }}
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const S = {
  page:    { minHeight:'100vh', background:'#09090b', color:'#ffffff', fontFamily:"'Inter',sans-serif" },
  loadWrap:{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#09090b', color:'#ffffff' },
  spinner: { width:36, height:36, border:'3px solid rgba(197, 168, 128, 0.15)', borderTopColor:'#c5a880', borderRadius:'4px', animation:'spin 0.8s linear infinite' },

  nav:     { height:64, background:'#121214', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 5%', position:'sticky', top:0, zIndex:100, borderBottom:'1px solid rgba(197, 168, 128, 0.15)' },
  navLogo: { fontWeight:700, fontSize:18, color:'#c5a880', textDecoration:'none', letterSpacing:'.15em', textTransform:'uppercase' },
  navUser: { color:'rgba(255,255,255,.75)', fontSize:14 },
  logoutBtn:{ background:'transparent', border:'1px solid rgba(197, 168, 128, 0.25)', color:'#c5a880', padding:'7px 16px', borderRadius:4, cursor:'pointer', fontSize:14, fontWeight:600, transition:'all .2s' },

  body:    { minHeight:'calc(100vh - 64px)', maxWidth:1200, margin:'0 auto', padding:'32px 24px' },
  unifiedCard: { display:'grid', gridTemplateColumns:'280px 1fr', background:'#121214', borderRadius:4, border:'1px solid rgba(197, 168, 128, 0.15)', boxShadow:'0 20px 40px rgba(0, 0, 0, 0.6)', width:'100%', minHeight:'650px' },
  sidebarLeft: { padding:'32px 24px', borderRight:'1px solid rgba(197, 168, 128, 0.15)', display:'flex', flexDirection:'column' },
  mainRight: { padding:'32px', display:'flex', flexDirection:'column', gap:24, flex:1 },
  tabContent: { animation:'fadeIn 0.3s ease-out', display:'flex', flexDirection:'column', gap:20 },

  avatarWrap:{ textAlign:'center', paddingBottom:20, borderBottom:'1px solid rgba(197, 168, 128, 0.15)', marginBottom:20 },
  avatar:    { width:72, height:72, background:'linear-gradient(135deg,#bf953f 0%,#fcf6ba 25%,#b38728 50%,#fbf5b7 75%,#aa771c 100%)', color:'#09090b', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, margin:'0 auto 12px', border:'1px solid rgba(197, 168, 128, 0.3)' },
  userName:  { fontSize:17, fontWeight:700, color:'#ffffff' },
  userPhone: { color:'#a0a0a5', fontSize:13, marginTop:4 },
  plateBadge:{ display:'inline-block', background:'rgba(197, 168, 128, 0.12)', color:'#c5a880', padding:'4px 12px', borderRadius:2, fontSize:12, fontWeight:700, marginTop:8, border:'1px solid rgba(197, 168, 128, 0.25)' },

  sideNav:    { display:'flex', flexDirection:'column', gap:4 },
  sideNavBtn: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:4, border:'none', borderLeft:'3px solid transparent', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:600, color:'rgba(255, 255, 255, 0.7)', textAlign:'left', transition:'all .2s', textTransform:'uppercase', letterSpacing:'0.08em' },
  sideNavActive:{ background:'rgba(197, 168, 128, 0.08)', color:'#c5a880', fontWeight:700, borderLeft:'3px solid #c5a880' },
  bookBtn:    { width:'100%', marginTop:20, padding:'11px', background:'linear-gradient(135deg,#bf953f 0%,#fcf6ba 25%,#b38728 50%,#fbf5b7 75%,#aa771c 100%)', color:'#09090b', border:'none', borderRadius:4, fontWeight:700, cursor:'pointer', fontSize:13, transition:'opacity .2s', textTransform:'uppercase', letterSpacing:'0.08em' },

  main:    { flex:1, display:'flex', flexDirection:'column', gap:0 },
  card:    { background:'#121214', borderRadius:4, padding:28, boxShadow:'0 10px 30px rgba(0, 0, 0, 0.5)', border:'1px solid rgba(197, 168, 128, 0.15)' },
  cardHead:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  cardTitle:{ fontSize:18, fontWeight:700, color:'#ffffff', letterSpacing:'0.05em' },

  infoGrid:{ display:'flex', flexDirection:'column', gap:0 },
  infoRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid rgba(197, 168, 128, 0.1)' },
  infoKey: { fontSize:14, color:'#a0a0a5', fontWeight:500 },
  infoVal: { fontSize:15, color:'#ffffff', fontWeight:600 },

  form:      { display:'flex', flexDirection:'column', gap:16 },
  formGroup: { display:'flex', flexDirection:'column', gap:6 },
  label:     { fontSize:14, fontWeight:600, color:'#ffffff' },

  carBanner: { background:'linear-gradient(135deg, rgba(197, 168, 128, 0.08), rgba(18, 18, 20, 0.95))', border:'1px solid rgba(197, 168, 128, 0.15)', borderRadius:4, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  plateBig:  { background:'#18181c', border:'2px solid rgba(197, 168, 128, 0.3)', color:'#c5a880', padding:'6px 14px', borderRadius:4, fontSize:16, fontWeight:800, letterSpacing:1 },

  empty:{ textAlign:'center', padding:'48px 0', color:'#a0a0a5' },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modalContent: {
    backgroundColor: '#121214',
    border: '1px solid rgba(197, 168, 128, 0.25)',
    borderRadius: 4,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    animation: 'fadeIn 0.3s ease-out',
    color: '#ffffff'
  },
};
