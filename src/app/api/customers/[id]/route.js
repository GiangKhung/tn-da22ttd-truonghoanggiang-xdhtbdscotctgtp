// DELETE /api/customers/[id] — xóa tài khoản khách hàng (ADMIN only)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return false;
  try {
    const d = jwt.verify(token, SECRET);
    return d.role === 'ADMIN';
  } catch { return false; }
}

export async function DELETE(request, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ message: 'Đã xóa tài khoản khách hàng' });
  } catch (err) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    return NextResponse.json({ error: 'Lỗi xóa tài khoản' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    const body = await request.json();
    const { isLocked } = body;

    if (typeof isLocked !== 'boolean') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const updateData = { isLocked };
    if (!isLocked) {
      // Khi mở khóa tài khoản, reset lại số lần hủy về 0 để khách có thể sử dụng bình thường
      updateData.cancellationCount = 0;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ 
      message: isLocked ? 'Đã khóa tài khoản khách hàng' : 'Đã mở khóa tài khoản khách hàng',
      customer: updated 
    });
  } catch (err) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    return NextResponse.json({ error: 'Lỗi cập nhật tài khoản' }, { status: 500 });
  }
}
