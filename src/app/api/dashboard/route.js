import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const totalCars = await prisma.car.count();
    const totalMaintenance = await prisma.maintenanceRecord.count();
    
    // Thống kê theo trạng thái mới
    const pendingMaintenance = await prisma.maintenanceRecord.count({ where: { status: 'PENDING' } });
    const inProgressMaintenance = await prisma.maintenanceRecord.count({ where: { status: 'IN_PROGRESS' } });
    
    // Cảnh báo phụ tùng sắp hết (tồn kho < 5)
    const lowStockCount = await prisma.part.count({
      where: { stockQuantity: { lt: 5 } }
    });
    
    const sumResult = await prisma.maintenanceRecord.aggregate({
      _sum: {
        cost: true
      }
    });
    const totalRevenue = sumResult._sum.cost || 0;

    // Doanh thu tháng này vs tháng trước (tính % tăng trưởng thực)
    const now = new Date();
    const firstDayThisMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayNextMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [revenueThisMonth, revenueLastMonth] = await Promise.all([
      prisma.maintenanceRecord.aggregate({
        _sum: { cost: true },
        where: { date: { gte: firstDayThisMonth, lt: firstDayNextMonth } }
      }),
      prisma.maintenanceRecord.aggregate({
        _sum: { cost: true },
        where: { date: { gte: firstDayLastMonth, lt: firstDayThisMonth } }
      }),
    ]);

    const thisMonthRev = revenueThisMonth._sum.cost || 0;
    const lastMonthRev = revenueLastMonth._sum.cost || 0;
    const revenueGrowth = lastMonthRev > 0
      ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1)
      : null;

    // Số xe mới nhập trong tháng này (thay mock 156)
    const newCarsThisMonth = await prisma.maintenanceRecord.count({
      where: { date: { gte: firstDayThisMonth } }
    });
    const newCarsLastMonth = await prisma.maintenanceRecord.count({
      where: { date: { gte: firstDayLastMonth, lt: firstDayThisMonth } }
    });
    const carsGrowth = newCarsLastMonth > 0
      ? (((newCarsThisMonth - newCarsLastMonth) / newCarsLastMonth) * 100).toFixed(1)
      : null;
    const records = await prisma.maintenanceRecord.findMany({
      select: {
        date: true,
        cost: true
      }
    });

    // Gom dữ liệu vào 6 tháng T...
    const currentMonth = new Date().getMonth();
    const months = [];
    for(let i=5; i>=0; i--) {
       let mId = (currentMonth - i + 12) % 12 + 1;
       months.push({ name: `T${mId}`, revenue: 0, services: 0, target: 0, monthOffset: i });
    }

    records.forEach(r => {
        let rDate = new Date(r.date);
        let diffMonths = (new Date().getFullYear() - rDate.getFullYear()) * 12 + (new Date().getMonth() - rDate.getMonth());
        if(diffMonths >= 0 && diffMonths <= 5) {
            let targetIdx = 5 - diffMonths;
            months[targetIdx].revenue += (r.cost || 0);
            months[targetIdx].services += 1;
        }
    });

    // Tính toán mảng biểu đồ
    const monthlyStats = months.map(m => ({
        name: m.name,
        "Doanh thu": m.revenue,
        "Dịch vụ": m.services,
        // target ảo để làm chart bar kép (Bảo dưỡng vs Sửa chữa)
        "Bảo dưỡng": Math.ceil(m.services * 0.7),
        "Sửa chữa": Math.ceil(m.services * 0.3)
    }));

    // Khách hàng mới = lượt xe vào xưởng tháng này
    const newCustomers = newCarsThisMonth;

    const activeRecords = await prisma.maintenanceRecord.findMany({
        where: {
            status: {
                in: ['PENDING', 'IN_PROGRESS', 'QUOTING', 'COMPLETED']
            }
        },
        include: {
            car: true,
            maintenanceTasks: true,
            technician: {
                select: { id: true, fullname: true, username: true }
            }
        },
        orderBy: {
            date: 'desc'
        },
        take: 20
    });

    const recentAppointments = await prisma.appointment.findMany({
        orderBy: {
            appointmentDate: 'asc'
        },
        where: {
            status: 'PENDING',
            appointmentDate: {
                gte: new Date()
            }
        },
        take: 5
    });

    return NextResponse.json({
      totalCars,
      totalMaintenance,
      pendingMaintenance,
      inProgressMaintenance,
      totalRevenue,
      thisMonthRev,
      lastMonthRev,
      revenueGrowth,
      newCustomers,
      carsGrowth,
      monthlyStats,
      activeRecords,
      lowStockCount,
      recentAppointments,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Lỗi lấy dữ liệu thống kê' }, { status: 500 });
  }
}
