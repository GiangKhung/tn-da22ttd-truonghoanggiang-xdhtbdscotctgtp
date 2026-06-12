import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    
    let whereClause = {};
    if (dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause.appointmentDate = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: {
        appointmentDate: dateStr ? 'asc' : 'desc'
      }
    });
    
    return NextResponse.json({ appointments });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi lấy dữ liệu đặt lịch' }, { status: 500 });
  }
}
