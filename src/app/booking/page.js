'use client';
import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, Car, Zap, Hammer, ShieldCheck, Search, User, Phone, Camera, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function MobileBooking() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [occupancy, setOccupancy] = useState({}); // Lưu trữ số lượng xe đã đặt từng giờ
  const fileInputRef = useRef(null);
  
  const [customer, setCustomer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    licensePlate: '',
    carBrand: '',
    serviceType: 'MAINTENANCE',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '09:00',
    note: ''
  });

  const services = [
    { id: 'MAINTENANCE', name: 'Bảo trì định kỳ', icon: <ShieldCheck size={24} />, price: '500k+' },
    { id: 'REPAIR', name: 'Sửa động cơ', icon: <Zap size={24} />, price: '200k+' },
    { id: 'WASHING', name: 'Rửa xe/Nội thất', icon: <Search size={24} />, price: '150k+' },
    { id: 'TIRE', name: 'Phanh & Lốp', icon: <Hammer size={24} />, price: 'Liên hệ' },
  ];

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  // Kiểm tra trạng thái đăng nhập của khách hàng
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/customer/me');
        if (res.ok) {
          const data = await res.json();
          if (data.customer) {
            setCustomer(data.customer);
            setFormData(prev => ({
              ...prev,
              customerName: data.customer.fullname || '',
              phoneNumber: data.customer.phone || '',
              licensePlate: data.customer.licensePlate || '',
            }));
          }
        }
      } catch (e) {
        console.error("Lỗi xác thực:", e);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  // Đồng bộ khung giờ từ Database
  useEffect(() => {
    const fetchOccupancy = async () => {
      try {
        const res = await fetch(`/api/bookings?date=${formData.appointmentDate}`);
        if (res.ok) {
          const data = await res.json();
          setOccupancy(data.occupancy || {});
        }
      } catch (e) { console.error("Lỗi đồng bộ giờ:", e); }
    };
    if (formData.appointmentDate && customer) fetchOccupancy();
  }, [formData.appointmentDate, customer]);

  const handleAIScan = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsScanning(true);
    setScanStatus('Cung cấp ảnh cho AI...');
    const toastId = toast.loading('AI đang khởi động...');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setScanStatus('Đang nén ảnh tối ưu...');
      const compressedBase64 = await new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1000 / img.width, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      });
      setScanStatus('AI đang giải mã hình ảnh...');
      const response = await fetch('/api/ai/scan-car', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64 })
      });
      
      setScanStatus(`AI phản hồi: ${response.status}`);
      const data = await response.json();

      if (response.ok && !data.error) {
        setFormData(prev => ({
          ...prev,
          customerName: data.ownerName || prev.customerName,
          licensePlate: data.licensePlate || prev.licensePlate,
          carBrand: `${data.brand || ''} ${data.model || ''}`.trim() || prev.carBrand
        }));
        setScanStatus('Thành công!');
        toast.success('AI hoàn tất nhận diện!', { id: toastId });
      } else {
        const errorMsg = data.error || 'AI thất bại';
        setScanStatus(`Lỗi: ${errorMsg.substring(0, 30)}`);
        toast.error(errorMsg, { id: toastId });
      }
    } catch (e) { setScanStatus('Lỗi kết nối.'); toast.error('Lỗi API', { id: toastId }); }
    finally { setIsScanning(false); setTimeout(() => setScanStatus(''), 3000); }
  };

  const handleBooking = async () => {
    const date = new Date(formData.appointmentDate);
    const [h, m] = formData.appointmentTime.split(':');
    date.setHours(parseInt(h), parseInt(m), 0, 0);

    if (date.getTime() <= Date.now()) {
      toast.error('Không thể đặt lịch hẹn trong quá khứ. Vui lòng chọn khung giờ khác.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, note: `Hãng xe: ${formData.carBrand}. ${formData.note}`, appointmentDate: date.toISOString() })
      });
      if (response.ok) { toast.success('Đặt lịch thành công!'); setStep(5); }
      else { 
        const err = await response.json();
        toast.error(err.error || 'Lỗi đặt lịch'); 
      }
    } catch (e) { toast.error('Lỗi kết nối'); }
    setLoading(false);
  };

  if (!authChecked) {
    return (
      <div style={styles.wrapper}>
        <div style={{...styles.container, justifyContent: 'center', alignItems: 'center'}}>
          <Loader2 className="spin" size={32} color="#2b6cb0" />
          <p style={{marginTop: '10px', color: '#64748b', fontSize: '0.9rem', fontWeight: '500'}}>Đang xác thực thông tin...</p>
        </div>
      </div>
    );
  }

  if (authChecked && !customer) {
    return (
      <div style={styles.wrapper}>
        <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', padding: '40px 20px', textAlign: 'center'}}>
          <div style={{...styles.header, width: '100%', borderRadius: '24px', marginBottom: '20px'}}>
            <div style={styles.headerTop}>
              <Link href="/" style={{color: 'white', opacity: 0.8, textDecoration: 'none'}}>← Gara Trường Phát</Link>
            </div>
            <div style={{marginTop: '1.2rem', paddingBottom: '1rem'}}>
              <h1 style={styles.title}>Đặt lịch 4.0</h1>
              <p style={styles.subtitle}>Vui lòng đăng nhập để tiếp tục</p>
            </div>
          </div>
          <div style={{margin: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#eff6ff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2b6cb0',
              marginBottom: '20px',
              border: '1px solid #bfdbfe'
            }}>
              <Calendar size={36} />
            </div>
            <h2 style={{fontWeight: '800', color: '#1e293b', marginBottom: '10px', fontSize: '1.2rem'}}>Yêu cầu Đăng nhập</h2>
            <p style={{color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '30px'}}>
              Hệ thống đặt lịch trực tuyến yêu cầu quý khách đăng nhập tài khoản để đặt lịch và quản lý lịch sử bảo dưỡng xe.
            </p>
            <Link href="/customer/auth?redirect=/booking" style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: '14px',
              borderRadius: '14px',
              background: '#2b6cb0',
              color: 'white',
              fontWeight: '800',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(43, 108, 176, 0.3)'
            }}>
              Đăng nhập / Đăng ký ngay
            </Link>
            <Link href="/" style={{marginTop: '20px', color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500'}}>
              ← Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <Toaster position="top-center" />
      <div style={styles.container}>
        <div style={styles.header}>
            <div style={styles.headerTop}>
              <Link href="/" style={{color: 'white', opacity: 0.8, textDecoration: 'none'}}>← Gara Trường Phát</Link>
              <div style={styles.chip}>Mobile Booking</div>
            </div>
            <div style={{marginTop: '1.2rem'}}>
              <h1 style={styles.title}>Đặt lịch 4.0</h1>
              <p style={styles.subtitle}>Hệ thống AI & Dữ liệu đồng bộ trực tiếp</p>
            </div>
        </div>

        {step < 5 && (
          <div style={styles.stepper}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{...styles.dot, width: step === s ? '35px' : '10px', background: step >= s ? '#2b6cb0' : '#e2e8f0'}} />
            ))}
          </div>
        )}

        <main style={styles.main}>
          {step === 1 && (
            <div className="animate-fade-in">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                <h2 style={styles.sectionTitle}>Thông tin liên hệ & Xe</h2>
                <label htmlFor="ai-scan" style={{...styles.aiBtn, opacity: isScanning ? 0.6 : 1}}>
                  {isScanning ? <Loader2 className="spin" size={16} /> : <Camera size={16} />}
                  <span>AI Scan</span>
                </label>
              </div>
              <input id="ai-scan" type="file" onChange={handleAIScan} accept="image/*" style={{display: 'none'}} />
              {scanStatus && <div style={styles.statusBox}>{scanStatus}</div>}
              
              <div style={styles.formGroup}><label style={styles.label}><User size={14}/> Tên khách hàng</label>
                <input style={styles.input} placeholder="Nguyễn Văn A" value={formData.customerName} onChange={e=>setFormData({...formData, customerName:e.target.value})} /></div>
              <div style={styles.formGroup}><label style={styles.label}><Phone size={14}/> Số điện thoại</label>
                <input style={styles.input} type="tel" placeholder="09xx..." value={formData.phoneNumber} onChange={e=>setFormData({...formData, phoneNumber:e.target.value})} /></div>
              <div style={styles.row}>
                <div style={styles.formGroup}><label style={styles.label}><Car size={14}/> Biển số</label>
                  <input style={styles.input} placeholder="30A-..." value={formData.licensePlate} onChange={e=>setFormData({...formData, licensePlate:e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.label}><Zap size={14}/> Hãng xe</label>
                  <input style={styles.input} placeholder="Vd: Mazda" value={formData.carBrand} onChange={e=>setFormData({...formData, carBrand:e.target.value})} /></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 style={styles.sectionTitle}>Chọn dịch vụ</h2>
              <div style={styles.grid}>
                {services.map(s => (
                  <div key={s.id} onClick={() => setFormData({...formData, serviceType: s.id})}
                    style={{...styles.card, borderColor: formData.serviceType === s.id ? '#2b6cb0' : '#f1f5f9', background: formData.serviceType === s.id ? '#eff6ff' : 'white'}}>
                    <div style={{...styles.iconWrap, background: formData.serviceType === s.id ? '#2b6cb0' : '#f1f5f9', color: formData.serviceType === s.id ? 'white' : '#2b6cb0'}}>{s.icon}</div>
                    <div style={{fontWeight: '700', fontSize: '0.85rem'}}>{s.name}</div>
                    <div style={{fontSize: '0.8rem', color: '#2b6cb0', fontWeight: 'bold'}}>{s.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 style={styles.sectionTitle}>Thời gian hẹn</h2>
              <div style={styles.formGroup}><label style={styles.label}><Calendar size={14}/> Ngày hẹn</label>
                <input style={styles.input} type="date" value={formData.appointmentDate} onChange={e=>setFormData({...formData, appointmentDate:e.target.value})} /></div>
              <div style={{marginTop: '1.2rem'}}><label style={styles.label}><Clock size={14}/> Giờ còn trống (Tối đa 10 xe/giờ)</label>
                <div style={styles.timeGrid}>
                  {timeSlots.map(t => {
                    const hour = parseInt(t.split(':')[0]);
                    const count = occupancy[hour] || 0;
                    const isFull = count >= 10;
                    
                    const d = new Date();
                    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const currentHour = d.getHours();
                    const isToday = formData.appointmentDate === localToday;
                    const isPast = isToday && hour <= currentHour;
                    const isDisabled = isFull || isPast;

                    return (
                      <div key={t} onClick={() => !isDisabled && setFormData({...formData, appointmentTime: t})}
                        style={{...styles.timeChip, 
                          opacity: isDisabled ? 0.5 : 1,
                          background: isDisabled ? (isPast ? '#f1f5f9' : '#fee2e2') : (formData.appointmentTime === t ? '#2b6cb0' : 'white'),
                          color: isDisabled ? (isPast ? '#94a3b8' : '#ef4444') : (formData.appointmentTime === t ? 'white' : '#1e3a8a'),
                          borderColor: isDisabled ? (isPast ? '#cbd5e1' : '#fecaca') : (formData.appointmentTime === t ? '#2b6cb0' : '#e2e8f0'),
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}>
                        {t} {isPast ? '(Qua)' : (isFull ? '(Hết)' : `(${count}/10)`)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h2 style={styles.sectionTitle}>Xác nhận</h2>
              <div style={styles.reviewCard}>
                <p><strong>Khách hàng:</strong> {formData.customerName}</p>
                <p><strong>Số điện thoại:</strong> {formData.phoneNumber}</p>
                <p><strong>Xe:</strong> {formData.licensePlate} ({formData.carBrand})</p>
                <p><strong>Dịch vụ:</strong> {services.find(s=>s.id===formData.serviceType)?.name}</p>
                <p><strong>Ngày giờ:</strong> {formData.appointmentTime} - {formData.appointmentDate}</p>
              </div>
              <textarea style={{...styles.input, height: '80px'}} placeholder="Mô tả tình trạng xe..." value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} />
            </div>
          )}

          {step === 5 && (
            <div style={styles.success}>
              <div style={styles.checkWrap}>✓</div>
              <h2 style={{fontWeight: '800'}}>ĐẶT LỊCH THÀNH CÔNG!</h2>
              <button onClick={()=>window.location.href='/'} style={styles.nextBtn}>Về trang chủ</button>
            </div>
          )}
        </main>

        {step < 5 && (
          <div style={styles.footer}>
            <div style={{display:'flex', gap:'10px'}}>
              {step > 1 && <button onClick={()=>setStep(step-1)} style={styles.backBtn}>Quay lại</button>}
              <button style={{...styles.nextBtn, flex:1}} onClick={()=>step < 4 ? setStep(step+1) : handleBooking()} disabled={loading}>
                {loading ? 'Đang gửi...' : step === 4 ? 'Xác nhận ngay' : 'Tiếp tục →'}
              </button>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`.animate-fade-in{animation:fadeIn 0.3s;}.spin{animation:spin 1s linear infinite;}@keyframes fadeIn{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

const styles = {
  wrapper: { backgroundColor: '#f1f5f9', minHeight: '100vh', display: 'flex', justifyContent: 'center' },
  container: { width: '100%', maxWidth: '440px', minHeight: '100vh', backgroundColor: 'white', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 20px rgba(0,0,0,0.1)' },
  header: { padding: '30px 20px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white', borderRadius: '0 0 32px 32px' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' },
  chip: { background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' },
  title: { fontSize: '1.6rem', fontWeight: '800', margin: '8px 0 4px' },
  subtitle: { fontSize: '0.8rem', opacity: 0.8 },
  stepper: { display: 'flex', gap: '6px', padding: '15px 20px', justifyContent: 'center' },
  dot: { height: '6px', borderRadius: '3px', transition: 'all 0.3s' },
  main: { padding: '10px 20px', flex: 1, paddingBottom: '120px' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' },
  aiBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2b6cb0', padding: '6px 12px', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' },
  statusBox: { color: '#2b6cb0', fontWeight: '700', fontSize: '0.75rem', marginBottom: '1rem', background: '#eff6ff', padding: '8px', borderRadius: '8px', textAlign: 'center' },
  formGroup: { marginBottom: '1rem' },
  label: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', background: '#f8fafc', fontWeight: '500' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  card: { padding: '12px', borderRadius: '16px', border: '2px solid', textAlign: 'center', cursor: 'pointer' },
  iconWrap: { width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  timeChip: { padding: '10px', borderRadius: '12px', border: '1px solid', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700' },
  reviewCard: { background: '#f8fafc', padding: '15px', borderRadius: '16px', marginBottom: '12px', fontSize: '0.85rem', lineHeight: '1.6', border: '1px solid #e2e8f0' },
  success: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px' },
  checkWrap: { width: '70px', height: '70px', background: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '1.5rem' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '15px 20px 30px', background: 'white', borderTop: '1px solid #f1f5f9' },
  backBtn: { padding: '14px 20px', borderRadius: '14px', background: '#f1f5f9', color: '#444', border: 'none', fontWeight: '600' },
  nextBtn: { padding: '14px', borderRadius: '14px', background: '#2b6cb0', color: 'white', fontWeight: '800', border: 'none' }
};
