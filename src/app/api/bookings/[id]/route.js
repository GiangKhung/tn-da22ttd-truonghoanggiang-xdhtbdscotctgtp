import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { status, cancelReason } = body;

    const dataToUpdate = { status };
    if (status === 'CANCELLED') {
      const trimmedReason = cancelReason?.trim();
      if (!trimmedReason) {
        return NextResponse.json({ error: 'Bắt buộc phải có lý do hủy lịch hẹn cụ thể' }, { status: 400 });
      }
      dataToUpdate.cancelReason = trimmedReason;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi cập nhật đặt lịch' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ message: 'Đã xóa' });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi xóa đặt lịch' }, { status: 500 });
  }
}
