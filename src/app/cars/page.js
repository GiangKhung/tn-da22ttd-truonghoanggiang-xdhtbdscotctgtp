'use client';
import AppLayout from '../components/AppLayout';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CarsPage() {
  const [cars, setCars] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ brand: '', model: '', year: '', minMileage: '', maxMileage: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState({ licensePlate: '', brand: '', model: '', year: '', mileage: '', ownerName: '', ownerPhone: '', driverLicenseClass: '', vin: '', engineNumber: '', color: '' });

  const fetchCars = async () => {
    const params = new URLSearchParams({
        q: search,
        page: page,
        limit: 10,
        ...filter
    });
    const res = await fetch(`/api/cars?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCars(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchCars();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, filter]);

  useEffect(() => {
    fetchCars();
  }, [page]);

  const handleScanAI = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      setIsScanning(true);
      const base64 = reader.result;

      try {
        const res = await fetch('/api/ai/scan-car', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 })
        });

        if (res.ok) {
          const data = await res.json();
          // Update form with AI results, keeping existing fields if not detected
            setFormData(prev => ({
              ...prev,
              licensePlate: data.licensePlate || prev.licensePlate,
              brand: data.brand || prev.brand,
              model: data.model || prev.model,
              year: data.year || prev.year,
              ownerName: data.ownerName || prev.ownerName,
              ownerPhone: data.ownerPhone || prev.ownerPhone,
              driverLicenseClass: data.driverLicenseClass || prev.driverLicenseClass,
              vin: data.vin || prev.vin,
              engineNumber: data.engineNumber || prev.engineNumber,
              color: data.color || prev.color
            }));
          toast.success('Đã quét thông tin từ ảnh!');
        } else {
          const err = await res.json();
          toast.error(err.error || 'Lỗi khi quét ảnh');
        }
      } catch (error) {
        toast.error('Không thể kết nối với dịch vụ AI');
      } finally {
        setIsScanning(false);
      }
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      toast.success('Thêm xe thành công!');
      setShowAddForm(false);
      setFormData({ licensePlate: '', brand: '', model: '', year: '', mileage: '', ownerName: '', ownerPhone: '', driverLicenseClass: '', vin: '', engineNumber: '', color: '' });
      fetchCars();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Lỗi thêm xe');
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Quản lý Xe</h1>
        <button className="btn-primary" style={{ width: 'auto', marginTop: 0 }} onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Hủy' : '+ Thêm xe mới'}
        </button>
      </div>

      {showAddForm && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', margin: 0 }}>Thêm xe mới</h3>
            <div>
              <input 
                type="file" 
                id="ai-scan-input" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleScanAI} 
                disabled={isScanning}
              />
              <label 
                htmlFor="ai-scan-input" 
                className="btn-primary" 
                style={{ 
                  background: 'transparent', 
                  border: '1px solid var(--primary-glow)',
                  color: 'var(--primary-glow)',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  opacity: isScanning ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  boxShadow: 'none',
                  transition: 'all 0.2s'
                }}
              >
                {isScanning ? 'Đang quét...' : 'Quét Cà Vẹt bằng AI'}
              </label>
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input placeholder="Biển số (*)" required value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value})} />
            <input placeholder="Hãng (VD: Toyota) (*)" required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
            <input placeholder="Đời xe (VD: Vios) (*)" required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
            <input type="number" placeholder="Năm sản xuất (*)" required value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
            <input type="number" step="0.1" placeholder="Số km đã đi (*)" required value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} />
            <input placeholder="Tên chủ xe (*)" required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
            <input placeholder="SĐT chủ xe" value={formData.ownerPhone} onChange={e => setFormData({...formData, ownerPhone: e.target.value})} />
            <input placeholder="Hạng Bằng Lái Chủ Xe (VD: B2)" value={formData.driverLicenseClass} onChange={e => setFormData({...formData, driverLicenseClass: e.target.value})} title="Thông tư 12/2025/TT-BCA" />
            
            <input placeholder="Số khung (VIN)" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} />
            <input placeholder="Số máy" value={formData.engineNumber} onChange={e => setFormData({...formData, engineNumber: e.target.value})} />
            <input placeholder="Màu sơn" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />

            <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2' }}>Lưu thông tin</button>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Tìm biển số, chủ xe..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Hãng xe" 
              value={filter.brand}
              onChange={e => setFilter({...filter, brand: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Đời xe" 
              value={filter.model}
              onChange={e => setFilter({...filter, model: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Năm SX" 
              value={filter.year}
              onChange={e => setFilter({...filter, year: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="KM tối thiểu" 
              value={filter.minMileage}
              onChange={e => setFilter({...filter, minMileage: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="KM tối đa" 
              value={filter.maxMileage}
              onChange={e => setFilter({...filter, maxMileage: e.target.value})}
            />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Biển số</th><th>Hãng / Đời</th><th>Năm SX</th><th>Số km</th><th>Chủ xe</th><th>Số lượt sửa</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {cars.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.licensePlate}</strong></td>
                  <td>{c.brand} {c.model}</td>
                  <td>{c.year}</td>
                  <td>{c.mileage}</td>
                  <td>
                    {c.ownerName}
                    <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>{c.driverLicenseClass ? `Bằng: ${c.driverLicenseClass}` : ''}</div>
                  </td>
                  <td>{c._count?.maintenanceRecords || 0}</td>
                  <td>
                    <Link href={`/cars/${c.id}`} style={{ fontWeight: '500' }}>Xem chi tiết</Link>
                  </td>
                </tr>
              ))}
              {cars.length === 0 && <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>Không tìm thấy xe nào.</td></tr>}
            </tbody>
          </table>
        </div>
        
        {/* Pagination UI */}
        {totalPages > 1 && (
            <div style={{display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem'}}>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  style={{padding: '0.5rem 1rem', border: '1px solid var(--border)', background: page === 1 ? '#eee' : 'white'}}
                >
                  Trước
                </button>
                <span style={{padding: '0.5rem 1rem'}}>Trang {page} / {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  style={{padding: '0.5rem 1rem', border: '1px solid var(--border)', background: page === totalPages ? '#eee' : 'white'}}
                >
                  Sau
                </button>
            </div>
        )}
      </div>
    </AppLayout>
  );
}
