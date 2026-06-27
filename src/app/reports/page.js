'use client';
import AppLayout from '../components/AppLayout';
import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Download, Search, Printer, TrendingUp, TrendingDown,
  Users, Calendar, Coins, Activity, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell, PieChart, Pie, LineChart, Line
} from 'recharts';
import { useReactToPrint } from 'react-to-print';
import { ReportPrintContent } from '../components/ReportPrint';
import {
  formatVND, formatDate, statusLabel, serviceTypeLabel,
  pct, getPresetRange
} from '@/lib/format';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const PRESETS = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: 'mtd', label: 'Tháng này' },
  { key: 'qtd', label: 'Quý này' },
  { key: 'ytd', label: 'Năm này' },
];

function EmptyState({ label = 'Không có dữ liệu' }) {
  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--secondary)', fontSize: '0.9rem', padding: '2rem'
    }}>
      {label}
    </div>
  );
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined) {
    return <span className="stat-trend" style={{ color: 'var(--secondary)' }}>— kỳ trước</span>;
  }
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`stat-trend ${up ? 'trend-up' : 'trend-down'}`}>
      <Icon size={14} /> {pct(value)} so kỳ trước
    </span>
  );
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(filename, rows) {
  const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialPreset = getPresetRange('mtd');
  const [filter, setFilter] = useState({
    startDate: initialPreset.startDate,
    endDate: initialPreset.endDate,
    presetKey: 'mtd',
  });
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Tab & AI forecast state
  const [activeTab, setActiveTab] = useState('analytics');
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(true);

  const printRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const fetchReport = async (f = filter) => {
    setLoading(true);
    const params = new URLSearchParams({ startDate: f.startDate, endDate: f.endDate });
    try {
      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      } else {
        toast.error(data.error || 'Lỗi lấy báo cáo');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(filter);
    
    // Fetch AI forecast
    fetch('/api/ai/forecast-seasonal')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setForecastData(data);
      })
      .catch(err => console.error("AI forecast fetch error:", err))
      .finally(() => setForecastLoading(false));
    /* eslint-disable-next-line */
  }, []);

  const applyPreset = (key) => {
    const r = getPresetRange(key);
    const next = { startDate: r.startDate, endDate: r.endDate, presetKey: key };
    setFilter(next);
    fetchReport(next);
  };

  const onCustomChange = (field, value) => {
    setFilter(prev => ({ ...prev, [field]: value, presetKey: 'custom' }));
  };

  const filteredDetails = useMemo(() => {
    if (!reportData?.detailedRecords) return [];
    if (statusFilter === 'ALL') return reportData.detailedRecords;
    return reportData.detailedRecords.filter(r => r.status === statusFilter);
  }, [reportData, statusFilter]);

  const exportCSV = () => {
    if (!reportData?.detailedRecords?.length) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    const header = ['Ngày', 'Biển số', 'Chủ xe', 'Nội dung', 'KTV', 'Trạng thái', 'Tiền công', 'Tổng tiền'];
    const rows = [header];
    for (const r of filteredDetails) {
      rows.push([
        formatDate(r.date),
        r.car?.licensePlate || '',
        r.car?.ownerName || '',
        r.description || '',
        r.technician?.fullname || '',
        statusLabel(r.status),
        r.laborCost || 0,
        r.cost || 0,
      ]);
    }
    downloadCSV(`bao-cao-${filter.startDate}_${filter.endDate}.csv`, rows);
  };

  const compositionData = useMemo(() => {
    if (!reportData?.revenueComposition) return [];
    const c = reportData.revenueComposition;
    const out = [];
    if (c.labor > 0) out.push({ name: 'Tiền công', value: c.labor });
    if (c.parts > 0) out.push({ name: 'Phụ tùng', value: c.parts });
    return out;
  }, [reportData]);

  const statusPieData = useMemo(() => {
    if (!reportData?.statusDistribution) return [];
    return reportData.statusDistribution.map(s => ({
      name: statusLabel(s.status),
      value: s.count,
    }));
  }, [reportData]);

  const lineData = useMemo(() => {
    if (!reportData?.revenueByDay) return [];
    const cur = reportData.revenueByDay;
    const prev = reportData.revenueByDayPrev || [];
    const len = Math.max(cur.length, prev.length);
    const bucket = reportData.period?.bucket === 'month' ? 'T' : 'N';
    const out = [];
    for (let i = 0; i < len; i++) {
      out.push({
        idx: `${bucket}${i + 1}`,
        thisPeriod: cur[i]?.revenue || 0,
        prevPeriod: prev[i]?.revenue || 0,
      });
    }
    return out;
  }, [reportData]);

  const serviceTypeChart = useMemo(() => {
    if (!reportData?.serviceTypeStats) return [];
    return reportData.serviceTypeStats.map(s => ({
      name: serviceTypeLabel(s.type),
      'Tổng': s.count,
      'Hoàn thành': s.completed,
    }));
  }, [reportData]);

  const s = reportData?.summary;

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Báo cáo & Phân tích Quản trị</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ width: 'auto', marginTop: 0 }} onClick={exportCSV} disabled={!reportData}>
            <Download size={18} style={{ marginRight: '8px' }} /> Xuất CSV
          </button>
          <button className="btn-secondary" style={{ width: 'auto', marginTop: 0 }} onClick={handlePrint} disabled={!reportData}>
            <Printer size={18} style={{ marginRight: '8px' }} /> In báo cáo PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{
            background: 'none', border: 'none', 
            borderBottom: activeTab === 'analytics' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'analytics' ? 'var(--primary)' : 'var(--secondary)',
            fontWeight: 600, padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '1rem'
          }}
        >
          📊 Thống kê & Phân tích
        </button>
        <button 
          onClick={() => setActiveTab('ai_forecast')}
          style={{
            background: 'none', border: 'none', 
            borderBottom: activeTab === 'ai_forecast' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'ai_forecast' ? 'var(--primary)' : 'var(--secondary)',
            fontWeight: 600, padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          🔮 Dự báo & Kế hoạch AI
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Filter */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="chip"
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: filter.presetKey === p.key ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: filter.presetKey === p.key ? 'white' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--secondary)', marginBottom: '4px', display: 'block' }}>Từ ngày</label>
            <input type="date" value={filter.startDate} onChange={e => onCustomChange('startDate', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--secondary)', marginBottom: '4px', display: 'block' }}>Đến ngày</label>
            <input type="date" value={filter.endDate} onChange={e => onCustomChange('endDate', e.target.value)} />
          </div>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => fetchReport(filter)}>
            <Search size={18} style={{ marginRight: '8px' }} /> Cập nhật
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '5rem', textAlign: 'center' }}>Đang tổng hợp số liệu...</div>
      ) : !reportData ? (
        <div style={{ padding: '5rem', textAlign: 'center' }}>Không tìm thấy dữ liệu báo cáo.</div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem', marginBottom: '2rem'
          }}>
            <div className="modern-stat-card">
              <div className="stat-info">
                <div className="stat-title">Tổng doanh thu</div>
                <div className="stat-value">{formatVND(s.totalRevenue)}</div>
                <DeltaBadge value={s.deltaRevenuePct} />
              </div>
              <div className="stat-icon" style={{ background: '#e0edff', color: '#3b82f6' }}><Coins size={24} /></div>
            </div>
            <div className="modern-stat-card">
              <div className="stat-info">
                <div className="stat-title">Lượt xe hoàn thành</div>
                <div className="stat-value">{s.totalJobs}</div>
                <DeltaBadge value={s.deltaJobsPct} />
              </div>
              <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}><Users size={24} /></div>
            </div>
            <div className="modern-stat-card">
              <div className="stat-info">
                <div className="stat-title">Doanh thu TB/lượt</div>
                <div className="stat-value">{formatVND(s.avgRevenuePerJob)}</div>
                <span className="stat-trend" style={{ color: 'var(--secondary)' }}>Cho {s.totalJobs} lượt</span>
              </div>
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}><TrendingUp size={24} /></div>
            </div>
            <div className="modern-stat-card">
              <div className="stat-info">
                <div className="stat-title">Đặt lịch trong kỳ</div>
                <div className="stat-value">{s.totalAppointments}</div>
                <span className="stat-trend" style={{ color: 'var(--secondary)' }}>Theo Appointment.date</span>
              </div>
              <div className="stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}><Calendar size={24} /></div>
            </div>
          </div>

          {/* Row 2: Line + Pie composition */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Doanh thu theo {reportData.period?.bucket === 'month' ? 'tháng' : 'ngày'} — kỳ này vs kỳ trước</h3>
              <div style={{ height: '320px' }}>
                {lineData.length ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="idx" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v) => formatVND(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="thisPeriod" name="Kỳ này" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="prevPeriod" name="Kỳ trước" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Cơ cấu doanh thu</h3>
              <div style={{ height: '320px' }}>
                {compositionData.length ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie data={compositionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {compositionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatVND(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </div>
            </div>
          </div>

          {/* Row 3: Bar tháng + KTV */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Doanh thu theo tháng</h3>
              <div style={{ height: '300px' }}>
                {reportData.monthlyRevenue?.length ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={reportData.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v) => formatVND(v)} />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Doanh thu" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Hiệu suất Kỹ thuật viên</h3>
              {reportData.techPerformance?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {reportData.techPerformance.map((t, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{t.name}</span>
                        <span>{formatVND(t.revenue)} <span style={{ color: 'var(--secondary)' }}>({t.completed} xe · {t.sharePct.toFixed(0)}%)</span></span>
                      </div>
                      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px' }}>
                        <div style={{
                          width: `${Math.min(100, t.sharePct)}%`, height: '100%',
                          background: COLORS[i % COLORS.length], borderRadius: '4px'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState />}
            </div>
          </div>

          {/* Row 4: status pie + service type + top parts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>Phân bố trạng thái</h3>
              <div style={{ height: '260px' }}>
                {statusPieData.length ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                        {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>Đặt lịch theo loại</h3>
              <div style={{ height: '260px' }}>
                {serviceTypeChart.length ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={serviceTypeChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Bar dataKey="Tổng" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>Top phụ tùng</h3>
              {reportData.topParts?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
                  {reportData.topParts.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '0.5rem 0.7rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '0.85rem'
                    }}>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      <span><strong>{p.quantity}</strong> · {formatVND(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState />}
            </div>
          </div>

          {/* Row 5: top customers + low stock */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>Top khách hàng theo doanh thu</h3>
              {reportData.topCustomers?.length ? (
                <div className="table-container">
                  <table style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr><th>Biển số</th><th>Chủ xe</th><th>Lượt</th><th>Doanh thu</th></tr>
                    </thead>
                    <tbody>
                      {reportData.topCustomers.map((c, i) => (
                        <tr key={i}>
                          <td><strong>{c.licensePlate}</strong></td>
                          <td>{c.ownerName}</td>
                          <td>{c.visits}</td>
                          <td style={{ fontWeight: 600 }}>{formatVND(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState />}
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="#ef4444" /> Cảnh báo tồn kho thấp
              </h3>
              {reportData.lowStockParts?.length ? (
                <div className="table-container">
                  <table style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr><th>Phụ tùng</th><th>Nhóm</th><th style={{ textAlign: 'right' }}>Tồn kho</th></tr>
                    </thead>
                    <tbody>
                      {reportData.lowStockParts.map((p, i) => (
                        <tr key={i}>
                          <td>{p.name}</td>
                          <td style={{ color: 'var(--secondary)' }}>{p.category || '—'}</td>
                          <td style={{
                            textAlign: 'right', fontWeight: 700,
                            color: p.stockQuantity <= 3 ? '#ef4444' : 'var(--text)'
                          }}>{p.stockQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState label="Không có phụ tùng dưới ngưỡng" />}
            </div>
          </div>

          {/* Detailed history */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} /> Lịch sử dịch vụ ({filteredDetails.length})
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">{statusLabel('PENDING')}</option>
                  <option value="QUOTING">{statusLabel('QUOTING')}</option>
                  <option value="IN_PROGRESS">{statusLabel('IN_PROGRESS')}</option>
                  <option value="COMPLETED">{statusLabel('COMPLETED')}</option>
                  <option value="DELIVERED">{statusLabel('DELIVERED')}</option>
                </select>
                <button className="btn-secondary" style={{ width: 'auto', marginTop: 0, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={exportCSV}>
                  <Download size={14} style={{ marginRight: '6px' }} /> CSV
                </button>
              </div>
            </div>
            <div className="table-container">
              <table style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Ngày</th><th>Biển số</th><th>Chủ xe</th><th>Nội dung</th><th>KTV</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetails.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--secondary)', padding: '2rem' }}>Không có bản ghi</td></tr>
                  ) : filteredDetails.map(r => (
                    <tr key={r.id}>
                      <td>{formatDate(r.date)}</td>
                      <td><strong>{r.car?.licensePlate}</strong></td>
                      <td>{r.car?.ownerName}</td>
                      <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                      <td>{r.technician?.fullname}</td>
                      <td>{statusLabel(r.status)}</td>
                      <td style={{ fontWeight: 700, textAlign: 'right' }}>{formatVND(r.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </>
      ) : (
        <>
          {forecastLoading ? (
            <div style={{ padding: '5rem', textAlign: 'center' }}>Đang chạy mô hình dự báo AI...</div>
          ) : !forecastData ? (
            <div style={{ padding: '5rem', textAlign: 'center' }}>Không thể tải dữ liệu dự báo AI. Vui lòng kiểm tra lại cấu hình API.</div>
          ) : (
            <div>
              {/* AI KPI cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem', marginBottom: '2rem'
              }}>
                <div className="modern-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <div className="stat-info">
                    <div className="stat-title">Dự báo Doanh thu Mùa Tới ({forecastData.nextSeasonName})</div>
                    <div className="stat-value" style={{ fontSize: '1.3rem' }}>
                      {formatVND(forecastData.forecast.predictedRevenueMin)} - {formatVND(forecastData.forecast.predictedRevenueMax)}
                    </div>
                    <span className="stat-trend" style={{ color: 'var(--primary)' }}>Kỳ vọng theo xu hướng thị trường</span>
                  </div>
                  <div className="stat-icon" style={{ background: '#e0edff', color: '#3b82f6' }}><Coins size={24} /></div>
                </div>

                <div className="modern-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div className="stat-info">
                    <div className="stat-title">Dự báo Lượng xe vào xưởng</div>
                    <div className="stat-value" style={{ fontSize: '1.3rem' }}>
                      {forecastData.forecast.predictedVehiclesMin} - {forecastData.forecast.predictedVehiclesMax} lượt xe
                    </div>
                    <span className="stat-trend" style={{ color: '#10b981' }}>Dự tính theo chu kỳ mùa</span>
                  </div>
                  <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}><Users size={24} /></div>
                </div>

                <div className="modern-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div className="stat-info">
                    <div className="stat-title">Đề xuất nhân lực</div>
                    <div className="stat-value" style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#475569', marginTop: '4px', lineHeight: '1.4' }}>
                      {forecastData.forecast.staffingRecommendation}
                    </div>
                  </div>
                  <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}><TrendingUp size={24} /></div>
                </div>
              </div>

              {/* Row 2: Seasonal Chart & Strategic Advice */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>So sánh doanh thu trung bình các mùa vs Dự báo tiếp theo</h3>
                  <div style={{ height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        data={[
                          { name: 'Mùa Xuân', 'Doanh thu': forecastData.historical.Spring.revenue },
                          { name: 'Mùa Hè', 'Doanh thu': forecastData.historical.Summer.revenue },
                          { name: 'Mùa Thu', 'Doanh thu': forecastData.historical.Autumn.revenue },
                          { name: 'Mùa Đông', 'Doanh thu': forecastData.historical.Winter.revenue },
                          { name: `Dự báo (${forecastData.nextSeasonName.split(' ')[0]})`, 'Doanh thu': (forecastData.forecast.predictedRevenueMin + forecastData.forecast.predictedRevenueMax) / 2 }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(v) => formatVND(v)} />
                        <Legend />
                        <Bar dataKey="Doanh thu" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          <Cell fill="#93c5fd" />
                          <Cell fill="#60a5fa" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#2563eb" />
                          <Cell fill="#f59e0b" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--primary)' }}>💡 Tư vấn chiến lược kinh doanh AI</h3>
                  <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#334155', lineHeight: '1.6' }}>
                      &ldquo;{forecastData.forecast.strategicAdvice}&rdquo;
                    </div>
                    <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚡ Phân tích tạo bởi AI Gara Trường Phát</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Spare parts preparation plan */}
              <div className="card">
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📦 Kế hoạch chuẩn bị phụ tùng & linh kiện nhập kho</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  {forecastData.forecast.partsToStock.map((part, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.95rem' }}>{idx + 1}. {part.name}</span>
                        <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Cần tích trữ</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                        {part.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'none' }}>
        <ReportPrintContent ref={printRef} data={reportData} />
      </div>
    </AppLayout>
  );
}
