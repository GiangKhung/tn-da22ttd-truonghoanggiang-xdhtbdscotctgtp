import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function normalizePhone(p) {
  return String(p ?? '').replace(/\s+/g, '').trim();
}

function normalizePlate(p) {
  return String(p ?? '').replace(/[\s-]/g, '').toUpperCase().trim();
}

// Khách hủy lịch hẹn. Verify phone + licensePlate khớp record trước khi đổi
// status -> CANCELLED. Không cho hủy lịch đã COMPLETED.
export async function PATCH(request, { params }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    const body = await request.json();
    const phone = normalizePhone(body.phone);
    const licensePlate = normalizePlate(body.licensePlate);
    const action = body.action;
    const cancelReason = body.cancelReason?.trim();

    if (action !== 'CANCEL') {
      return NextResponse.json({ error: 'Hành động không hỗ trợ' }, { status: 400 });
    }
    if (!phone || !licensePlate) {
      return NextResponse.json(
        { error: 'Cần số điện thoại và biển số xe để xác minh' },
        { status: 400 }
      );
    }
    if (!cancelReason) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp lý do hủy cụ thể' },
        { status: 400 }
      );
    }

    // 1. Kiểm tra tài khoản khách hàng có bị khóa không
    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (customer && customer.isLocked) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị khóa do tự hủy lịch quá 5 lần. Vui lòng đến trực tiếp gara để được quản trị viên hỗ trợ mở khóa.' },
        { status: 403 }
      );
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      return NextResponse.json({ error: 'Không tìm thấy lịch hẹn' }, { status: 404 });
    }

    const phoneMatch = normalizePhone(appointment.phoneNumber) === phone;
    const plateMatch = normalizePlate(appointment.licensePlate) === licensePlate;
    if (!phoneMatch || !plateMatch) {
      return NextResponse.json(
        { error: 'Thông tin xác minh không khớp' },
        { status: 403 }
      );
    }

    if (appointment.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Lịch đã hoàn thành, không thể hủy' },
        { status: 409 }
      );
    }
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json({ appointment });
    }

    // 2. Cập nhật số lần hủy lịch và khóa nếu > 5 lần
    if (customer) {
      const newCancelCount = customer.cancellationCount + 1;
      const shouldLock = newCancelCount > 5;
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          cancellationCount: newCancelCount,
          isLocked: shouldLock
        }
      });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        cancelReason: cancelReason
      },
    });

    return NextResponse.json({
      appointment: {
        id: updated.id,
        serviceType: updated.serviceType,
        appointmentDate: updated.appointmentDate,
        status: updated.status,
        note: updated.note,
        cancelReason: updated.cancelReason,
      },
    });
  } catch (error) {
    console.error('[public/appointments PATCH]', error);
    return NextResponse.json({ error: 'Lỗi hủy lịch hẹn' }, { status: 500 });
  }
}
