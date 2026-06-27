'use client';
import AppLayout from '../../components/AppLayout';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { InvoiceContent } from '../../components/InvoicePrint';

export default function MaintenancePage() {
  const [cars, setCars] = useState([]);
  const [partsCatalog, setPartsCatalog] = useState([]);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({ carId: '', technicianId: '', currentMileage: '', description: '', laborCost: '0', evidences: [], status: 'PENDING' });
  const [selectedParts, setSelectedParts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [technicians, setTechnicians] = useState([]);
  
  const [partSelection, setPartSelection] = useState({ partId: '', quantity: 1 });
  const [partSearch, setPartSearch] = useState('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // AI Diagnostic states
  const [aiDiagLoading, setAiDiagLoading] = useState(false);
  const [aiDiagResult, setAiDiagResult] = useState(null);
  const [showDiagModal, setShowDiagModal] = useState(false);

  const handleAiDiagnose = async () => {
    if (!formData.description.trim()) return;
    setAiDiagLoading(true);
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId: formData.carId, symptoms: formData.description })
      });
      const data = await res.json();
      if (res.ok) {
        setAiDiagResult(data);
        setShowDiagModal(true);
      } else {
        toast.error(data.error || 'Lỗi chẩn đoán AI');
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ chẩn đoán');
    } finally {
      setAiDiagLoading(false);
    }
  };

  const handleApplyAiDiagnosis = () => {
    if (!aiDiagResult) return;
    
    // Apply tasks
    if (Array.isArray(aiDiagResult.tasks)) {
      setTasks(prev => {
        const unique = [...prev];
        aiDiagResult.tasks.forEach(t => {
          if (!unique.includes(t)) unique.push(t);
        });
        return unique;
      });
    }

    // Apply labor cost
    if (aiDiagResult.estimatedLaborCost) {
      setFormData(prev => ({ ...prev, laborCost: String(aiDiagResult.estimatedLaborCost) }));
    }

    toast.success('Đã áp dụng quy trình công việc và tiền công ước tính của AI vào báo giá!');
    setShowDiagModal(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPartDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const printRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: printRef });
  
  useEffect(() => {
    fetch('/api/cars?limit=1000').then(res => res.json()).then(data => {
      if (data.data) setCars(data.data);
    });
    fetch('/api/parts').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setPartsCatalog(data);
    });
    fetch('/api/users').then(res => res.json()).then(data => {
        if (Array.isArray(data)) setTechnicians(data.filter(u => u.role === 'TECHNICIAN'));
    });
    fetch('/api/auth/me').then(res => res.json()).then(data => {
        if (!data.error) setCurrentUser(data.user);
    });
  }, []);

  const handleCarChange = (e) => {
    const cId = parseInt(e.target.value);
    const car = cars.find(c => c.id === cId);
    setSelectedCar(car || null);
    setFormData({...formData, carId: e.target.value, currentMileage: car ? car.mileage : ''});
  };

  const handleAddPart = () => {
      if (!partSelection.partId || partSelection.quantity < 1) return;
      const partInfo = partsCatalog.find(p => p.id === parseInt(partSelection.partId));
      if (!partInfo) return;
      
      const existing = selectedParts.find(p => p.partId === partInfo.id);
      if (existing) {
          setSelectedParts(selectedParts.map(p => p.partId === partInfo.id ? {...p, quantity: p.quantity + parseInt(partSelection.quantity)} : p));
      } else {
          setSelectedParts([...selectedParts, {
              partId: partInfo.id,
              name: partInfo.name,
              price: partInfo.price,
              quantity: parseInt(partSelection.quantity)
          }]);
      }
      setPartSelection({ partId: '', quantity: 1 });
      setPartSearch('');
  };
  
  const handleRemovePart = (partId) => {
      setSelectedParts(selectedParts.filter(p => p.partId !== partId));
  };

  const handleAddTask = () => {
      if (!taskInput.trim()) return;
      setTasks([...tasks, taskInput.trim()]);
      setTaskInput('');
  };

  const handleRemoveTask = (index) => {
      setTasks(tasks.filter((_, i) => i !== index));
  };

  const partsTotal = selectedParts.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const finalCost = partsTotal + (parseFloat(formData.laborCost) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep === 1) {
        if (!formData.carId || !formData.currentMileage) {
            toast.error('Vui lòng chọn xe và nhập số KM');
            return;
        }
        setCurrentStep(2);
        return;
    }

    if (!formData.technicianId) {
        toast.error('Vui lòng chọn Kỹ thuật viên phụ trách');
        return;
    }

    const nMileage = parseFloat(formData.currentMileage);
    if (selectedCar && nMileage < parseFloat(selectedCar.mileage)) {
        toast.error(`Số km hiện tại (${nMileage}) không nhỏ hơn mức lưu trữ (${selectedCar.mileage}).`);
        return;
    }

    setLoading(true);
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...formData, status: 'IN_PROGRESS', cost: finalCost, parts: selectedParts, tasks: tasks})
    });
    setLoading(false);

    if (res.ok) {
        toast.success('Đã gửi thông tin bảo dưỡng cho kỹ thuật viên!');
        setFormData({ carId: '', technicianId: '', currentMileage: '', description: '', laborCost: '0', evidences: [], status: 'PENDING' });
        setSelectedParts([]);
        setTasks([]);
        setSelectedCar(null);
        setCurrentStep(1);
    } else {
        const data = await res.json();
        toast.error(data.error || 'Có lỗi xảy ra');
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Quy trình Tiếp nhận & Báo giá</h1>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: currentStep >= 1 ? 'var(--primary)' : 'var(--secondary)', fontWeight: currentStep === 1 ? 'bold' : 'normal' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: currentStep >= 1 ? 'var(--primary)' : 'var(--border)', color: 'white', display: 'grid', placeItems: 'center' }}>1</span>
              <span>Tiếp nhận xe</span>
          </div>
          <div style={{ width: '50px', height: '2px', background: 'var(--border)', alignSelf: 'center' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: currentStep >= 2 ? 'var(--primary)' : 'var(--secondary)', fontWeight: currentStep === 2 ? 'bold' : 'normal' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: currentStep >= 2 ? 'var(--primary)' : 'var(--border)', color: 'white', display: 'grid', placeItems: 'center' }}>2</span>
              <span>Lập báo giá</span>
          </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: currentStep === 1 ? '1fr' : 'minmax(400px, 1fr) 1.2fr', gap: '2rem', alignItems: 'start', maxWidth: currentStep === 1 ? '800px' : 'none', margin: currentStep === 1 ? '0 auto' : '0' }}>
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {currentStep === 1 && (
                <>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Bước 1: Thông tin tiếp nhận</h3>
                    <div>
                    <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>Chọn xe bảo dưỡng (*)</label>
                    <select required value={formData.carId} onChange={handleCarChange}>
                        <option value="">-- Chọn xe --</option>
                        {cars.map(c => (
                        <option key={c.id} value={c.id}>{c.licensePlate} - {c.brand} {c.model}</option>
                        ))}
                    </select>
                    {selectedCar && selectedCar.driverLicenseClass && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#10b981', background: '#ecfdf5', padding: '0.5rem', borderRadius: '4px', border: '1px solid #10b981' }}>
                            ℹ️ <strong>Bằng lái chủ xe:</strong> Hạng <strong>{selectedCar.driverLicenseClass}</strong> (Theo TT 12/2025).
                        </div>
                    )}
                    </div>
                    
                    <div>
                    <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>Số km hiện tại (*)</label>
                    <input type="number" step="0.1" required value={formData.currentMileage} onChange={e => setFormData({...formData, currentMileage: e.target.value})} />
                    </div>

                    <div>
                    <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>Mô tả tình trạng ban đầu (*)</label>
                    <textarea required rows="4" placeholder="Khách báo xe bị kêu ở gầm, cần thay dầu..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleAiDiagnose}
                        className="btn-secondary"
                        disabled={aiDiagLoading || !formData.description.trim()}
                        style={{ marginTop: 0, width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.4rem 0.8rem', background: '#e0edff', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                      >
                        {aiDiagLoading ? 'Đang phân tích...' : '✨ Chẩn đoán lỗi bằng AI'}
                      </button>
                    </div>
                    </div>

                    <div>
                    <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>Ảnh chụp hiện trạng (nếu có)</label>
                    <input type="file" multiple accept="image/*" onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length === 0) return;
                        const fData = new FormData();
                        files.forEach(file => fData.append('files', file));
                        setLoading(true);
                        const res = await fetch('/api/upload', { method: 'POST', body: fData });
                        const data = await res.json();
                        setLoading(false);
                        if (data.urls) setFormData(prev => ({...prev, evidences: [...prev.evidences, ...data.urls]}));
                    }} />
                    </div>
                    
                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                        Tiếp theo: Lập báo giá & Giao việc →
                    </button>
                </>
            )}

            {currentStep === 2 && (
                <>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Bước 2: Giao việc & Báo giá</h3>
                    
                    <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
                        <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--primary)'}}>📍 Chỉ định Kỹ thuật viên (*)</label>
                        <select required value={formData.technicianId} onChange={e => setFormData({...formData, technicianId: e.target.value})}>
                            <option value="">-- Chọn kỹ thuật viên phụ trách --</option>
                            {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.fullname} ({t.username})</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--background)' }}>
                        <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--primary)'}}>1. Các Quy trình Thực hiện (Kỹ thuật viên sẽ làm)</label>

                        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
                            <input type="text" style={{flex: 1}} value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTask())} placeholder="Ví dụ: Thay nhớt định kỳ" />
                            <button type="button" onClick={handleAddTask} className="btn-primary" style={{marginTop: 0, width: 'auto', whiteSpace: 'nowrap', padding: '0 1.5rem'}}>Thêm mục</button>
                        </div>
                        {tasks.length > 0 && (
                            <ul style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', listStyle: 'none' }}>
                                {tasks.map((t, index) => (
                                    <li key={index} style={{ padding: '0.5rem', borderBottom: index < tasks.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text)' }}>✅ {t}</span>
                                        <button type="button" onClick={() => handleRemoveTask(index)} style={{color: 'var(--error)', background: 'none', padding: 0}}>Xóa</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--background)' }}>
                        <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--primary)'}}>2. Vật tư & Phụ tùng thay thế</label>
                        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', position: 'relative'}} ref={dropdownRef}>
                            <div style={{flex: 1, position: 'relative'}}>
                                <input
                                    type="text"
                                    placeholder="🔍 Tìm phụ tùng (ví dụ: nhớt, má phanh...)"
                                    value={partSearch}
                                    onChange={e => {
                                        setPartSearch(e.target.value);
                                        setPartSelection({ ...partSelection, partId: '' });
                                        setShowPartDropdown(true);
                                    }}
                                    onFocus={() => setShowPartDropdown(true)}
                                    style={{
                                        paddingRight: '2rem'
                                    }}
                                />
                                {partSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPartSearch('');
                                            setPartSelection({ ...partSelection, partId: '' });
                                        }}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            fontSize: '1.1rem',
                                            padding: 0,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                                
                                {showPartDropdown && (
                                    <div className="part-dropdown-list">
                                        {partsCatalog.filter(p => 
                                            p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
                                            (p.category && p.category.toLowerCase().includes(partSearch.toLowerCase()))
                                        ).length === 0 ? (
                                            <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                                Không tìm thấy phụ tùng phù hợp
                                            </div>
                                        ) : (
                                            partsCatalog.filter(p => 
                                                p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
                                                (p.category && p.category.toLowerCase().includes(partSearch.toLowerCase()))
                                            ).map(p => (
                                                <div
                                                    key={p.id}
                                                    className="part-dropdown-item"
                                                    onClick={() => {
                                                        setPartSelection({ ...partSelection, partId: p.id.toString() });
                                                        setPartSearch(`${p.name} - ${p.price.toLocaleString()}đ`);
                                                        setShowPartDropdown(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{fontWeight: 500}}>{p.name}</div>
                                                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', alignItems: 'center' }}>
                                                            {p.category && (
                                                                <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: '4px' }}>
                                                                    {p.category}
                                                                </span>
                                                            )}
                                                            <span style={{ fontSize: '0.75rem', color: p.stockQuantity > 0 ? 'var(--success)' : 'var(--error)' }}>
                                                                {p.stockQuantity > 0 ? `Còn: ${p.stockQuantity}` : 'Hết hàng'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{fontWeight: 600, color: 'var(--primary)'}}>{p.price.toLocaleString()}đ</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <input type="number" min="1" value={partSelection.quantity} onChange={e => setPartSelection({...partSelection, quantity: e.target.value})} style={{width: '70px', minWidth: '70px'}} placeholder="SL" />
                            <button type="button" onClick={handleAddPart} className="btn-primary" style={{marginTop: 0, width: 'auto', whiteSpace: 'nowrap', padding: '0 1.5rem'}}>Thêm</button>
                        </div>

                        {aiDiagResult && aiDiagResult.parts && aiDiagResult.parts.length > 0 && (
                            <div style={{ marginTop: '0.8rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius)', border: '1px dashed rgba(59, 130, 246, 0.3)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>💡 Gợi ý phụ tùng từ AI:</span>{' '}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                    {aiDiagResult.parts.map((pName, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setPartSearch(pName);
                                                setShowPartDropdown(true);
                                            }}
                                            style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                                color: '#60a5fa',
                                                cursor: 'pointer'
                                            }}
                                            title="Bấm để tìm nhanh trong kho"
                                        >
                                            🔍 {pName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedParts.length > 0 && (
                            <table style={{fontSize: '0.9rem', marginBottom: '1rem', width: '100%', borderCollapse: 'collapse'}}>
                                <thead>
                                    <tr style={{textAlign: 'left', borderBottom: '1px solid var(--border)'}}>
                                        <th style={{padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem'}}>Vật tư</th>
                                        <th style={{padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem'}}>SL</th>
                                        <th style={{padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem'}}>Thành tiền</th>
                                        <th style={{padding: '0.5rem'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedParts.map(p => (
                                        <tr key={p.partId} style={{borderBottom: '1px solid var(--border)'}}>
                                            <td style={{padding: '0.5rem', color: 'var(--text)'}}>{p.name}</td>
                                            <td style={{padding: '0.5rem', color: 'var(--text)'}}>{p.quantity}</td>
                                            <td style={{padding: '0.5rem', color: 'var(--text)'}}>{(p.price * p.quantity).toLocaleString()}</td>
                                            <td style={{padding: '0.5rem', textAlign: 'right'}}><button type="button" onClick={() => handleRemovePart(p.partId)} style={{color: 'var(--error)', background: 'none', padding: 0}}>Xóa</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <label style={{fontWeight: 600}}>Chi phí công thợ (VNĐ): </label>
                            <input type="number" value={formData.laborCost} onChange={e => setFormData({...formData, laborCost: e.target.value})} style={{width: '150px', textAlign: 'right'}} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn-secondary" onClick={() => setCurrentStep(1)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                            ← Quay lại
                        </button>
                        <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                            {loading ? 'Đang gửi...' : `Hoàn tất & Chuyển cho Kỹ thuật viên (${finalCost.toLocaleString('vi-VN')} VNĐ)`}
                        </button>
                    </div>
                </>
            )}
          </form>
        </div>

        {currentStep === 2 && (
            <div className="card" style={{ position: 'sticky', top: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Bản xem trước Báo giá</h3>
                <button onClick={() => handlePrint()} className="btn-primary" style={{ marginTop: 0, padding: '0.4rem 1rem', width: 'auto' }} type="button">
                In PDF
                </button>
            </div>
            
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflowY: 'auto', maxHeight: '650px', background: '#fff' }}>
                <InvoiceContent ref={printRef} car={{...selectedCar, mileage: formData.currentMileage}} record={{
                    date: new Date().toISOString(),
                    description: formData.description,
                    cost: finalCost,
                    laborCost: parseFloat(formData.laborCost) || 0,
                    status: 'QUOTING',
                    maintenanceParts: selectedParts.map(p => ({
                        quanty: p.quantity,
                        price: p.price,
                        part: { name: p.name }
                    })),
                    technician: technicians.find(t => t.id === parseInt(formData.technicianId)) || currentUser,
                    evidences: formData.evidences.map(url => ({ url }))
                }} />

            </div>
            </div>
        )}
      </div>

      {showDiagModal && aiDiagResult && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', display: 'grid', placeItems: 'center',
          zIndex: 9999, padding: '2rem'
        }}>
          <div className="card" style={{
            maxWidth: '650px', width: '100%', background: 'var(--surface)',
            maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            borderLeft: `5px solid ${aiDiagResult.priority === 'URGENT' ? '#ef4444' : '#f59e0b'}`,
            borderTop: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🩺 Kết quả Chẩn đoán lỗi AI
              </h3>
              <span style={{
                fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px',
                background: aiDiagResult.priority === 'URGENT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: aiDiagResult.priority === 'URGENT' ? '#ef4444' : '#f59e0b'
              }}>
                {aiDiagResult.priority === 'URGENT' ? 'Khẩn cấp' : aiDiagResult.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
              </span>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', flex: 1, overflowY: 'auto' }}>
              {/* Causes */}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🔍 Nguyên nhân có thể xảy ra:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {aiDiagResult.causes?.map((c, idx) => (
                    <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--primary)' }}>{c.name}</span>
                        <span style={{ color: '#ef4444' }}>Tỷ lệ: {c.probability}%</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {c.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks */}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
                  🛠️ Quy trình kỹ thuật đề xuất:
                </div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text)' }}>
                  {aiDiagResult.tasks?.map((t, idx) => <li key={idx} style={{ marginBottom: '2px' }}>{t}</li>)}
                </ul>
              </div>

              {/* Parts */}
              {aiDiagResult.parts && aiDiagResult.parts.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
                    ⚙️ Vật tư/phụ tùng khuyến nghị kiểm tra:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {aiDiagResult.parts.map((p, idx) => (
                      <span key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost */}
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.8rem 1rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#10b981', fontSize: '0.9rem' }}>Ước lượng tiền công đề xuất:</span>
                <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
                  {aiDiagResult.estimatedLaborCost?.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDiagModal(false)}
                className="btn-secondary"
                style={{ width: 'auto', marginTop: 0, padding: '0.5rem 1.5rem', background: '#f1f5f9', color: '#475569' }}
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleApplyAiDiagnosis}
                className="btn-primary"
                style={{ width: 'auto', marginTop: 0, padding: '0.5rem 1.5rem' }}
              >
                Áp dụng báo giá
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
