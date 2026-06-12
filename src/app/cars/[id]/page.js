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

  const printRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    fetch(`/api/cars/${params.id}`)
      .then(res => res.json())
      .then(data => setCar(data));
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
