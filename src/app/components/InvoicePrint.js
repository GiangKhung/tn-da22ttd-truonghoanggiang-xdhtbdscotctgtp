import React from 'react';

export const InvoiceContent = React.forwardRef(({ car, record }, ref) => {
  if (!car || !record) return <div ref={ref}></div>;

  const parts = record.maintenanceParts || [];

  return (
    <div ref={ref} className="invoice-container" style={{ padding: '40px', fontFamily: 'sans-serif', color: '#000', backgroundColor: '#fff' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .invoice-container {
          color: #000 !important;
          background-color: #fff !important;
        }
        .invoice-container h1, 
        .invoice-container h2, 
        .invoice-container h3, 
        .invoice-container h4, 
        .invoice-container h5, 
        .invoice-container h6,
        .invoice-container p,
        .invoice-container div,
        .invoice-container span,
        .invoice-container strong,
        .invoice-container li,
        .invoice-container td,
        .invoice-container th {
          color: #000 !important;
        }
        .invoice-container table {
          border-collapse: collapse !important;
          border: 1px solid #000 !important;
          width: 100% !important;
        }
        .invoice-container th, 
        .invoice-container td {
          color: #000 !important;
          border: 1px solid #000 !important;
          padding: 8px !important;
          background-color: transparent !important;
        }
        .invoice-container th {
          background-color: #f1f5f9 !important;
          font-weight: bold !important;
        }
      `}} />
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>GARA Ô TÔ TRƯỜNG PHÁT</h1>
        <p style={{ margin: '5px 0' }}>Trái tim của những chuyến đi an toàn</p>
        <p style={{ margin: '0', fontStyle: 'italic' }}>Website: www.garatruongphat.com - Hotline: 0909.xxx.xxx</p>
      </div>

      <h2 style={{ textAlign: 'center', textTransform: 'uppercase', marginBottom: '20px' }}>Phiếu Nghiệm Thu Bảo Dưỡng</h2>
      
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>THÔNG TIN KHÁCH HÀNG & XE</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><strong>Tên khách hàng:</strong> {car.ownerName}</div>
          <div><strong>Điện thoại:</strong> {car.ownerPhone || '...'}</div>
          <div><strong>Biển số xe:</strong> {car.licensePlate}</div>
          <div><strong>Hãng/Đời:</strong> {car.brand} {car.model}</div>
          <div><strong>Số Km hiện tại:</strong> {car.mileage}</div>
          <div><strong>Ngày vào xưởng:</strong> {new Date(record.date).toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>CHI TIẾT PHỤ TÙNG & NHÂN CÔNG</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '50px' }}>STT</th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Hạng mục / Phụ tùng</th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>SL</th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Đơn giá</th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', padding: '8px' }}>{p.part?.name}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{p.quanty}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>{p.price?.toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>{(p.price * p.quanty).toLocaleString()}</td>
              </tr>
            ))}
            
            {/* Labor cost row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{parts.length + 1}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>Chi phí nhân công / Gia công</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>{record.laborCost?.toLocaleString() || 0}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>TỔNG CỘNG:</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{record.cost ? record.cost.toLocaleString('vi-VN') : '0'}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style={{marginTop: '10px', fontStyle: 'italic'}}>
            <strong>Ghi chú thêm: </strong> {record.description}
        </div>

        {record.evidences && record.evidences.length > 0 && (
            <div style={{marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '10px'}}>
                <strong>Minh chứng/Tài liệu đính kèm:</strong>
                <ul style={{fontSize: '12px', marginTop: '5px', paddingLeft: '20px'}}>
                    {record.evidences.map((ev, i) => (
                        <li key={i}>{ev.url} ({ev.type})</li>
                    ))}
                </ul>
            </div>
        )}
      </div>


      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <strong>Khách hàng</strong>
          <p style={{ marginTop: '5px', fontStyle: 'italic', fontSize: '13px' }}>(Ký và ghi rõ họ tên)</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>Kỹ thuật viên</strong>
          <p style={{ marginTop: '5px' }}>{record.technician?.fullname}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>Đại diện Gara</strong>
          <p style={{ marginTop: '5px', fontStyle: 'italic', fontSize: '13px' }}>(Ký, đóng dấu)</p>
        </div>
      </div>
    </div>
  );
});

InvoiceContent.displayName = 'InvoiceContent';
