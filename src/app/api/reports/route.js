import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;
const DONE_STATUSES = ['COMPLETED', 'DELIVERED'];
const DAY_MS = 86400000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function bucketKeyDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bucketKeyMonth(d) {
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

function buildDayBuckets(start, end) {
  const out = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    out.push({ date: bucketKeyDay(cursor), revenue: 0, jobs: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function buildMonthBuckets(start, end) {
  const out = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    out.push({ date: bucketKeyMonth(cursor), revenue: 0, jobs: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

function aggregateBuckets(records, start, end, useDay) {
  const buckets = useDay ? buildDayBuckets(start, end) : buildMonthBuckets(start, end);
  const index = new Map(buckets.map((b, i) => [b.date, i]));
  for (const r of records) {
    const key = useDay ? bucketKeyDay(new Date(r.date)) : bucketKeyMonth(new Date(r.date));
    const i = index.get(key);
    if (i !== undefined) {
      buckets[i].revenue += r.cost || 0;
      buckets[i].jobs += 1;
    }
  }
  return buckets;
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Hết phiên đăng nhập' }, { status: 401 });

    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xuất báo cáo' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const start = startOfDay(startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), 0, 1));
    const end = endOfDay(endDateParam ? new Date(endDateParam) : new Date());

    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - days * DAY_MS + 1);

    const dateRange = { gte: start, lte: end };
    const prevDateRange = { gte: prevStart, lte: prevEnd };
    const doneFilter = { in: DONE_STATUSES };

    const [
      records,
      prevRecords,
      techStats,
      partsUsed,
      detailedRecords,
      statusGroup,
      appointments,
      topCustomerRows,
      lowStockParts,
    ] = await Promise.all([
      prisma.maintenanceRecord.findMany({
        where: { date: dateRange, status: doneFilter },
        select: { date: true, cost: true, laborCost: true },
      }),
      prisma.maintenanceRecord.findMany({
        where: { date: prevDateRange, status: doneFilter },
        select: { date: true, cost: true },
      }),
      prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
        select: {
          fullname: true,
          maintenanceRecords: {
            where: { date: dateRange, status: doneFilter },
            select: { cost: true },
          },
        },
      }),
      prisma.maintenancePart.findMany({
        where: { record: { date: dateRange, status: doneFilter } },
        select: { quanty: true, price: true, part: { select: { name: true } } },
      }),
      prisma.maintenanceRecord.findMany({
        where: { date: dateRange },
        orderBy: { date: 'desc' },
        take: 100,
        select: {
          id: true,
          date: true,
          description: true,
          cost: true,
          laborCost: true,
          status: true,
          car: { select: { licensePlate: true, ownerName: true } },
          technician: { select: { fullname: true } },
        },
      }),
      prisma.maintenanceRecord.groupBy({
        by: ['status'],
        where: { date: dateRange },
        _count: { _all: true },
      }),
      prisma.appointment.findMany({
        where: { appointmentDate: dateRange },
        select: { serviceType: true, status: true },
      }),
      prisma.maintenanceRecord.findMany({
        where: { date: dateRange, status: doneFilter },
        select: {
          cost: true,
          carId: true,
          car: { select: { licensePlate: true, ownerName: true } },
        },
      }),
      prisma.part.findMany({
        where: { stockQuantity: { lte: 5 } },
        orderBy: { stockQuantity: 'asc' },
        take: 8,
        select: { name: true, stockQuantity: true, category: true },
      }),
    ]);

    const totalRevenue = records.reduce((s, r) => s + (r.cost || 0), 0);
    const totalLabor = records.reduce((s, r) => s + (r.laborCost || 0), 0);
    const totalParts = partsUsed.reduce((s, p) => s + (p.price || 0) * (p.quanty || 0), 0);
    const totalJobs = records.length;
    const avgRevenuePerJob = totalJobs ? totalRevenue / totalJobs : 0;

    const prevTotalRevenue = prevRecords.reduce((s, r) => s + (r.cost || 0), 0);
    const prevTotalJobs = prevRecords.length;
    const deltaRevenuePct = prevTotalRevenue > 0
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : null;
    const deltaJobsPct = prevTotalJobs > 0
      ? ((totalJobs - prevTotalJobs) / prevTotalJobs) * 100
      : null;

    const useDayBucket = days <= 90;
    const revenueByDay = aggregateBuckets(records, start, end, useDayBucket);
    const revenueByDayPrev = aggregateBuckets(prevRecords, prevStart, prevEnd, useDayBucket);

    const monthlyRevenue = aggregateBuckets(records, start, end, false).map(b => ({
      name: b.date,
      revenue: b.revenue,
      count: b.jobs,
    }));

    const revenueComposition = { labor: totalLabor, parts: totalParts };

    const statusDistribution = statusGroup.map(g => ({
      status: g.status,
      count: g._count._all,
    })).sort((a, b) => b.count - a.count);

    const stMap = {};
    for (const a of appointments) {
      const k = a.serviceType || 'OTHER';
      if (!stMap[k]) stMap[k] = { type: k, count: 0, completed: 0 };
      stMap[k].count += 1;
      if (a.status === 'COMPLETED') stMap[k].completed += 1;
    }
    const serviceTypeStats = Object.values(stMap).sort((a, b) => b.count - a.count);

    const techPerformance = techStats.map(t => {
      const revenue = t.maintenanceRecords.reduce((s, r) => s + (r.cost || 0), 0);
      const completed = t.maintenanceRecords.length;
      return {
        name: t.fullname || '—',
        completed,
        revenue,
        avgPerJob: completed ? revenue / completed : 0,
        sharePct: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const partMap = {};
    for (const p of partsUsed) {
      const name = p.part?.name || '—';
      if (!partMap[name]) partMap[name] = { name, quantity: 0, revenue: 0 };
      partMap[name].quantity += p.quanty || 0;
      partMap[name].revenue += (p.price || 0) * (p.quanty || 0);
    }
    const topParts = Object.values(partMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const custMap = {};
    for (const r of topCustomerRows) {
      const k = r.carId;
      if (!custMap[k]) {
        custMap[k] = {
          licensePlate: r.car?.licensePlate || '—',
          ownerName: r.car?.ownerName || '—',
          visits: 0,
          revenue: 0,
        };
      }
      custMap[k].visits += 1;
      custMap[k].revenue += r.cost || 0;
    }
    const topCustomers = Object.values(custMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      period: { start, end, prevStart, prevEnd, days, bucket: useDayBucket ? 'day' : 'month' },
      summary: {
        totalRevenue,
        totalLabor,
        totalParts,
        totalJobs,
        avgRevenuePerJob,
        totalAppointments: appointments.length,
        prevPeriod: { totalRevenue: prevTotalRevenue, totalJobs: prevTotalJobs },
        deltaRevenuePct,
        deltaJobsPct,
      },
      revenueByDay,
      revenueByDayPrev,
      monthlyRevenue,
      revenueComposition,
      statusDistribution,
      serviceTypeStats,
      techPerformance,
      topParts,
      topCustomers,
      lowStockParts,
      detailedRecords,
    });
  } catch (error) {
    console.error('REPORTS API ERROR:', error);
    return NextResponse.json({ error: 'Lỗi khi lấy dữ liệu báo cáo' }, { status: 500 });
  }
}
