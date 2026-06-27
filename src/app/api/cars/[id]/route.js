import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;

const isAdmin = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return false;
    try {
        const decoded = jwt.verify(token, SECRET);
        return decoded.role === 'ADMIN';
    } catch {
        return false;
    }
};

export async function GET(request, context) {
  const params = await context.params;
  try {
    const car = await prisma.car.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        maintenanceRecords: {
          include: {
              technician: { select: { fullname: true, username: true } },
              maintenanceParts: {
                  include: { part: true }
              },
              evidences: true,
              maintenanceTasks: true
          },
          orderBy: { date: 'desc' }
        }
      }
    });
    if (!car) return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    return NextResponse.json(car);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch car' }, { status: 500 });
  }
}

export async function PUT(request, context) {
    const params = await context.params;
    try {
        const data = await request.json();
        const car = await prisma.car.update({
            where: { id: parseInt(params.id) },
            data: {
                licensePlate: data.licensePlate,
                brand: data.brand,
                model: data.model,
                year: parseInt(data.year),
                mileage: parseFloat(data.mileage),
                ownerName: data.ownerName,
                ownerPhone: data.ownerPhone || null,
                driverLicenseClass: data.driverLicenseClass || null,
            }
        });
        return NextResponse.json(car);
    } catch(error) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Biển số xe đã tồn tại' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update car' }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const params = await context.params;
    const carId = parseInt(params.id);
    if (!Number.isInteger(carId)) {
        return NextResponse.json({ error: 'id không hợp lệ' }, { status: 400 });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Hoàn lại tồn kho cho tất cả phụ tùng đã dùng ở các phiếu của xe này
            // trước khi cascade xóa MaintenancePart theo schema.
            const partsToRestore = await tx.maintenancePart.findMany({
                where: { record: { carId } },
                select: { partId: true, quanty: true },
            });
            for (const mp of partsToRestore) {
                await tx.part.update({
                    where: { id: mp.partId },
                    data: { stockQuantity: { increment: mp.quanty } },
                });
            }

            // MaintenancePart / Evidence / MaintenanceTask cascade theo onDelete: Cascade.
            await tx.maintenanceRecord.deleteMany({ where: { carId } });
            await tx.car.delete({ where: { id: carId } });
        });

        return NextResponse.json({ success: true });
    } catch(error) {
        console.error(error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Không tìm thấy xe' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete car' }, { status: 500 });
    }
}
