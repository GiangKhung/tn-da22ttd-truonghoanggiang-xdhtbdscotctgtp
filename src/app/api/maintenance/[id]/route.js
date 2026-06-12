import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Hết phiên đăng nhập' }, { status: 401 });
    
    // Auth check
    const decoded = jwt.verify(token, SECRET);
    
    const { id } = await params;
    const data = await request.json();

    const recordId = parseInt(id);

    // Validate if record exists
    const existingRecord = await prisma.maintenanceRecord.findUnique({
      where: { id: recordId }
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'Không tìm thấy chứng từ' }, { status: 404 });
    }

    // KTV chỉ được sửa phiếu của chính mình; ADMIN không bị giới hạn.
    if (decoded.role !== 'ADMIN' && existingRecord.technicianId !== decoded.id) {
      return NextResponse.json({ error: 'Không có quyền truy cập phiếu này' }, { status: 403 });
    }

    const updateData = {};
    if (data.status) updateData.status = data.status;
    if (data.description !== undefined) updateData.description = data.description;
    
    let partsToUpdate = null;
    if (data.parts) { 
        partsToUpdate = data.parts;
    }

    // Determine costs
    let newLaborCost = data.laborCost !== undefined ? parseFloat(data.laborCost) : existingRecord.laborCost;
    if (isNaN(newLaborCost)) newLaborCost = 0;
    
    updateData.laborCost = newLaborCost;

    const updatedRecord = await prisma.$transaction(async (tx) => {
        // Handle Evidence
        if (data.evidences && Array.isArray(data.evidences)) {
            await tx.evidence.deleteMany({ where: { recordId: recordId } });
            if (data.evidences.length > 0) {
                await tx.evidence.createMany({
                    data: data.evidences.map(url => ({
                        recordId: recordId,
                        url: url,
                        type: url.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE'
                    }))
                });
            }
        }

        // If parts are provided, recalculate cost, delete old parts, and insert new parts
        if (partsToUpdate) {
            // 1. Trả về kho phần đã dùng của các maintenancePart sắp bị xóa.
            const existingParts = await tx.maintenancePart.findMany({
                where: { recordId: recordId },
                select: { partId: true, quanty: true },
            });
            for (const ep of existingParts) {
                await tx.part.update({
                    where: { id: ep.partId },
                    data: { stockQuantity: { increment: ep.quanty } },
                });
            }

            // 2. Xóa maintenancePart cũ.
            await tx.maintenancePart.deleteMany({
                where: { recordId: recordId }
            });

            // 3. Kiểm tra tồn kho + trừ kho cho phụ tùng mới (không cho âm).
            for (const p of partsToUpdate) {
                const partId = parseInt(p.partId);
                const quantity = parseInt(p.quantity);
                if (!Number.isInteger(partId) || !Number.isInteger(quantity) || quantity < 0) {
                    throw new Error('Phụ tùng không hợp lệ');
                }
                const part = await tx.part.findUnique({
                    where: { id: partId },
                    select: { stockQuantity: true, name: true },
                });
                if (!part) {
                    throw new Error(`Không tìm thấy phụ tùng id=${partId}`);
                }
                if (part.stockQuantity < quantity) {
                    throw new Error(`Phụ tùng "${part.name}" không đủ tồn kho (còn ${part.stockQuantity})`);
                }
                await tx.part.update({
                    where: { id: partId },
                    data: { stockQuantity: { decrement: quantity } },
                });
            }

            if (partsToUpdate.length > 0) {
                await tx.maintenancePart.createMany({
                    data: partsToUpdate.map(p => ({
                        recordId: recordId,
                        partId: parseInt(p.partId),
                        price: parseFloat(p.price),
                        quanty: parseInt(p.quantity)
                    }))
                });
            }

            const totalPartsCost = partsToUpdate.reduce(
                (sum, p) => sum + (parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0),
                0
            );
            updateData.cost = totalPartsCost + newLaborCost;
        } else if (data.laborCost !== undefined) {
             const existingParts = await tx.maintenancePart.findMany({
                 where: { recordId: recordId }
             });
             const totalPartsCost = existingParts.reduce((sum, p) => sum + (p.price * p.quanty), 0);
             updateData.cost = totalPartsCost + newLaborCost;
        }

        const res = await tx.maintenanceRecord.update({
            where: { id: recordId },
            data: updateData,
            include: { 
                maintenanceParts: { include: { part: true } },
                evidences: true 
            }
        });

        if (data.currentMileage && data.carId) {
            await tx.car.update({
              where: { id: parseInt(data.carId) },
              data: { mileage: parseFloat(data.currentMileage) } 
            });
        }

        return res;
    });

    // Tạo và gửi thông báo nếu trạng thái chuyển sang COMPLETED hoặc DELIVERED
    const isFinished = data.status === 'COMPLETED' || data.status === 'DELIVERED';
    const wasActive = existingRecord.status !== 'COMPLETED' && existingRecord.status !== 'DELIVERED' && existingRecord.status !== 'CANCELLED';

    if (isFinished && wasActive) {
      try {
        const car = await prisma.car.findUnique({
          where: { id: existingRecord.carId }
        });
        if (car && car.ownerPhone) {
          const normalizedOwnerPhone = car.ownerPhone.trim().replace(/\s+/g, '');
          const customer = await prisma.customer.findUnique({
            where: { phone: normalizedOwnerPhone }
          });
          if (customer) {
            const isDelivered = data.status === 'DELIVERED';
            const title = isDelivered ? `Bàn giao xe thành công 👋` : `Bảo dưỡng hoàn tất 🚀`;
            const content = isDelivered
              ? `Xe của bạn (Biển số: ${car.licensePlate}) đã được bàn giao thành công. Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ tại Gara Trường Phát!`
              : `Xe của bạn (Biển số: ${car.licensePlate}) đã hoàn tất bảo dưỡng. Tổng chi phí: ${(updatedRecord.cost || 0).toLocaleString('vi-VN')}đ. Kính mời quý khách đến nhận xe!`;
            
            await prisma.notification.create({
              data: {
                title,
                content,
                customerId: customer.id
              }
            });

            // Gửi push notification qua Expo Push API
            if (customer.pushToken) {
              console.log(`Gửi Expo push notification đến token: ${customer.pushToken}`);
              fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: customer.pushToken,
                  sound: 'default',
                  title: title,
                  body: content,
                  data: { recordId: recordId }
                })
              }).catch(err => console.error('Lỗi khi gửi Expo Push API:', err.message));
            }
          }
        }
      } catch (notifError) {
        console.error('Lỗi tạo/gửi thông báo:', notifError);
      }
    }

    return NextResponse.json(updatedRecord, { status: 200 });

  } catch (error) {
    console.error(error);
    if (error.message?.includes('tồn kho') || error.message?.includes('Phụ tùng') || error.message?.includes('Không tìm thấy phụ tùng')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi cập nhật chứng từ' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Hết phiên đăng nhập' }, { status: 401 });
        const decoded = jwt.verify(token, SECRET);

        const { id } = await params;
        const record = await prisma.maintenanceRecord.findUnique({
            where: { id: parseInt(id) },
            include: {
                car: true,
                technician: { select: { id: true, fullname: true, username: true } },
                maintenanceParts: { include: { part: true } },
                maintenanceTasks: true,
                evidences: true
            }
        });


        if (!record) return NextResponse.json({ error: 'Không tìm thấy chứng từ' }, { status: 404 });

        // KTV chỉ được xem phiếu của chính mình; ADMIN không bị giới hạn.
        if (decoded.role !== 'ADMIN' && record.technicianId !== decoded.id) {
            return NextResponse.json({ error: 'Không có quyền truy cập phiếu này' }, { status: 403 });
        }

        return NextResponse.json(record);
    } catch (error) {
        return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
    }
}
