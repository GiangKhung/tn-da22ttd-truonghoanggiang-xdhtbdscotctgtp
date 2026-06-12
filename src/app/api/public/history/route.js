import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function normalizePhone(p) {
  return String(p ?? '').replace(/\s+/g, '').trim();
}

function normalizePlate(p) {
  return String(p ?? '').replace(/[\s-]/g, '').toUpperCase().trim();
}

// Tra cứu lịch sử bảo dưỡng theo (licensePlate, phone). Yêu cầu khớp cả hai
// để chặn dò biển số một mình lộ thông tin xe người khác.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const licensePlate = normalizePlate(searchParams.get('licensePlate'));
    const phone = normalizePhone(searchParams.get('phone'));

    if (!licensePlate || !phone) {
      return NextResponse.json(
        { error: 'Thiếu biển số xe hoặc số điện thoại' },
        { status: 400 }
      );
    }

    const cars = await prisma.car.findMany({
      where: { licensePlate },
      select: { id: true, licensePlate: true, brand: true, model: true, year: true, ownerPhone: true },
    });

    const car = cars.find((c) => normalizePhone(c.ownerPhone) === phone);
    if (!car) {
      // Không phân biệt "không có xe" vs "sai SDT" để chặn enumeration.
      return NextResponse.json({ car: null, records: [] });
    }

    const records = await prisma.maintenanceRecord.findMany({
      where: { carId: car.id },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        description: true,
        status: true,
        cost: true,
        maintenanceTasks: { select: { taskName: true, isCompleted: true } },
        maintenanceParts: {
          select: {
            quanty: true,
            part: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      car: {
        licensePlate: car.licensePlate,
        brand: car.brand,
        model: car.model,
        year: car.year,
      },
      records,
    });
  } catch (error) {
    console.error('[public/history]', error);
    return NextResponse.json({ error: 'Lỗi tra cứu lịch sử' }, { status: 500 });
  }
}
