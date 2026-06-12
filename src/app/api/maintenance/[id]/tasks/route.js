import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, SECRET);

    const { id: recordIdRaw } = await params;
    const recordId = parseInt(recordIdRaw);
    if (!Number.isInteger(recordId)) {
      return NextResponse.json({ error: 'recordId không hợp lệ' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const taskId = parseInt(body.taskId);
    if (!Number.isInteger(taskId)) {
      return NextResponse.json({ error: 'taskId không hợp lệ' }, { status: 400 });
    }
    const isCompleted = Boolean(body.isCompleted);

    // Đảm bảo task thuộc đúng record trong URL, đồng thời lấy technicianId để kiểm tra quyền.
    const task = await prisma.maintenanceTask.findUnique({
      where: { id: taskId },
      include: { record: { select: { technicianId: true } } },
    });

    if (!task || task.recordId !== recordId) {
      return NextResponse.json({ error: 'Không tìm thấy quy trình' }, { status: 404 });
    }

    if (decoded.role !== 'ADMIN' && task.record.technicianId !== decoded.id) {
      return NextResponse.json({ error: 'Không có quyền cập nhật quy trình của phiếu này' }, { status: 403 });
    }

    const updatedTask = await prisma.maintenanceTask.update({
      where: { id: taskId },
      data: { isCompleted },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi cập nhật quy trình' }, { status: 500 });
  }
}
