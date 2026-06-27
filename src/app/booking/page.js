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
          <Loader2 className="spin" size={32} color="#c5a880" />
          <p style={{marginTop: '10px', color: '#a0a0a5', fontSize: '0.9rem', fontWeight: '500'}}>Đang xác thực thông tin...</p>
        </div>
      </div>
    );
  }

  if (authChecked && !customer) {
    return (
      <div style={styles.wrapper}>
        <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', padding: '40px 20px', textAlign: 'center'}}>
          <div style={{...styles.header, width: '100%', marginBottom: '20px'}}>
            <div style={styles.headerTop}>
              <Link href="/" style={{color: '#a0a0a5', opacity: 0.8, textDecoration: 'none'}}>← Gara Trường Phát</Link>
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
              background: 'rgba(197, 168, 128, 0.08)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c5a880',
              marginBottom: '20px',
              border: '1px solid rgba(197, 168, 128, 0.25)'
            }}>
              <span style={{ fontSize: 24, fontWeight: '800' }}>TP</span>
            </div>
            <h2 style={{fontWeight: '800', color: '#ffffff', marginBottom: '10px', fontSize: '1.2rem'}}>Yêu cầu Đăng nhập</h2>
            <p style={{color: '#a0a0a5', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '30px'}}>
              Hệ thống đặt lịch trực tuyến yêu cầu quý khách đăng nhập tài khoản để đặt lịch và quản lý lịch sử bảo dưỡng xe.
            </p>
            <Link href="/customer/auth?redirect=/booking" style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: '14px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg,#bf953f 0%,#fcf6ba 25%,#b38728 50%,#fbf5b7 75%,#aa771c 100%)',
              color: '#09090b',
              fontWeight: '800',
              textDecoration: 'none'
            }}>
              Đăng nhập / Đăng ký ngay
            </Link>
            <Link href="/" style={{marginTop: '20px', color: '#a0a0a5', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500'}}>
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
              <Link href="/" style={{color: '#a0a0a5', opacity: 0.8, textDecoration: 'none'}}>← Gara Trường Phát</Link>
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
              <div key={s} style={{...styles.dot, width: step === s ? '35px' : '10px', background: step >= s ? '#c5a880' : 'rgba(255, 255, 255, 0.1)'}} />
            ))}
          </div>
        )}

        <main style={styles.main}>
          {step === 1 && (
            <div className="animate-fade-in">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                <h2 style={styles.sectionTitle}>Thông tin liên hệ & Xe</h2>
                <label htmlFor="ai-scan" style={{...styles.aiBtn, opacity: isScanning ? 0.6 : 1}}>
                  {isScanning && <Loader2 className="spin" size={16} />}
                  <span>{isScanning ? 'Đang quét...' : 'Quét Cà Vẹt bằng AI'}</span>
                </label>
              </div>
              <input id="ai-scan" type="file" onChange={handleAIScan} accept="image/*" style={{display: 'none'}} />
              {scanStatus && <div style={styles.statusBox}>{scanStatus}</div>}
              
              <div style={styles.formGroup}><label style={styles.label}>Tên khách hàng</label>
                <input style={styles.input} placeholder="Nguyễn Văn A" value={formData.customerName} onChange={e=>setFormData({...formData, customerName:e.target.value})} /></div>
              <div style={styles.formGroup}><label style={styles.label}>Số điện thoại</label>
                <input style={styles.input} type="tel" placeholder="09xx..." value={formData.phoneNumber} onChange={e=>setFormData({...formData, phoneNumber:e.target.value})} /></div>
              <div style={styles.row}>
                <div style={styles.formGroup}><label style={styles.label}>Biển số xe</label>
                  <input style={styles.input} placeholder="30A-..." value={formData.licensePlate} onChange={e=>setFormData({...formData, licensePlate:e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.label}>Hãng xe</label>
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
                    style={{...styles.card, borderColor: formData.serviceType === s.id ? '#c5a880' : 'rgba(197, 168, 128, 0.15)', background: formData.serviceType === s.id ? 'rgba(197, 168, 128, 0.08)' : '#18181c'}}>
                    <div style={{fontWeight: '700', fontSize: '0.9rem', color: '#ffffff'}}>{s.name}</div>
                    <div style={{fontSize: '0.8rem', color: '#c5a880', fontWeight: 'bold', marginTop: '6px'}}>{s.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 style={styles.sectionTitle}>Thời gian hẹn</h2>
              <div style={styles.formGroup}><label style={styles.label}>Ngày hẹn</label>
                <input style={styles.input} type="date" value={formData.appointmentDate} onChange={e=>setFormData({...formData, appointmentDate:e.target.value})} /></div>
              <div style={{marginTop: '1.2rem'}}><label style={styles.label}>Giờ còn trống (Tối đa 10 xe/giờ)</label>
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
                           background: isDisabled ? (isPast ? 'rgba(255,255,255,0.02)' : 'rgba(239, 68, 68, 0.1)') : (formData.appointmentTime === t ? 'rgba(197, 168, 128, 0.15)' : '#18181c'),
                           color: isDisabled ? (isPast ? '#64748b' : '#f87171') : (formData.appointmentTime === t ? '#c5a880' : '#ffffff'),
                           borderColor: isDisabled ? (isPast ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.25)') : (formData.appointmentTime === t ? '#c5a880' : 'rgba(197, 168, 128, 0.15)'),
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
              <h2 style={{fontWeight: '800', color: '#ffffff'}}>ĐẶT LỊCH THÀNH CÔNG!</h2>
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
  wrapper: { backgroundColor: '#09090b', minHeight: '100vh', display: 'flex', justifyContent: 'center' },
  container: { width: '100%', maxWidth: '440px', minHeight: '100vh', backgroundColor: '#121214', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', borderLeft: '1px solid rgba(197, 168, 128, 0.15)', borderRight: '1px solid rgba(197, 168, 128, 0.15)' },
  header: { padding: '30px 20px', background: 'linear-gradient(135deg, #18181c 0%, #121214 100%)', color: 'white', borderBottom: '1px solid rgba(197, 168, 128, 0.15)' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#a0a0a5' },
  chip: { background: 'rgba(197, 168, 128, 0.08)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(197, 168, 128, 0.25)', color: '#c5a880', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' },
  title: { fontSize: '1.6rem', fontWeight: '800', margin: '8px 0 4px', color: '#ffffff', letterSpacing: '0.03em' },
  subtitle: { fontSize: '0.8rem', color: '#a0a0a5' },
  stepper: { display: 'flex', gap: '6px', padding: '15px 20px', justifyContent: 'center' },
  dot: { height: '6px', borderRadius: '3px', transition: 'all 0.3s' },
  main: { padding: '10px 20px', flex: 1, paddingBottom: '120px' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.03em', textTransform: 'uppercase', borderBottom: '1px solid rgba(197, 168, 128, 0.1)', paddingBottom: '8px', marginBottom: '16px' },
  aiBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(197, 168, 128, 0.08)', color: '#c5a880', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(197, 168, 128, 0.25)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  statusBox: { color: '#c5a880', fontWeight: '700', fontSize: '0.75rem', marginBottom: '1rem', background: 'rgba(197, 168, 128, 0.08)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(197, 168, 128, 0.15)', textAlign: 'center' },
  formGroup: { marginBottom: '1rem' },
  label: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#a0a0a5', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  input: { width: '100%', padding: '12px', borderRadius: '4px', border: '1.5px solid rgba(197, 168, 128, 0.25)', fontSize: '1rem', outline: 'none', background: '#18181c', color: '#ffffff', fontWeight: '500', transition: 'all 0.2s' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  card: { padding: '16px 12px', borderRadius: '4px', border: '1.5px solid', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  iconWrap: { width: '38px', height: '38px', borderRadius: '4px', display: 'none', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  timeChip: { padding: '10px', borderRadius: '4px', border: '1.5px solid', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.2s' },
  reviewCard: { background: '#18181c', padding: '15px', borderRadius: '4px', marginBottom: '12px', fontSize: '0.85rem', lineHeight: '1.6', border: '1px solid rgba(197, 168, 128, 0.15)', color: '#ffffff' },
  success: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px' },
  checkWrap: { width: '70px', height: '70px', background: '#c5a880', color: '#09090b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '1.5rem', fontWeight: '800' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '15px 20px 30px', background: '#121214', borderTop: '1px solid rgba(197, 168, 128, 0.15)' },
  backBtn: { padding: '14px 20px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#c5a880', border: '1px solid rgba(197, 168, 128, 0.25)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  nextBtn: { padding: '14px', borderRadius: '4px', background: 'linear-gradient(135deg,#bf953f 0%,#fcf6ba 25%,#b38728 50%,#fbf5b7 75%,#aa771c 100%)', color: '#09090b', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }
};
