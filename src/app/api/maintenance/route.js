import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;

// ─── GET: Danh sách phiếu bảo dưỡng (có filter theo status, search) ───────────
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Hết phiên đăng nhập' }, { status: 401 });

    const decoded = jwt.verify(token, SECRET);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');    // filter theo trạng thái
    const search = searchParams.get('search');    // tìm theo biển số / tên chủ xe
    const dateStr = searchParams.get('date');
    const page  = parseInt(searchParams.get('page')  || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = {};

    if (dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    // Kỹ thuật viên chỉ thấy phiếu của mình
    if (decoded.role === 'TECHNICIAN') {
      where.technicianId = decoded.id;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.car = {
        OR: [
          { licensePlate: { contains: search } },
          { ownerName:   { contains: search } },
        ],
      };
    }

    const [records, total] = await Promise.all([
      prisma.maintenanceRecord.findMany({
        where,
        include: {
          car:        true,
          technician: { select: { id: true, fullname: true, username: true } },
          maintenanceTasks: { select: { id: true, isCompleted: true } },
        },
        orderBy: { date: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
      }),
      prisma.maintenanceRecord.count({ where }),
    ]);

    return NextResponse.json({ data: records, total, page, limit });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách phiếu' }, { status: 500 });
  }
}

// ─── POST: Tạo phiếu bảo dưỡng mới ────────────────────────────────────────────
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Hết phiên đăng nhập' }, { status: 401 });
    
    const decoded = jwt.verify(token, SECRET);
    const data = await request.json();

    // Chỉ ADMIN mới được tự chọn technicianId; KTV luôn bị ép về chính họ.
    let technicianId = decoded.id;
    if (decoded.role === 'ADMIN' && data.technicianId !== undefined && data.technicianId !== null && data.technicianId !== '') {
      const parsedTechId = parseInt(data.technicianId);
      if (!Number.isInteger(parsedTechId)) {
        return NextResponse.json({ error: 'technicianId không hợp lệ' }, { status: 400 });
      }
      technicianId = parsedTechId;
    }

    const totalPartsCost = (data.parts || []).reduce(
      (sum, p) => sum + (parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0),
      0
    );
    const laborCost = parseFloat(data.laborCost) || 0;
    const finalCost = totalPartsCost + laborCost;

    const record = await prisma.$transaction(async (tx) => {
        const nr = await tx.maintenanceRecord.create({
            data: {
              carId:       parseInt(data.carId),
              technicianId,
              description: data.description || '',
              cost:        finalCost,
              laborCost:   laborCost,
              status:      data.status || 'PENDING',
              date:        data.date ? new Date(data.date) : new Date(),
            }
        });

        if (data.evidences && Array.isArray(data.evidences)) {
            await tx.evidence.createMany({
                data: data.evidences.map(url => ({
                    recordId: nr.id,
                    url,
                    type: url.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE',
                }))
            });
        }

        if (data.parts && data.parts.length > 0) {
            await tx.maintenancePart.createMany({
                data: data.parts.map(p => ({
                    recordId: nr.id,
                    partId:  parseInt(p.partId),
                    price:   parseFloat(p.price),
                    quanty:  parseInt(p.quantity),
                }))
            });

            // Tự động trừ tồn kho — không cho tồn kho xuống dưới 0
            for (const p of data.parts) {
                const part = await tx.part.findUnique({ where: { id: parseInt(p.partId) }, select: { stockQuantity: true, name: true } });
                if (!part || part.stockQuantity < parseInt(p.quantity)) {
                    throw new Error(`Phụ tùng "${part?.name || p.partId}" không đủ tồn kho (còn ${part?.stockQuantity || 0})`);
                }
                await tx.part.update({
                    where: { id: parseInt(p.partId) },
                    data:  { stockQuantity: { decrement: parseInt(p.quantity) } },
                });
            }
        }

        if (data.tasks && data.tasks.length > 0) {
            await tx.maintenanceTask.createMany({
                data: data.tasks.map(t => ({
                    recordId:    nr.id,
                    taskName:    t.taskName || t,
                    isCompleted: false,
                }))
            });
        }

        if (data.currentMileage) {
            await tx.car.update({
              where: { id: parseInt(data.carId) },
              data:  { mileage: parseFloat(data.currentMileage) },
            });
        }

        return nr;
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error(error);
    const msg = error.message?.includes('tồn kho') ? error.message : 'Failed to create record';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
