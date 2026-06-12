'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ─── STATUS helpers ─────────────────────────────────────────── */
const STATUS_MAP = {
  PENDING:    { label: 'Chờ xử lý',   bg: '#fef3c7', color: '#92400e' },
  QUOTING:    { label: 'Báo giá',     bg: '#eff6ff', color: '#1d4ed8' },
  IN_PROGRESS:{ label: 'Đang sửa',    bg: '#dbeafe', color: '#1e40af' },
  COMPLETED:  { label: 'Hoàn thành',  bg: '#d1fae5', color: '#065f46' },
  CANCELLED:  { label: 'Đã hủy',      bg: '#fee2e2', color: '#991b1b' },
  CONFIRMED:  { label: 'Đã xác nhận', bg: '#ede9fe', color: '#5b21b6' },
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
  const [infoMsg,    setInfoMsg]    = useState('');

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
  const [carMsg, setCarMsg]         = useState('');

  /* Change password */
  const [curPwd,     setCurPwd]     = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [cfmPwd,     setCfmPwd]     = useState('');
  const [pwdSaving,  setPwdSaving]  = useState(false);
  const [pwdMsg,     setPwdMsg]     = useState('');

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
    setCarMsg('');
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
        setCarMsg('✅ Thêm xe mới thành công!');
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
        setCarMsg('❌ ' + (data.error ?? 'Lỗi thêm xe'));
      }
    } catch (err) {
      setCarMsg('❌ Lỗi kết nối máy chủ');
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
    setSaving(true); setInfoMsg('');
    const res  = await fetch('/api/auth/customer/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullname: editName, licensePlate: editPlate }),
    });
    const data = await res.json();
    if (res.ok) {
      setCustomer(data.customer);
      setInfoMsg('✅ Cập nhật thành công!');
      setEditMode(false);
      /* reload history if plate changed */
      if (editPlate !== customer.licensePlate) loadProfile();
    } else {
      setInfoMsg('❌ ' + (data.error ?? 'Lỗi'));
    }
    setSaving(false);
  };

  /* ── Change password ────────────────────────────────────────── */
  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (newPwd !== cfmPwd) { setPwdMsg('❌ Mật khẩu xác nhận không khớp'); return; }
    setPwdSaving(true); setPwdMsg('');
    const res  = await fetch('/api/auth/customer/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwdMsg('✅ Đổi mật khẩu thành công!');
      setCurPwd(''); setNewPwd(''); setCfmPwd('');
    } else {
      setPwdMsg('❌ ' + (data.error ?? 'Lỗi'));
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
        border: '1.5px solid rgba(59, 125, 216, 0.25)', 
        padding: '24px', 
        background: '#ffffff', 
        borderRadius: '20px', 
        animation: 'fadeIn 0.3s ease-out', 
        boxShadow: '0 10px 25px rgba(59, 130, 246, 0.08)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: '#10b981', 
              animation: 'pulsing 2s infinite' 
            }}></span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Theo dõi trực tuyến (Live Feed)
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Tự động làm mới mỗi 10 giây</span>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>
          🛠️ Tiến độ dịch vụ xe {carInfo?.licensePlate}
        </h3>

        {/* Stepper Steps */}
        <div className="stepper-horizontal" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '32px', marginTop: '16px' }}>
          <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '3px', background: '#e2e8f0', zIndex: '1' }}></div>
          
          <div style={{ 
            position: 'absolute', 
            top: '15px', 
            left: '0', 
            width: `${(currentStepIndex / (steps.length - 1)) * 100}%`, 
            height: '3px', 
            background: '#3b82f6', 
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
              background: '#ffffff',
              border: '3px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '13px',
              zIndex: '3',
              position: 'relative',
              transition: 'all 0.3s ease'
            };

            if (isCompleted) {
              bubbleStyle.background = '#3b82f6';
              bubbleStyle.borderColor = '#3b82f6';
            } else if (isActive) {
              bubbleStyle.background = '#ffffff';
              bubbleStyle.borderColor = '#3b82f6';
            }

            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '22%', zIndex: '3' }}>
                <div style={bubbleStyle}>
                  {isCompleted ? (
                    <span style={{ color: '#ffffff', fontSize: '12px' }}>✓</span>
                  ) : (
                    <span style={{ color: isActive ? '#3b82f6' : '#94a3b8' }}>{idx + 1}</span>
                  )}
                </div>
                <span style={{ 
                  marginTop: '10px', 
                  fontSize: '13px', 
                  fontWeight: isActive ? '700' : '500', 
                  color: isActive ? '#1e293b' : isCompleted ? '#3b82f6' : '#94a3b8',
                  textAlign: 'center'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Detail Content */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
            Bước hiện tại: <span style={{ color: '#3b82f6' }}>{steps[currentStepIndex].label}</span>
          </h4>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>{steps[currentStepIndex].desc}</p>

          {currentStatus === 'QUOTING' && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px' }}>
              <p style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '600', lineHeight: 1.5 }}>
                💡 Gara đang tiến hành chẩn đoán lỗi và lên bảng báo giá phụ tùng, công thợ chi tiết. Bạn sẽ nhận được thông báo báo giá hoặc cuộc gọi từ nhân viên kỹ thuật sớm nhất.
              </p>
            </div>
          )}

          {currentStatus === 'IN_PROGRESS' && (
            <div>
              {/* Task progress percentage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Tiến độ: {doneTasks}/{tasks.length} hạng mục hoàn thành</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#3b82f6' }}>{taskPercentage}%</span>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ width: `${taskPercentage}%`, height: '100%', background: '#3b82f6', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
              </div>

              {/* Tasks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <span style={{ fontSize: '12px' }}>
                      {t.isCompleted ? '✅' : '⏳'}
                    </span>
                    <span style={{ color: t.isCompleted ? '#1e293b' : '#64748b', fontWeight: t.isCompleted ? '600' : '400' }}>
                      {t.taskName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStatus === 'PENDING' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', padding: '12px 16px' }}>
              <p style={{ fontSize: '13px', color: '#b45309', fontWeight: '600', lineHeight: 1.5 }}>
                ⏳ Xe đã được tiếp nhận thành công vào khu vực xưởng bảo trì. Đang xếp hàng chờ phân công kỹ thuật viên đảm nhận kiểm tra chi tiết.
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
        body{font-family:'Inter',sans-serif}
        input,select,textarea{font-family:inherit}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulsing {
          0% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .tab-btn{
          padding:10px 20px; border-radius:10px; border:none; background:transparent;
          cursor:pointer; font-size:14px; font-weight:600; color:#64748b;
          transition:all .2s;
        }
        .tab-btn:hover{background:#f1f5f9;color:#1e293b}
        .tab-btn.active{background:#3b82f6;color:#fff}
        .input-field{
          width:100%; padding:11px 14px; border-radius:10px;
          border:1.5px solid #e2e8f0; font-size:15px; background:#fff;
          transition:border-color .2s; outline:none;
          font-family:inherit;
        }
        .input-field:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
        .btn-primary{
          padding:11px 22px; background:linear-gradient(135deg,#3b82f6,#2563eb);
          color:#fff; border:none; border-radius:10px; font-size:15px;
          font-weight:600; cursor:pointer; transition:opacity .2s;
        }
        .btn-primary:hover{opacity:.9}
        .btn-primary:disabled{opacity:.6;cursor:not-allowed}
        .btn-ghost{
          padding:10px 18px; background:#f1f5f9; color:#475569;
          border:none; border-radius:10px; font-size:14px; font-weight:600;
          cursor:pointer; transition:background .2s;
        }
        .btn-ghost:hover{background:#e2e8f0}
        .msg-ok{color:#059669;font-size:14px;font-weight:500;margin-top:8px}
        .msg-err{color:#dc2626;font-size:14px;font-weight:500;margin-top:8px}
        .record-card{
          border:1px solid #e2e8f0; border-radius:14px; padding:20px;
          background:#fff; animation:fadeIn .3s ease-out;
          transition:box-shadow .2s;
        }
        .record-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08)}
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <Link href="/" style={S.navLogo}>🔧 Gara Trường Phát</Link>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={S.navUser}>Xin chào, <strong>{customer.fullname ?? customer.phone}</strong></span>
          <button onClick={handleLogout} style={S.logoutBtn}>Đăng xuất</button>
        </div>
      </nav>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={S.body}>

        {/* Sidebar */}
        <aside style={S.sidebar}>
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
              { key:'info',         icon:'👤', label:'Thông tin cá nhân' },
              { key:'cars',         icon:'🚗', label:'Danh sách xe' },
              { key:'appointments', icon:'📅', label:'Lịch đặt hẹn' },
              { key:'history',      icon:'🔧', label:'Lịch sử bảo dưỡng' },
              { key:'notifications',icon:'🔔', label:'Thông báo' },
              { key:'settings',     icon:'🔑', label:'Đổi mật khẩu' },
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
                  <span>{t.icon}</span>
                  <span style={{ marginLeft: 8 }}>{t.label}</span>
                  {t.key === 'notifications' && unreadCount > 0 && (
                    <span style={{ 
                      marginLeft: 'auto', 
                      background: '#ef4444', 
                      color: '#ffffff', 
                      borderRadius: '10px', 
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

        {/* Main content */}
        <main style={S.main}>

          {/* ── TAB: Thông tin ────────────────────────────────────── */}
          {tab === 'info' && (
            <div style={S.card}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>Thông tin cá nhân</h3>
                {!editMode && (
                  <button className="btn-ghost" onClick={() => setEditMode(true)}>✏️ Chỉnh sửa</button>
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
                <form onSubmit={handleSaveInfo} style={S.form}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Số điện thoại</label>
                    <input className="input-field" value={customer.phone} disabled
                      style={{ background:'#f8fafc', color:'#94a3b8' }} />
                    <p style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>
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
                  {infoMsg && (
                    <p className={infoMsg.startsWith('✅') ? 'msg-ok' : 'msg-err'}>{infoMsg}</p>
                  )}
                  <div style={{ display:'flex', gap:12, marginTop:4 }}>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                    <button type="button" className="btn-ghost"
                      onClick={() => { setEditMode(false); setInfoMsg(''); }}>
                      Hủy
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── TAB: Danh sách xe ─────────────────────────────────── */}
          {tab === 'cars' && (
            <div style={S.card}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>🚗 Danh sách xe của bạn</h3>
                {!carAddMode && (
                  <button className="btn-primary" onClick={() => { setCarAddMode(true); setCarMsg(''); }} style={{ fontSize:13, padding:'8px 16px' }}>
                    + Thêm xe mới
                  </button>
                )}
              </div>

              {carAddMode ? (
                <form onSubmit={handleAddCar} style={S.form}>
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

                  {carMsg && (
                    <p className={carMsg.startsWith('✅') ? 'msg-ok' : 'msg-err'}>{carMsg}</p>
                  )}

                  <div style={{ display:'flex', gap:12, marginTop:8 }}>
                    <button type="submit" className="btn-primary" disabled={carSaving}>
                      {carSaving ? 'Đang lưu...' : 'Xác nhận thêm'}
                    </button>
                    <button type="button" className="btn-ghost"
                      onClick={() => { setCarAddMode(false); setCarMsg(''); }}>
                      Hủy
                    </button>
                  </div>
                </form>
              ) : cars.length === 0 ? (
                <div style={S.empty}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🚗</div>
                  <p style={{ fontWeight:600, marginBottom:6 }}>Chưa có xe nào được đăng ký</p>
                  <p style={{ color:'#94a3b8', fontSize:14 }}>Thêm xe mới để đăng ký dịch vụ bảo dưỡng nhanh chóng</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {cars.map(c => (
                    <div key={c.id} className="record-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ 
                          background: '#eff6ff', 
                          color: '#2563eb', 
                          padding: '4px 10px', 
                          borderRadius: '8px', 
                          fontSize: '14px', 
                          fontWeight: '800', 
                          border: '1.5px solid #bfdbfe' 
                        }}>
                          {c.licensePlate}
                        </span>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', marginTop: '8px', color: '#1e293b' }}>
                          {c.brand} {c.model} ({c.year})
                        </h4>
                        <p style={{ color:'#64748b', fontSize:'13px', marginTop:'4px' }}>
                          Số km: {c.mileage?.toLocaleString('vi-VN')} km
                          {c.color && ` • Màu: ${c.color}`}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleRemoveCar(c.id, c.licensePlate)}
                        style={{
                          padding: '6px 12px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
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
            <div style={S.card}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>📅 Lịch đặt hẹn của bạn</h3>
                <button className="btn-primary" onClick={() => router.push('/#booking')} style={{ fontSize:13, padding:'8px 16px' }}>
                  + Đặt lịch mới
                </button>
              </div>

              {appointments.length === 0 ? (
                <div style={S.empty}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
                  <p style={{ fontWeight:600, marginBottom:6 }}>Chưa có lịch hẹn nào</p>
                  <p style={{ color:'#94a3b8', fontSize:14 }}>Đặt lịch để được phục vụ nhanh hơn</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {appointments.map(a => {
                    const st = apptStatus(a.status);
                    return (
                      <div key={a.id} className="record-card">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <div>
                            <p style={{ fontWeight:700, fontSize:16 }}>{a.serviceType}</p>
                            <p style={{ color:'#64748b', fontSize:14, marginTop:4 }}>
                              📆 {new Date(a.appointmentDate).toLocaleString('vi-VN')}
                            </p>
                            <p style={{ color:'#64748b', fontSize:14, marginTop:2 }}>
                              🚗 {a.licensePlate} &nbsp;|&nbsp; 📞 {a.phoneNumber}
                            </p>
                            {a.note && <p style={{ color:'#94a3b8', fontSize:13, marginTop:4, fontStyle:'italic' }}>&quot;{a.note}&quot;</p>}
                            {a.cancelReason && (
                              <p style={{ color:'#dc2626', fontSize:13, marginTop:6, fontWeight:'600' }}>
                                🚫 Lý do hủy: &quot;{a.cancelReason}&quot;
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
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                              >
                                Hủy đặt lịch
                              </button>
                            )}
                          </div>
                          <span style={{ background:st.bg, color:st.color, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
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
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h3 style={S.cardTitle}>🔧 Lịch sử bảo dưỡng</h3>
                {cars.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Chọn xe:</span>
                    <select 
                      className="input-field" 
                      style={{ width: 'auto', padding: '6px 12px', borderRadius: '8px', fontSize: '14px' }}
                      value={selectedHistoryPlate}
                      onChange={e => setSelectedHistoryPlate(e.target.value)}
                    >
                      {cars.map(c => (
                        <option key={c.id} value={c.licensePlate}>
                          {c.licensePlate} - {c.brand} {c.model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {cars.length === 0 ? (
                <div style={S.empty}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🚗</div>
                  <p style={{ fontWeight:600, marginBottom:6 }}>Chưa có xe nào được đăng ký</p>
                  <p style={{ color:'#94a3b8', fontSize:14 }}>Vui lòng thêm xe trong tab &quot;Danh sách xe&quot; để xem lịch sử bảo dưỡng.</p>
                  <button className="btn-primary" style={{ marginTop:16 }} onClick={() => setTab('cars')}>
                    Quản lý xe
                  </button>
                </div>
              ) : carInfo ? (
                <>
                  {/* Car info banner */}
                  <div style={S.carBanner}>
                    <div>
                      <p style={{ fontSize:12, color:'#94a3b8', fontWeight:600, letterSpacing:1, textTransform:'uppercase' }}>Xe của bạn</p>
                      <p style={{ fontSize:20, fontWeight:800, color:'#1e293b', marginTop:2 }}>
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
                                <p style={{ fontWeight:700, fontSize:15 }}>{r.description}</p>
                                <p style={{ color:'#64748b', fontSize:13, marginTop:3 }}>
                                  📅 {new Date(r.date).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })}
                                </p>
                              </div>
                              <div style={{ textAlign:'right' }}>
                                <span style={{ background:st.bg, color:st.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                                  {st.label}
                                </span>
                                {r.cost != null && (
                                  <p style={{ fontSize:15, fontWeight:700, color:'#2563eb', marginTop:6 }}>
                                    {Number(r.cost).toLocaleString('vi-VN')}đ
                                  </p>
                                )}
                              </div>
                            </div>

                            {r.maintenanceTasks?.length > 0 && (
                              <div style={{ marginTop:8 }}>
                                <p style={{ fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>CÔNG VIỆC</p>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                  {r.maintenanceTasks.map((t,i) => (
                                    <span key={i} style={{
                                      background: t.isCompleted ? '#d1fae5' : '#f1f5f9',
                                      color:      t.isCompleted ? '#065f46' : '#475569',
                                      padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:500,
                                    }}>
                                      {t.isCompleted ? '✅' : '⏳'} {t.taskName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {r.maintenanceParts?.length > 0 && (
                              <div style={{ marginTop:10 }}>
                                <p style={{ fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>PHỤ TÙNG SỬ DỤNG</p>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                  {r.maintenanceParts.map((p,i) => (
                                    <span key={i} style={{ background:'#eff6ff', color:'#1d4ed8', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:500 }}>
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
                  <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
                  <p style={{ fontWeight:600, marginBottom:6 }}>Không tìm thấy dữ liệu xe</p>
                  <p style={{ color:'#94a3b8', fontSize:14 }}>
                    Biển số <strong>{selectedHistoryPlate}</strong> chưa có lịch sử bảo dưỡng nào trong hệ thống.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Thông báo ───────────────────────────────────── */}
          {tab === 'notifications' && (
            <div style={S.card}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>🔔 Hộp thư thông báo</h3>
                {notifications.some(n => !n.isRead) && (
                  <button className="btn-ghost" onClick={handleMarkNotificationsAsRead} style={{ fontSize: '13px', padding: '6px 12px' }}>
                    Đánh dấu đã đọc tất cả
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={S.empty}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>Chưa có thông báo nào</p>
                  <p style={{ color: '#94a3b8', fontSize: 14 }}>Hộp thư của bạn đang trống.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className="record-card" 
                      style={{ 
                        borderLeft: n.isRead ? '1px solid #e2e8f0' : '4px solid #3b82f6',
                        background: n.isRead ? '#ffffff' : '#f8fafc',
                        padding: '16px 20px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: n.isRead ? '600' : '800', color: '#1e293b' }}>
                            {n.title}
                          </h4>
                          <p style={{ color: '#475569', fontSize: '13.5px', marginTop: '6px', lineHeight: 1.5 }}>
                            {n.content}
                          </p>
                          <p style={{ color: '#94a3b8', fontSize: '11.5px', marginTop: '8px' }}>
                            📅 {new Date(n.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        {!n.isRead && (
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: '#3b82f6', 
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
            <div style={S.card}>
              <div style={S.cardHead}>
                <h3 style={S.cardTitle}>🔑 Đổi mật khẩu</h3>
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
                {pwdMsg && (
                  <p className={pwdMsg.startsWith('✅') ? 'msg-ok' : 'msg-err'}>{pwdMsg}</p>
                )}
                <button type="submit" className="btn-primary" disabled={pwdSaving} style={{ marginTop:4 }}>
                  {pwdSaving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* Modal Hủy lịch hẹn */}
      {cancellingApptId && (
        <div style={S.modalOverlay}>
          <div style={S.modalContent}>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:12, color:'#1f2937' }}>Hủy lịch đặt hẹn</h3>
            <p style={{ fontSize:14, color:'#64748b', marginBottom:16 }}>
              Vui lòng nhập lý do hủy lịch hẹn (bắt buộc). Tài khoản của bạn sẽ bị khóa nếu tự hủy quá 5 lần.
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
              <p style={{ color:'#dc2626', fontSize:13, fontWeight:500, marginBottom:12 }}>
                ❌ {cancelError}
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
                  boxShadow: 'none'
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
  page:    { minHeight:'100vh', background:'#f8fafc', fontFamily:"'Inter',sans-serif" },
  loadWrap:{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh' },
  spinner: { width:36, height:36, border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite' },

  nav:     { height:64, background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 5%', position:'sticky', top:0, zIndex:100 },
  navLogo: { fontWeight:800, fontSize:18, color:'#fff', textDecoration:'none', letterSpacing:.5 },
  navUser: { color:'rgba(255,255,255,.75)', fontSize:14 },
  logoutBtn:{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', padding:'7px 16px', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 },

  body:    { display:'grid', gridTemplateColumns:'280px 1fr', gap:0, minHeight:'calc(100vh - 64px)', maxWidth:1200, margin:'0 auto', padding:'32px 24px', gap:24 },
  sidebar: { background:'#fff', borderRadius:20, padding:24, boxShadow:'0 1px 4px rgba(0,0,0,.06)', height:'fit-content', position:'sticky', top:88 },

  avatarWrap:{ textAlign:'center', paddingBottom:20, borderBottom:'1px solid #f1f5f9', marginBottom:20 },
  avatar:    { width:72, height:72, background:'linear-gradient(135deg,#3b82f6,#2563eb)', color:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, margin:'0 auto 12px' },
  userName:  { fontSize:17, fontWeight:700, color:'#1e293b' },
  userPhone: { color:'#64748b', fontSize:13, marginTop:4 },
  plateBadge:{ display:'inline-block', background:'#eff6ff', color:'#2563eb', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, marginTop:8 },

  sideNav:    { display:'flex', flexDirection:'column', gap:4 },
  sideNavBtn: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', fontSize:14, fontWeight:500, color:'#475569', textAlign:'left', transition:'all .2s' },
  sideNavActive:{ background:'#eff6ff', color:'#2563eb', fontWeight:700 },
  bookBtn:    { width:'100%', marginTop:20, padding:'11px', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, cursor:'pointer', fontSize:14, transition:'opacity .2s' },

  main:    { flex:1, display:'flex', flexDirection:'column', gap:0 },
  card:    { background:'#fff', borderRadius:20, padding:28, boxShadow:'0 1px 4px rgba(0,0,0,.06)' },
  cardHead:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  cardTitle:{ fontSize:18, fontWeight:700, color:'#1e293b' },

  infoGrid:{ display:'flex', flexDirection:'column', gap:0 },
  infoRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid #f1f5f9' },
  infoKey: { fontSize:14, color:'#64748b', fontWeight:500 },
  infoVal: { fontSize:15, color:'#1e293b', fontWeight:600 },

  form:      { display:'flex', flexDirection:'column', gap:16 },
  formGroup: { display:'flex', flexDirection:'column', gap:6 },
  label:     { fontSize:14, fontWeight:600, color:'#374151' },

  carBanner: { background:'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius:14, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  plateBig:  { background:'#fff', border:'2px solid #bfdbfe', color:'#1d4ed8', padding:'6px 14px', borderRadius:10, fontSize:16, fontWeight:800, letterSpacing:1 },

  empty:{ textAlign:'center', padding:'48px 0', color:'#64748b' },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    animation: 'fadeIn 0.3s ease-out',
  },
};
