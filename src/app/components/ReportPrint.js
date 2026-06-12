import React from 'react';
import {
  formatVND, formatDate, statusLabel, serviceTypeLabel, pct
} from '@/lib/format';

const td = { padding: '6px 8px', border: '1px solid #000' };
const th = { ...td, background: '#f2f2f2', textAlign: 'left', fontWeight: 'bold' };
const sectionStyle = { marginBottom: '24px', pageBreakInside: 'avoid' };
const h3 = { borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px' };

export const ReportPrintContent = React.forwardRef(({ data }, ref) => {
  if (!data) return <div ref={ref}></div>;

  const {
    summary, monthlyRevenue, techPerformance, topParts, period,
    revenueComposition, statusDistribution, serviceTypeStats,
    topCustomers, lowStockParts,
  } = data;

  const compTotal = (revenueComposition?.labor || 0) + (revenueComposition?.parts || 0);
  const compRows = [
    { name: 'Tiền công thợ', value: revenueComposition?.labor || 0 },
    { name: 'Phụ tùng/vật tư', value: revenueComposition?.parts || 0 },
  ];

  return (
    <div ref={ref} style={{ padding: '40px', fontFamily: '"Times New Roman", Times, serif', color: '#000', backgroundColor: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <strong>CÔNG TY TNHH GARA TRƯỜNG PHÁT</strong><br />
          <small>Số 123, Đường ABC, Quận XYZ, TP.HCM</small><br />
          <small>Hotline: 0909.xxx.xxx</small>
          <div style={{ width: '60px', height: '1px', background: '#000', margin: '8px auto' }} />
        </div>
        <div style={{ textAlign: 'center', width: '50%' }}>
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
          <strong>Độc lập - Tự do - Hạnh phúc</strong>
          <div style={{ width: '120px', height: '1px', background: '#000', margin: '8px auto' }} />
          <small style={{ fontStyle: 'italic' }}>
            TP.HCM, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
          </small>
        </div>
      </div>

      <h1 style={{ textAlign: 'center', textTransform: 'uppercase', marginBottom: '8px', fontSize: '20px' }}>
        Báo cáo tổng kết hoạt động kinh doanh
      </h1>
      <p style={{ textAlign: 'center', marginBottom: '24px' }}>
        Giai đoạn: {formatDate(period.start)} – {formatDate(period.end)} ({period.days} ngày)
      </p>

      {/* I. Tổng quan */}
      <div style={sectionStyle}>
        <h3 style={h3}>I. TỔNG QUAN KẾT QUẢ</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ ...td, width: '60%' }}>Tổng số lượt xe hoàn thành:</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 'bold' }}>{summary.totalJobs} lượt</td>
            </tr>
            <tr>
              <td style={td}>Tổng doanh thu dịch vụ:</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 'bold' }}>{formatVND(summary.totalRevenue)}</td>
            </tr>
            <tr>
              <td style={td}>Tiền công thợ:</td>
              <td style={{ ...td, textAlign: 'right' }}>{formatVND(summary.totalLabor)}</td>
            </tr>
            <tr>
              <td style={td}>Doanh thu phụ tùng:</td>
              <td style={{ ...td, textAlign: 'right' }}>{formatVND(summary.totalParts)}</td>
            </tr>
            <tr>
              <td style={td}>Doanh thu trung bình / lượt:</td>
              <td style={{ ...td, textAlign: 'right' }}>{formatVND(summary.avgRevenuePerJob)}</td>
            </tr>
            <tr>
              <td style={td}>So với kỳ trước (doanh thu):</td>
              <td style={{ ...td, textAlign: 'right' }}>{pct(summary.deltaRevenuePct)}</td>
            </tr>
            <tr>
              <td style={td}>So với kỳ trước (số lượt):</td>
              <td style={{ ...td, textAlign: 'right' }}>{pct(summary.deltaJobsPct)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* II. Cơ cấu doanh thu */}
      <div style={sectionStyle}>
        <h3 style={h3}>II. CƠ CẤU DOANH THU</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Khoản mục</th>
              <th style={{ ...th, textAlign: 'right' }}>Giá trị</th>
              <th style={{ ...th, textAlign: 'right' }}>Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {compRows.map((r, i) => (
              <tr key={i}>
                <td style={td}>{r.name}</td>
                <td style={{ ...td, textAlign: 'right' }}>{formatVND(r.value)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{compTotal > 0 ? `${((r.value / compTotal) * 100).toFixed(1)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* III. Phân bố trạng thái */}
      <div style={sectionStyle}>
        <h3 style={h3}>III. PHÂN BỐ TRẠNG THÁI DỊCH VỤ</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Trạng thái</th>
              <th style={{ ...th, textAlign: 'right' }}>Số lượng</th>
            </tr>
          </thead>
          <tbody>
            {statusDistribution?.length ? statusDistribution.map((s, i) => (
              <tr key={i}>
                <td style={td}>{statusLabel(s.status)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{s.count}</td>
              </tr>
            )) : (
              <tr><td style={td} colSpan={2}>Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* IV. Hiệu suất nhân viên */}
      <div style={sectionStyle}>
        <h3 style={h3}>IV. HIỆU SUẤT NHÂN VIÊN</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Họ và tên</th>
              <th style={{ ...th, textAlign: 'center' }}>Xe HT</th>
              <th style={{ ...th, textAlign: 'right' }}>Doanh thu</th>
              <th style={{ ...th, textAlign: 'right' }}>Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {techPerformance?.length ? techPerformance.map((t, i) => (
              <tr key={i}>
                <td style={td}>{t.name}</td>
                <td style={{ ...td, textAlign: 'center' }}>{t.completed}</td>
                <td style={{ ...td, textAlign: 'right' }}>{formatVND(t.revenue)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{t.sharePct.toFixed(1)}%</td>
              </tr>
            )) : (
              <tr><td style={td} colSpan={4}>Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* V. Top phụ tùng */}
      <div style={sectionStyle}>
        <h3 style={h3}>V. PHỤ TÙNG SỬ DỤNG NHIỀU NHẤT</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Tên phụ tùng</th>
              <th style={{ ...th, textAlign: 'center' }}>Số lượng</th>
              <th style={{ ...th, textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {topParts?.length ? topParts.slice(0, 5).map((p, i) => (
              <tr key={i}>
                <td style={td}>{p.name}</td>
                <td style={{ ...td, textAlign: 'center' }}>{p.quantity}</td>
                <td style={{ ...td, textAlign: 'right' }}>{formatVND(p.revenue)}</td>
              </tr>
            )) : (
              <tr><td style={td} colSpan={3}>Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VI. Top khách hàng */}
      <div style={sectionStyle}>
        <h3 style={h3}>VI. TOP KHÁCH HÀNG THEO DOANH THU</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Biển số</th>
              <th style={th}>Chủ xe</th>
              <th style={{ ...th, textAlign: 'center' }}>Lượt</th>
              <th style={{ ...th, textAlign: 'right' }}>Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers?.length ? topCustomers.slice(0, 5).map((c, i) => (
              <tr key={i}>
                <td style={td}>{c.licensePlate}</td>
                <td style={td}>{c.ownerName}</td>
                <td style={{ ...td, textAlign: 'center' }}>{c.visits}</td>
                <td style={{ ...td, textAlign: 'right' }}>{formatVND(c.revenue)}</td>
              </tr>
            )) : (
              <tr><td style={td} colSpan={4}>Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VII. Cảnh báo tồn kho */}
      <div style={sectionStyle}>
        <h3 style={h3}>VII. CẢNH BÁO TỒN KHO THẤP</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Phụ tùng</th>
              <th style={th}>Nhóm</th>
              <th style={{ ...th, textAlign: 'right' }}>Tồn kho</th>
            </tr>
          </thead>
          <tbody>
            {lowStockParts?.length ? lowStockParts.map((p, i) => (
              <tr key={i}>
                <td style={td}>{p.name}</td>
                <td style={td}>{p.category || '—'}</td>
                <td style={{
                  ...td, textAlign: 'right',
                  fontWeight: p.stockQuantity <= 3 ? 'bold' : 'normal'
                }}>{p.stockQuantity}</td>
              </tr>
            )) : (
              <tr><td style={td} colSpan={3}>Không có phụ tùng dưới ngưỡng</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VIII. Đặt lịch theo loại */}
      {serviceTypeStats?.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={h3}>VIII. ĐẶT LỊCH THEO LOẠI DỊCH VỤ</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Loại</th>
                <th style={{ ...th, textAlign: 'center' }}>Tổng lượt</th>
                <th style={{ ...th, textAlign: 'center' }}>Đã hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {serviceTypeStats.map((s, i) => (
                <tr key={i}>
                  <td style={td}>{serviceTypeLabel(s.type)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{s.count}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{s.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: '50px', pageBreakInside: 'avoid' }}>
        <div style={{ textAlign: 'center' }}>
          <strong>NGƯỜI LẬP BIỂU</strong><br />
          <small>(Ký và ghi rõ họ tên)</small>
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>KẾ TOÁN TRƯỞNG</strong><br />
          <small>(Ký và ghi rõ họ tên)</small>
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>GIÁM ĐỐC</strong><br />
          <small>(Ký, đóng dấu)</small>
          <div style={{ marginTop: '70px' }}>
            <strong>Trương Hoàng Giang</strong>
          </div>
        </div>
      </div>
    </div>
  );
});

ReportPrintContent.displayName = 'ReportPrintContent';
