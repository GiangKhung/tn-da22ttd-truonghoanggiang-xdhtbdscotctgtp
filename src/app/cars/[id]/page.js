'use client';
import AppLayout from '../../components/AppLayout';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { InvoiceContent } from '../../components/InvoicePrint';

export default function CarDetailsPage() {
  const params = useParams();
  const [car, setCar] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // AI states
  const [recData, setRecData] = useState(null);
  const [recLoading, setRecLoading] = useState(true);

  const printRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    fetch(`/api/cars/${params.id}`)
      .then(res => res.json())
      .then(data => setCar(data));

    fetch(`/api/ai/recommend-maintenance?carId=${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setRecData(data);
      })
      .catch(err => console.error("Error fetching AI recs:", err))
      .finally(() => setRecLoading(false));
  }, [params.id]);

  const onPrintClick = (record) => {
    setSelectedRecord(record);
    // Timeout to wait for state to update render of the ref
    setTimeout(() => {
        handlePrint();
    }, 100);
  }

  if (!car) return <AppLayout><div style={{padding: '2rem'}}>Đang tải dữ liệu...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Chi tiết lịch sử sửa chữa</h1>
      </div>
      <div className="card">
        <h3 style={{marginBottom: '1rem', color: 'var(--primary)'}}>Thông tin xe</h3>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
          <div><strong>Biển số:</strong> <span style={{fontSize: '1.2rem'}}>{car.licensePlate}</span></div>
          <div><strong>Hãng/Đời:</strong> {car.brand} {car.model}</div>
          <div><strong>Năm sản xuất:</strong> {car.year}</div>
          <div><strong>Chủ xe:</strong> {car.ownerName} - {car.ownerPhone || 'N/A'}</div>
          <div><strong>Số km hiện tại:</strong> {car.mileage}</div>
          <div>
              <strong>Hạng bằng lái:</strong> {car.driverLicenseClass || 'Không rõ'}
              <div style={{fontSize:'0.85rem', color: 'var(--secondary)'}}>Theo TT 12/2025/TT-BCA</div>
          </div>
        </div>
      </div>
      
      {/* AI Smart recommendation */}
      <div className="card" style={{ marginTop: '2rem', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🤖 Gợi ý bảo dưỡng định kỳ thông minh (AI)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--secondary)' }}>
              Dựa trên chỉ số ODO thực tế ({car.mileage.toLocaleString('vi-VN')} km) và lịch sử bảo dưỡng tại gara
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Đề xuất thông minh
          </span>
        </div>

        {recLoading ? (
          <div style={{ padding: '1rem 0', color: 'var(--secondary)', fontSize: '0.9rem' }}>Đang phân tích dữ liệu xe bằng AI...</div>
        ) : recData ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', marginTop: '1rem' }}>
            {/* AI analysis text column */}
            <div style={{ background: 'var(--background)', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 Nhận xét cố vấn AI:
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.5', fontStyle: 'italic' }}>
                &ldquo;{recData.aiAnalysis}&rdquo;
              </p>
              <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem', borderTop: '1px dashed rgba(16, 185, 129, 0.15)', paddingTop: '0.8rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Quá hạn
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> Cần lưu ý
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> An toàn
                </span>
              </div>
            </div>

            {/* Recommendations progress bar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {recData.recommendations.map((item) => {
                // Calculate percentage
                let pct = 100;
                if (item.lastMileage !== null) {
                  const used = car.mileage - item.lastMileage;
                  pct = Math.max(0, Math.min(100, (1 - (used / item.intervalKm)) * 100));
                } else {
                  pct = 0; // Chưa bao giờ làm
                }

                let badgeBg = 'rgba(16, 185, 129, 0.15)';
                let badgeColor = '#10b981';
                let badgeText = 'An toàn';
                let barBg = '#10b981';

                if (item.status === 'OVERDUE') {
                  badgeBg = 'rgba(239, 68, 68, 0.15)';
                  badgeColor = '#ef4444';
                  badgeText = 'Quá hạn';
                  barBg = '#ef4444';
                } else if (item.status === 'WARNING') {
                  badgeBg = 'rgba(245, 158, 11, 0.15)';
                  badgeColor = '#f59e0b';
                  badgeText = 'Lưu ý';
                  barBg = '#f59e0b';
                }

                return (
                  <div key={item.key} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', padding: '0.8rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{item.name}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: badgeBg, color: badgeColor, fontWeight: 700 }}>
                        {badgeText}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      Định kỳ: {item.intervalKm.toLocaleString('vi-VN')} km / {item.intervalMonths} th
                    </div>

                    {/* Progress bar */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barBg, borderRadius: '3px', transition: 'width 0.5s ease-in-out' }}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {item.lastMileage !== null ? `Đã làm: ${item.lastMileage.toLocaleString('vi-VN')} km` : 'Lần cuối: Chưa rõ'}
                      </span>
                      <span style={{ fontWeight: 600, color: item.status === 'OVERDUE' ? '#ef4444' : item.status === 'WARNING' ? '#f59e0b' : '#10b981' }}>
                        {item.remainingKm <= 0 
                          ? `Trễ ${(Math.abs(item.remainingKm)).toLocaleString('vi-VN')} km` 
                          : `Còn ${item.remainingKm.toLocaleString('vi-VN')} km`
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: '1rem 0', color: 'var(--secondary)', fontSize: '0.9rem' }}>Không có dữ liệu phân tích.</div>
        )}
      </div>

      <div className="card">
        <h3 style={{marginBottom: '1rem', color: 'var(--primary)'}}>Lịch sử sửa chữa, bảo dưỡng</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ngày tháng</th><th>Mô tả hạng mục</th><th>Chi phí (VNĐ)</th><th>Kỹ thuật viên</th><th>Chứng từ/Ghi chú</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {car.maintenanceRecords?.map(m => (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString('vi-VN')}</td>
                  <td style={{whiteSpace: 'pre-wrap'}}>
                      {m.description}
                      {m.maintenanceParts?.length > 0 && (
                          <div style={{fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '4px'}}>
                              + {m.maintenanceParts.length} mục vật tư/phụ tùng
                          </div>
                      )}
                  </td>
                  <td>{m.cost?.toLocaleString('vi-VN') || 0}</td>
                  <td>{m.technician.fullname}</td>
                  <td>
                    {m.evidences?.length > 0 ? (
                        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                            {m.evidences.map(ev => (
                                <a 
                                  key={ev.id} 
                                  href={ev.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{
                                      fontSize: '0.75rem', 
                                      color: 'var(--primary)', 
                                      background: '#f1f5f9', 
                                      padding: '2px 6px', 
                                      borderRadius: '4px',
                                      border: '1px solid var(--border)'
                                  }}
                                >
                                  {ev.type === 'PDF' ? '📎 PDF' : '🖼️ Ảnh'}
                                </a>
                            ))}
                        </div>
                    ) : (
                        '-'
                    )}
                  </td>

                  <td>
                      <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                          <button onClick={() => onPrintClick(m)} style={{padding: '4px 8px', fontSize: '0.85rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>In phiếu</button>
                          {m.status !== 'DELIVERED' && (
                              <button 
                                onClick={async () => {
                                    if(confirm('Chuyển trạng thái hóa đơn thành Đã in/Bàn giao?')) {
                                        try {
                                            const res = await fetch(`/api/maintenance/${m.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: 'DELIVERED' })
                                            });
                                            if (res.ok) {
                                                window.location.reload();
                                            }
                                        } catch (error) {
                                            console.error(error);
                                        }
                                    }
                                }} 
                                style={{padding: '4px 8px', fontSize: '0.85rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                                title="Đánh dấu đã in & bàn giao"
                              >
                                Đã in
                              </button>
                          )}
                          {m.status === 'DELIVERED' && (
                              <span style={{fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold'}}>✓ Hoàn tất</span>
                          )}
                      </div>
                  </td>
                </tr>
              ))}
              {!car.maintenanceRecords?.length && <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>Chưa có lịch sử bảo dưỡng nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden printable component */}
      <div style={{ display: 'none' }}>
         <InvoiceContent ref={printRef} car={car} record={selectedRecord} />
      </div>

    </AppLayout>
  );
}
